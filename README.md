# Agent ID Hub

**Check-in harian + Job Board — hanya untuk pemegang Agent ID — untuk Binance Agent ID Hackathon (60.000 USDC).**

Satu dApp, dua fitur dalam satu kontrak: check-in harian (pintu masuk low-friction untuk mencapai 30 pengguna) dan job board dengan escrow BNB (kedalaman penggunaan Agent ID). Dibangun untuk hackathon Binance Wallet × BNB Chain.

- **Submission:** 18 Nov – 9 Des 2026 08:00 UTC (15:00 WIB 9 Des)
- **Agent ID contract (BNB Chain):** `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, ERC-721 non-transferable)
- **Pemegang yang sudah ada:** `nadanatta` (user)
- **DEPLOYED MAINNET 19 Nov 2026:** `0xBC9DAD0da80D766e28F6475aea438486cE5CEE1d` — [BscScan](https://bscscan.com/address/0xBC9DAD0da80D766e28F6475aea438486cE5CEE1d) — deployer `0xB54B9556aCeAa88cDCf709d0B7342a783E8d7650`, biaya deploy aktual 0,00023802 BNB (sisa deployer 0,00076198 BNB). Source verification di BscScan **TERVERIFIKASI 19 Nov 2026** (via Etherscan API v2, chain 56; getsourcecode: ContractName AgentIDHub, Compiler v0.8.20+commit.a1b79de6, License MIT).

## Bagaimana Agent ID dipakai (kedalaman, 30% skor juri)

Bukan sekadar badge. Setiap fungsi yang menyentuh identitas atau dana memeriksa
`balanceOf(msg.sender) > 0` pada kontrak Agent ID lewat modifier `onlyAgentIDHolder`:

| Fungsi | Syarat Agent ID | Yang terjadi |
|---|---|---|
| `checkIn()` | ya | 1x per hari UTC, streak + poin on-chain |
| `createJob()` | ya | posting job + escrow BNB |
| `applyToJob()` | ya | melamar job |
| `assignWorker()` / `submitWork()` / `approveWork()` / `cancelJob()` | poster/worker harus holder saat apply; penugasan & pembayaran mengikuti alur job | escrow hanya bergerak lewat Approve / Cancel |

Agent ID **tidak** dipakai sebagai alat lookup wallet orang lain berdasarkan nama — frontend hanya membaca `balanceOf` untuk alamat wallet yang terhubung sendiri.

## Aturan keamanan / red lines hackathon — dipatuhi

- ❌ **Tidak ada** login QR web / pairing code / sesi tersimpan di server. Login = wallet pengguna sendiri (`window.ethereum`).
- ❌ **Tidak ada** bypass konfirmasi: semua pergerakan dana adalah transaksi yang pengguna konfirmasi sendiri di wallet. Tidak ada transfer terjadwal / otomatis / bundel.
- ❌ **Tidak ada** pengumpulan seed phrase / private key / API secret. Repo tidak berisi key apa pun (`.env` di-gitignore).
- ❌ **Tidak ada** janji return / "passive income". Poin check-in bukan token dan bukan uang.
- ✅ **Fee 0%**: kontrak tidak memungut fee, tidak ada owner cut.
- ✅ **Owner tidak berkuasa atas dana pengguna**: `deployer` hanya alamat informasional — tidak ada pause, withdraw, fee setter, atau admin transfer di kontrak. Escrow hanya keluar lewat `approveWork()` (ke worker) atau `cancelJob()` (kembali ke poster).
- ✅ Halaman pembayaran menampilkan **peringatan risiko** di dekat form buat job.
- ✅ Nama/domain tidak memakai "Binance" / "BNB" untuk impersonasi.

## Struktur repo

```
contracts/AgentIDHub.sol        # kontrak utama (Solidity 0.8.20, OpenZeppelin ReentrancyGuard)
contracts/test/MockAgentID.sol  # mock ERC-721 mintable — HANYA untuk test, jangan deploy mainnet
test/AgentIDHub.test.js         # 13 test Hardhat
scripts/deploy.js               # deploy ke BSC Testnet (chain 97)
frontend/                       # aplikasi statis: index.html + config.js + app.js (ethers v6 CDN)
  config.js                     # isi CONTRACT_ADDRESS setelah deploy
```

## Menjalankan test

```bash
cd ~/workspace/agent-id-hub
npm install
npx hardhat test
```

Hasil (18 Nov 2026): **13 passing, 0 failing** — gating non-holder, double check-in, streak lintas hari (time manipulation), happy path escrow, approve → payout, cancel → refund, non-poster/non-worker revert, double-apply / double-assign revert.

## Deploy ke BSC Testnet

```bash
cp .env.example .env   # isi DEPLOYER_PRIVATE_KEY dengan wallet TESTNET baru (bukan wallet asli!)
# isi tBNB dari faucet: https://testnet.bnbchain.org/faucet-smart
npx hardhat run scripts/deploy.js --network bscTestnet
# lalu isi alamat kontrak ke frontend/config.js
```

Verifikasi di BscScan (butuh `BSCSCAN_API_KEY` di `.env`):

```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
```

Jalankan frontend: buka `frontend/index.html` lewat static server apa pun, mis. `npx serve frontend` atau `python3 -m http.server -d frontend`, lalu hubungkan Binance Wallet di jaringan BSC Testnet.

## Hackathon submission checklist

- [x] Kontrak + test lolos (13/13)
- [x] Frontend statis lengkap (connect, check-in, buat/lamar/tunjuk/kirim/approve/batal job)
- [x] README + `.env.example` + `.gitignore` (tanpa key)
- [x] **Deploy BSC Mainnet 19 Nov 2026: `0xBC9DAD0da80D766e28F6475aea438486cE5CEE1d`** — deployer `0xB54B9556aCeAa88cDCf709d0B7342a783E8d7650`, biaya 0,00023802 BNB, sisa 0,00076198 BNB. Frontend config sudah mainnet (chain 56).
- [x] **Verifikasi source di BscScan — TERVERIFIKASI** (v0.8.20+commit.a1b79de6, MIT, via Etherscan API v2)
- [x] Repo open-source (GitHub) — https://github.com/NattaNada/agent-id-hub (publik, MIT, branch `main`, push 19 Nov 2026)
- [x] Website live — https://nattanada.github.io/agent-id-hub/ (GitHub Pages, deploy folder `frontend/` via workflow `.github/workflows/pages.yml`; pertama sempat gagal karena Pages belum di-set ke GitHub Actions, re-run berhasil 09:23 WIB)
- [ ] Raih 30 alamat Agent ID berbeda yang berinteraksi selama periode submit (syarat Innovation Award) — check-in harian adalah hook-nya; promosikan lewat X dengan `#BinanceWalletHackathon #AgenticWallet`. Lihat rencana + draf postingan di `SUBMISSION.md`.
- [ ] Submit: nama project, website, alamat kontrak, deskripsi pemakaian Agent ID — **form submit project belum ditemukan link-nya di pengumuman resmi (dicek 19 Nov 2026)**; cek pengumuman + @BinanceWallet sebelum 9 Des 2026 15:00 WIB. Paket siap tempel ada di `SUBMISSION.md`.

## Status deploy testnet (18 Nov 2026)

Testnet di-skip atas perintah user 19 Nov 07:41 WIB — langsung deploy mainnet (lihat checklist di atas).
