// Agent ID Hub frontend — static, no backend, no stored sessions.
// All transactions are signed + confirmed by the user in their own wallet.
const ABI = [
  "function agentId() view returns (address)",
  "function isAgentIDHolder(address) view returns (bool)",
  "function checkIn()",
  "function getProfile(address) view returns (tuple(uint256 totalCheckins,uint256 streak,uint256 lastCheckinDay,uint256 points,uint256 jobsPosted,uint256 jobsCompleted))",
  "function jobCount() view returns (uint256)",
  "function getJob(uint256) view returns (tuple(uint256 id,address poster,address worker,string title,string description,uint256 reward,uint256 createdAt,uint8 status,string workSubmission))",
  "function getApplicants(uint256) view returns (address[])",
  "function createJob(string,string) payable returns (uint256)",
  "function applyToJob(uint256)",
  "function assignWorker(uint256,address)",
  "function submitWork(uint256,string)",
  "function approveWork(uint256)",
  "function cancelJob(uint256)",
  "function currentDay() view returns (uint256)",
];
const STATUS = ["Open", "Assigned", "Submitted", "Completed", "Cancelled"];

let provider, signer, contract, account = null, isHolder = false;

const $ = (id) => document.getElementById(id);
function setStatus(msg, kind = "") { const el = $("status"); el.textContent = msg; el.className = kind; }
function short(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function connect() {
  if (!window.ethereum) { setStatus("Wallet tidak ditemukan. Pasang Binance Wallet / MetaMask dulu.", "err"); return; }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CONFIG.CHAIN_ID) {
      setStatus(`Jaringan salah: kamu di chain ${net.chainId}. Pindah ke ${CONFIG.CHAIN_NAME} (chain ${CONFIG.CHAIN_ID}) di wallet, lalu hubungkan lagi.`, "err");
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + CONFIG.CHAIN_ID.toString(16) }] }); } catch (_) {}
      return;
    }
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    $("account").textContent = short(account);
    if (!CONFIG.CONTRACT_ADDRESS) {
      setStatus("Kontrak belum di-deploy di testnet — isi CONTRACT_ADDRESS di frontend/config.js setelah deploy. Profil & job belum bisa dimuat.", "err");
      return;
    }
    contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, ABI, signer);
    isHolder = await contract.isAgentIDHolder(account);
    $("holderLine").textContent = isHolder
      ? "✅ Kamu pemegang Agent ID — semua fitur terbuka."
      : "⛔ Alamat ini TIDAK memegang Agent ID (balanceOf = 0). Claim Agent ID dulu di aplikasi Binance: Wallet → banner Agent ID.";
    $("checkinBtn").disabled = !isHolder;
    $("createJobBtn").disabled = !isHolder;
    $("profileRow").style.display = "flex";
    await refreshProfile();
    await loadJobs();
    setStatus(isHolder ? "Terhubung." : "Terhubung, tapi bukan pemegang Agent ID.", isHolder ? "ok" : "err");
  } catch (e) { setStatus("Gagal terhubung: " + (e?.message || e), "err"); }
}

async function refreshProfile() {
  const p = await contract.getProfile(account);
  $("stStreak").textContent = p.streak.toString();
  $("stCheckins").textContent = p.totalCheckins.toString();
  $("stPoints").textContent = p.points.toString();
  $("stJobsDone").textContent = p.jobsCompleted.toString();
}

async function doCheckIn() {
  try { setStatus("Menunggu konfirmasi check-in di wallet…"); const tx = await contract.checkIn(); await tx.wait(); await refreshProfile(); setStatus("✅ Check-in berhasil! +10 poin.", "ok"); }
  catch (e) { setStatus("Check-in gagal: " + (e?.reason || e?.message || e), "err"); }
}

async function createJob() {
  const title = $("jobTitle").value.trim(), desc = $("jobDesc").value.trim(), reward = $("jobReward").value;
  if (!title || !reward || Number(reward) <= 0) { setStatus("Isi judul dan reward BNB (> 0).", "err"); return; }
  if (!confirm(`Buat job "${title}" dengan escrow ${reward} BNB? Dana terkunci di kontrak sampai Approve / Cancel.`)) return;
  try {
    setStatus("Menunggu konfirmasi di wallet — periksa jumlah BNB & alamat kontrak sebelum Confirm…");
    const tx = await contract.createJob(title, desc, { value: ethers.parseEther(reward) });
    await tx.wait(); setStatus("✅ Job dibuat, escrow terkunci.", "ok"); await loadJobs(); await refreshProfile();
  } catch (e) { setStatus("Buat job gagal: " + (e?.reason || e?.message || e), "err"); }
}

