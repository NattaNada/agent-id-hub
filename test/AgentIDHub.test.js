const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_DAY = 24 * 60 * 60;

describe("AgentIDHub", function () {
  let hub, mock, deployer, alice, bob, carol, dave;

  async function deploy() {
    [deployer, alice, bob, carol, dave] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("MockAgentID");
    mock = await Mock.deploy();
    const Hub = await ethers.getContractFactory("AgentIDHub");
    hub = await Hub.deploy(await mock.getAddress());
    // holders: alice, bob, carol. dave is NOT a holder.
    for (const u of [alice, bob, carol]) await mock.mint(u.address);
    return { hub, mock };
  }

  beforeEach(deploy);

  describe("gating", function () {
    it("non-holder cannot check in", async function () {
      await expect(hub.connect(dave).checkIn()).to.be.revertedWithCustomError(hub, "NotAgentIDHolder");
    });
    it("non-holder cannot create a job", async function () {
      await expect(
        hub.connect(dave).createJob("x", "y", { value: ethers.parseEther("0.01") })
      ).to.be.revertedWithCustomError(hub, "NotAgentIDHolder");
    });
    it("isAgentIDHolder reflects mint status", async function () {
      expect(await hub.isAgentIDHolder(alice.address)).to.equal(true);
      expect(await hub.isAgentIDHolder(dave.address)).to.equal(false);
    });
  });

  describe("check-in", function () {
    it("first check-in: streak 1, 10 points", async function () {
      await hub.connect(alice).checkIn();
      const p = await hub.getProfile(alice.address);
      expect(p.streak).to.equal(1);
      expect(p.totalCheckins).to.equal(1);
      expect(p.points).to.equal(10);
    });
    it("double check-in same UTC day reverts", async function () {
      await hub.connect(alice).checkIn();
      await expect(hub.connect(alice).checkIn()).to.be.revertedWithCustomError(hub, "AlreadyCheckedInToday");
    });
    it("streak increments on consecutive days, resets after a gap", async function () {
      await hub.connect(alice).checkIn();
      await time.increase(ONE_DAY);
      await hub.connect(alice).checkIn();
      expect((await hub.getProfile(alice.address)).streak).to.equal(2);
      await time.increase(3 * ONE_DAY); // skip 2 days
      await hub.connect(alice).checkIn();
      const p = await hub.getProfile(alice.address);
      expect(p.streak).to.equal(1);
      expect(p.totalCheckins).to.equal(3);
      expect(p.points).to.equal(30);
    });
  });

  describe("job board", function () {
    async function openJob(poster, reward = "0.05") {
      const tx = await hub.connect(poster).createJob("Fix landing page", "Perbaiki hero section", {
        value: ethers.parseEther(reward),
      });
      await expect(tx).to.emit(hub, "JobCreated").withArgs(0, poster.address, "Fix landing page", ethers.parseEther(reward));
      return 0;
    }

    it("createJob escrows BNB and rejects zero value / empty title", async function () {
      await expect(hub.connect(alice).createJob("", "d", { value: 1 })).to.be.revertedWithCustomError(hub, "EmptyTitle");
      await expect(hub.connect(alice).createJob("t", "d")).to.be.revertedWithCustomError(hub, "ZeroReward");
      const id = await openJob(alice);
      const j = await hub.getJob(id);
      expect(j.poster).to.equal(alice.address);
      expect(j.reward).to.equal(ethers.parseEther("0.05"));
      expect(await ethers.provider.getBalance(await hub.getAddress())).to.equal(ethers.parseEther("0.05"));
    });

    it("happy path: apply -> assign -> submit -> approve releases escrow to worker", async function () {
      const id = await openJob(alice);
      await hub.connect(bob).applyToJob(id);
      await hub.connect(alice).assignWorker(id, bob.address);
      await hub.connect(bob).submitWork(id, "ipfs://QmWork123");
      const before = await ethers.provider.getBalance(bob.address);
      const tx = await hub.connect(alice).approveWork(id);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(bob.address);
      // bob is not the tx sender here (alice is), so balance delta == reward exactly
      expect(after - before).to.equal(ethers.parseEther("0.05"));
      expect(await ethers.provider.getBalance(await hub.getAddress())).to.equal(0);
      const j = await hub.getJob(id);
      expect(j.status).to.equal(3); // Completed
      expect((await hub.getProfile(bob.address)).jobsCompleted).to.equal(1);
      expect((await hub.getProfile(bob.address)).points).to.equal(50);
      expect((await hub.getProfile(alice.address)).points).to.equal(10);
      void gas;
    });

    it("cancel before assignment refunds poster in full", async function () {
      const id = await openJob(alice);
      const before = await ethers.provider.getBalance(alice.address);
      const tx = await hub.connect(alice).cancelJob(id);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);
      expect(after - before + gas).to.equal(ethers.parseEther("0.05"));
      expect((await hub.getJob(id)).status).to.equal(4); // Cancelled
    });

    it("cancel after assignment (not yet submitted) also refunds", async function () {
      const id = await openJob(alice);
      await hub.connect(bob).applyToJob(id);
      await hub.connect(alice).assignWorker(id, bob.address);
      await hub.connect(alice).cancelJob(id);
      expect((await hub.getJob(id)).status).to.equal(4);
      expect(await ethers.provider.getBalance(await hub.getAddress())).to.equal(0);
    });

    it("non-poster cannot approve; non-worker cannot submit; approve before submit reverts", async function () {
      const id = await openJob(alice);
      await hub.connect(bob).applyToJob(id);
      await hub.connect(alice).assignWorker(id, bob.address);
      await expect(hub.connect(bob).approveWork(id)).to.be.revertedWithCustomError(hub, "NotPoster");
      await expect(hub.connect(carol).submitWork(id, "x")).to.be.revertedWithCustomError(hub, "NotWorker");
      await expect(hub.connect(alice).approveWork(id)).to.be.revertedWithCustomError(hub, "InvalidStatus");
    });

    it("double-apply reverts, double-assign reverts, assign non-applicant reverts", async function () {
      const id = await openJob(alice);
      await hub.connect(bob).applyToJob(id);
      await expect(hub.connect(bob).applyToJob(id)).to.be.revertedWithCustomError(hub, "AlreadyApplied");
      await expect(hub.connect(alice).assignWorker(id, carol.address)).to.be.revertedWithCustomError(hub, "NotApplicant");
      await hub.connect(alice).assignWorker(id, bob.address);
      await expect(hub.connect(alice).assignWorker(id, bob.address)).to.be.revertedWithCustomError(hub, "InvalidStatus");
    });

    it("poster cannot apply to own job; non-holder cannot apply", async function () {
      const id = await openJob(alice);
      await expect(hub.connect(alice).applyToJob(id)).to.be.revertedWithCustomError(hub, "InvalidStatus");
      await expect(hub.connect(dave).applyToJob(id)).to.be.revertedWithCustomError(hub, "NotAgentIDHolder");
    });
  });
});
