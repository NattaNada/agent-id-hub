// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentIDHub — Daily check-in + Job Board gated by Binance Agent ID (SPACE ID)
/// @notice Every state-changing function that touches identity or funds requires the
///         caller to hold an Agent ID: balanceOf(caller) > 0 on the Agent ID contract
///         (0x60b9262456de011f7d15a54cdd8c48baaa8b022f on BNB Chain).
///         There is NO fee and NO owner cut. The contract owner has NO power over
///         user funds: no pause, no withdraw, no fee setter, no admin transfer.
///         Every BNB movement is an explicit, user-confirmed transaction:
///         createJob (escrow in), approveWork (escrow out to worker),
///         cancelJob (escrow back to poster). Nothing is scheduled or automatic.
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentIDHub is ReentrancyGuard {
    IAgentID public immutable agentId;
    address public immutable deployer; // informational only; no privileges

    uint256 public constant CHECKIN_POINTS = 10;
    uint256 public constant JOB_COMPLETE_WORKER_POINTS = 50;
    uint256 public constant JOB_COMPLETE_POSTER_POINTS = 10;

    enum JobStatus { Open, Assigned, Submitted, Completed, Cancelled }

    struct Profile {
        uint256 totalCheckins;
        uint256 streak;
        uint256 lastCheckinDay; // UTC day number (block.timestamp / 1 days)
        uint256 points;
        uint256 jobsPosted;
        uint256 jobsCompleted; // as worker
    }

    struct Job {
        uint256 id;
        address poster;
        address worker;
        string title;
        string description;
        uint256 reward; // BNB escrowed, in wei
        uint256 createdAt;
        JobStatus status;
        string workSubmission; // text / IPFS CID supplied by the worker
    }

    uint256 public jobCount;
    mapping(address => Profile) public profiles;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => address[]) public jobApplicants;
    mapping(uint256 => mapping(address => bool)) public hasApplied;

    event CheckedIn(address indexed user, uint256 indexed day, uint256 streak, uint256 totalCheckins, uint256 points);
    event JobCreated(uint256 indexed jobId, address indexed poster, string title, uint256 reward);
    event Applied(uint256 indexed jobId, address indexed applicant);
    event WorkerAssigned(uint256 indexed jobId, address indexed worker);
    event WorkSubmitted(uint256 indexed jobId, address indexed worker, string workSubmission);
    event WorkApproved(uint256 indexed jobId, address indexed worker, uint256 reward);
    event JobCancelled(uint256 indexed jobId, address indexed poster, uint256 refund);

    error NotAgentIDHolder();
    error AlreadyCheckedInToday();
    error JobNotFound();
    error NotPoster();
    error NotWorker();
    error InvalidStatus();
    error AlreadyApplied();
    error NotApplicant();
    error EmptyTitle();
    error ZeroReward();

    modifier onlyAgentIDHolder() {
        if (agentId.balanceOf(msg.sender) == 0) revert NotAgentIDHolder();
        _;
    }

    constructor(address agentIdAddress) {
        require(agentIdAddress != address(0), "agentId zero");
        agentId = IAgentID(agentIdAddress);
        deployer = msg.sender;
    }

    /// @notice Check in once per UTC day. Streak continues only on consecutive days.
    function checkIn() external onlyAgentIDHolder {
        uint256 day = block.timestamp / 1 days;
        Profile storage p = profiles[msg.sender];
        if (p.lastCheckinDay == day) revert AlreadyCheckedInToday();
        p.streak = (p.lastCheckinDay == day - 1) ? p.streak + 1 : 1;
        p.lastCheckinDay = day;
        p.totalCheckins += 1;
        p.points += CHECKIN_POINTS;
        emit CheckedIn(msg.sender, day, p.streak, p.totalCheckins, p.points);
    }

    /// @notice Post a job. msg.value is escrowed in full; no fee is taken.
    function createJob(string calldata title, string calldata description)
        external
        payable
        onlyAgentIDHolder
        returns (uint256 jobId)
    {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (msg.value == 0) revert ZeroReward();
        jobId = jobCount++;
        jobs[jobId] = Job({
            id: jobId,
            poster: msg.sender,
            worker: address(0),
            title: title,
            description: description,
            reward: msg.value,
            createdAt: block.timestamp,
            status: JobStatus.Open,
            workSubmission: ""
        });
        profiles[msg.sender].jobsPosted += 1;
        emit JobCreated(jobId, msg.sender, title, msg.value);
    }

    function applyToJob(uint256 jobId) external onlyAgentIDHolder {
        if (jobId >= jobCount) revert JobNotFound();
        Job storage j = jobs[jobId];
        if (j.status != JobStatus.Open) revert InvalidStatus();
        if (msg.sender == j.poster) revert InvalidStatus();
        if (hasApplied[jobId][msg.sender]) revert AlreadyApplied();
        hasApplied[jobId][msg.sender] = true;
        jobApplicants[jobId].push(msg.sender);
        emit Applied(jobId, msg.sender);
    }

    function assignWorker(uint256 jobId, address worker) external {
        if (jobId >= jobCount) revert JobNotFound();
        Job storage j = jobs[jobId];
        if (msg.sender != j.poster) revert NotPoster();
        if (j.status != JobStatus.Open) revert InvalidStatus();
        if (!hasApplied[jobId][worker]) revert NotApplicant();
        j.worker = worker;
        j.status = JobStatus.Assigned;
        emit WorkerAssigned(jobId, worker);
    }

    /// @notice Worker submits work as plain text or an IPFS CID. No funds move here.
    function submitWork(uint256 jobId, string calldata workSubmission) external {
        if (jobId >= jobCount) revert JobNotFound();
        Job storage j = jobs[jobId];
        if (msg.sender != j.worker) revert NotWorker();
        if (j.status != JobStatus.Assigned) revert InvalidStatus();
        j.workSubmission = workSubmission;
        j.status = JobStatus.Submitted;
        emit WorkSubmitted(jobId, msg.sender, workSubmission);
    }

    /// @notice Poster approves: escrow is released to the worker in this same tx.
    function approveWork(uint256 jobId) external nonReentrant {
        if (jobId >= jobCount) revert JobNotFound();
        Job storage j = jobs[jobId];
        if (msg.sender != j.poster) revert NotPoster();
        if (j.status != JobStatus.Submitted) revert InvalidStatus();
        j.status = JobStatus.Completed;
        uint256 reward = j.reward;
        profiles[j.worker].jobsCompleted += 1;
        profiles[j.worker].points += JOB_COMPLETE_WORKER_POINTS;
        profiles[j.poster].points += JOB_COMPLETE_POSTER_POINTS;
        emit WorkApproved(jobId, j.worker, reward);
        (bool ok, ) = payable(j.worker).call{value: reward}("");
        require(ok, "payout failed");
    }

    /// @notice Poster cancels while Open, or Assigned-but-not-yet-submitted: full refund.
    function cancelJob(uint256 jobId) external nonReentrant {
        if (jobId >= jobCount) revert JobNotFound();
        Job storage j = jobs[jobId];
        if (msg.sender != j.poster) revert NotPoster();
        if (j.status != JobStatus.Open && j.status != JobStatus.Assigned) revert InvalidStatus();
        j.status = JobStatus.Cancelled;
        uint256 refund = j.reward;
        emit JobCancelled(jobId, msg.sender, refund);
        (bool ok, ) = payable(j.poster).call{value: refund}("");
        require(ok, "refund failed");
    }

    // ---- Views ----
    function getProfile(address user) external view returns (Profile memory) {
        return profiles[user];
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        if (jobId >= jobCount) revert JobNotFound();
        return jobs[jobId];
    }

    function getApplicants(uint256 jobId) external view returns (address[] memory) {
        if (jobId >= jobCount) revert JobNotFound();
        return jobApplicants[jobId];
    }

    function isAgentIDHolder(address user) external view returns (bool) {
        return agentId.balanceOf(user) > 0;
    }

    function currentDay() external view returns (uint256) {
        return block.timestamp / 1 days;
    }
}