async function loadJobs() {
  if (!contract) return;
  const n = Number(await contract.jobCount());
  $("jobCount").textContent = `${n} job`;
  const box = $("jobs"); box.innerHTML = n === 0 ? "<p style='color:var(--muted)'>Belum ada job. Jadilah yang pertama posting!</p>" : "";
  for (let i = n - 1; i >= 0; i--) {
    const j = await contract.getJob(i);
    const applicants = await contract.getApplicants(i);
    const isPoster = account && j.poster.toLowerCase() === account.toLowerCase();
    const isWorker = account && j.worker.toLowerCase() === account.toLowerCase();
    const div = document.createElement("div"); div.className = "job";
    div.innerHTML = `
      <h3>${esc(j.title)} <span class="badge ${j.status === 0 ? "open" : j.status === 3 ? "done" : j.status === 4 ? "cancel" : ""}">${STATUS[j.status]}</span></h3>
      <p>${esc(j.description || "(tanpa deskripsi)")}</p>
      <p>Reward (escrow): <b>${ethers.formatEther(j.reward)} BNB</b> · Poster: <span class="mono">${short(j.poster)}</span>${isPoster ? " (kamu)" : ""} · Worker: <span class="mono">${j.worker === ethers.ZeroAddress ? "—" : short(j.worker)}</span>${isWorker ? " (kamu)" : ""}</p>
      ${j.workSubmission ? `<p>Hasil kerja: <span class="mono">${esc(j.workSubmission)}</span></p>` : ""}
      <p style="font-size:13px">Pelamar: ${applicants.length ? applicants.map(short).join(", ") : "belum ada"}</p>
      <div class="row" style="margin-top:8px"></div>`;
    const row = div.querySelector(".row");
    const btn = (label, cls, fn, dis = false) => { const b = document.createElement("button"); b.textContent = label; if (cls) b.className = cls; b.disabled = dis; b.onclick = fn; row.appendChild(b); };
    if (j.status === 0 && isHolder && !isPoster) btn("Lamar Job Ini", "", () => tx("applyToJob", [i], "Lamaran terkirim."));
    if (j.status === 0 && isPoster && applicants.length) {
      const sel = document.createElement("select"); sel.innerHTML = applicants.map((a) => `<option value="${a}">${short(a)}</option>`).join("");
      row.appendChild(sel);
      btn("Tunjuk Worker", "secondary", () => tx("assignWorker", [i, sel.value], "Worker ditunjuk."));
    }
    if (j.status === 1 && isWorker) btn("Kirim Hasil Kerja", "", async () => {
      const ref = prompt("Tulis hasil kerja / link / IPFS CID:");
      if (ref) await tx("submitWork", [i, ref], "Hasil kerja terkirim. Menunggu Approve poster.");
    });
    if (j.status === 2 && isPoster) btn("✅ Approve & Bayar Worker", "", () => tx("approveWork", [i], "Escrow dibayar ke worker."));
    if ((j.status === 0 || j.status === 1) && isPoster) btn("Batalkan (refund)", "danger", () => tx("cancelJob", [i], "Job dibatalkan, escrow kembali."));
    box.appendChild(div);
  }
}

async function tx(fn, args, okMsg) {
  try { setStatus("Menunggu konfirmasi di wallet…"); const t = await contract[fn](...args); await t.wait(); setStatus("✅ " + okMsg, "ok"); await loadJobs(); await refreshProfile(); }
  catch (e) { setStatus("Gagal: " + (e?.reason || e?.message || e), "err"); }
}

$("connectBtn").onclick = connect;
$("checkinBtn").onclick = doCheckIn;
$("createJobBtn").onclick = createJob;
$("refreshBtn").onclick = loadJobs;
if (window.ethereum) window.ethereum.on("accountsChanged", () => location.reload());
