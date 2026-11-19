# Agent ID Hub — Hackathon Submission Pack

Prepared 19 Nov 2026. Copy-paste ready. **Do NOT submit yet until the 30-holder
count is reached** — Innovation Award eligibility needs a live product + at
least 30 distinct Agent ID addresses interacting during the submission period
(18 Nov – 9 Dec 2026 08:00 UTC).

## ⚠️ Submission form — status

The official Binance announcement (18 Nov 2026) says to submit "project name,
website, contract address(es), Agent ID usage description, and other required
materials during the Submission Period. No registration needed" — but **no
project-submission form URL is printed in the announcement itself** (checked
19 Nov 2026, including a web search). The only survey link in the announcement
is the one for the X Community Promotion Campaign.

**Before submitting:** re-check the announcement page and @BinanceWallet on X
for the project-submission form/survey link. If Binance opens a form, paste
the fields below into it. If no form appears, the fallback is to publish the
project on X with #BinanceWalletHackathon #AgenticWallet and keep the on-chain
activity growing — the Pioneer Award is ranked from on-chain data alone.

- Announcement: https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf
- Submission deadline: **9 Dec 2026 08:00 UTC (15:00 WIB)**

## 1. Project fields (copy-paste)

- **Project name:** Agent ID Hub
- **Team:** Individual — Arie Kurniawan (Agent ID: `nadanatta`)
- **Website (live app):** https://nattanada.github.io/agent-id-hub/
  (GitHub Pages, deploys folder `frontend/` from branch `main` via
  `.github/workflows/pages.yml`)
- **Source code (open-source, MIT):** https://github.com/NattaNada/agent-id-hub
  (public repo, branch `main`; `.env` is gitignored; no keys in the repo.)
- **Contract (BNB Chain mainnet, chain 56):**
  - AgentIDHub: `0xBC9DAD0da80D766e28F6475aea438486cE5CEE1d`
  - BscScan (source verified): https://bscscan.com/address/0xBC9DAD0da80D766e28F6475aea438486cE5CEE1d
  - Deployer: `0xB54B9556aCeAa88cDCf709d0B7342a783E8d7650`
  - Deploy cost: 0.00023802 BNB (19 Nov 2026)
- **Agent ID contract used:** `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`
  (SPACE ID Agent ID, ERC-721, non-transferable)
- **Proposed reward-receiving address (user to confirm):**
  `0x6C984AFbaA97e5c131A14B3CAFf837c326352468` (user's Agentic Wallet, BSC)

## 2. Short description (for the form)

> Agent ID Hub is a dApp for Binance Agentic Wallet holders: a daily check-in
> that builds an on-chain reputation streak, and a job board where only Agent
> ID holders can post and take jobs, with BNB held in escrow and released only
> when the poster approves the work. Your Agent ID is your identity — it is
> non-transferable, so reputation cannot be bought or moved to another wallet.

## 3. Agent ID usage description (for the form — this is the 30% depth score)

Agent ID is not a badge on this product; it gates every function that touches
identity or money. The contract checks `balanceOf(msg.sender) > 0` on the
Agent ID contract (`0x60b9…22f`) through an `onlyAgentIDHolder` modifier:

- `checkIn()` — only holders, once per UTC day. Streak increments on
  consecutive days and resets after a gap; +10 points per check-in. Points are
  reputation only — not a token, not money.
- `createJob()` — only holders. The poster pays the full reward in BNB into
  escrow at creation. Fee is 0%, no owner cut.
- `applyToJob()` — only holders. The poster cannot apply to their own job.
- `assignWorker()` / `submitWork()` / `approveWork()` / `cancelJob()` —
  escrow moves only by an explicit, user-confirmed transaction: approve
  releases escrow to the worker, cancel refunds it in full to the poster.
  There is no auto-release, no scheduled transfer, no bundled transfer.

Why this matters: because an Agent ID is soulbound (one per user,
non-transferable), reputation earned here is tied to a real, persistent
identity. A bad actor cannot sell or transfer a good reputation, and cannot
spin up a fresh wallet to escape a bad one. That is the anti-Sybil property
the job board is built on.

Agent ID is **not** used as a tool to look up other people's wallets by name —
the frontend only reads `balanceOf` for the wallet the user connected
themselves.

## 4. Safety / red-line compliance (for the form, if asked)

- No web QR-code login, no pairing codes, no server-stored sessions. Login is
  the user's own wallet (`window.ethereum`).
- No prompt or flow bypasses user transaction confirmation. Every fund
  movement is a transaction the user confirms in their wallet.
- No seed phrases, private keys, or API secrets are collected. No keys in repo.
- No promised returns or "passive income". Check-in points are not a token.
- The job-creation form shows a risk warning next to the payment field.
- No use of "Binance" / "BNB" in the project name or domain to impersonate
  the official brand. Contract has no pause, withdraw, fee setter, or admin
  transfer — the deployer has no power over user funds.
- Contract source verified on BscScan (Compiler v0.8.20+commit.a1b79de6,
  License MIT); 13/13 Hardhat tests pass (gating, streak, escrow happy path,
  refund, and revert cases).

## 5. How we reach 30 Agent ID holders (plan)

1. **Check-in is the hook** — one click, ~$0.002–0.05 in gas, no BNB
   escrow needed. Every holder who checks in counts toward the 30.
2. **Post the X drafts below** (English + Indonesian) with
   #BinanceWalletHackathon #AgenticWallet, linking the live app + BscScan.
3. **Seed the job board** — post 3–5 real micro-jobs first (e.g. review a
   contract, translate a README, test a dApp) so the first visitors see work,
   not an empty board.
4. **Ask in Agent ID communities** (Binance Square, Telegram/Discord groups
   for Agent ID holders, SPACE ID community): "holders only — check in once,
   it costs cents". Track count on-chain: distinct `checkIn` callers.
5. **Do NOT fake it** — no mass account registration, no wash interactions.
   Binance disqualifies abnormal behavior, and the whole point of the
   soulbound ID is that the 30 must be real holders.

Current count (19 Nov 2026): **1 holder interacting (the deployer/user's own
check-in still to be done)** — count is 0 until real check-ins land. Update
this line as holders arrive.

## 6. X drafts — recruitment + promotion award

Post from the user's X account. Each post is original content about the
project; submit the post link via the official campaign survey for the
Community Promotion Campaign (20 winners share 2,000 USDC). Keep hashtags
#BinanceWalletHackathon #AgenticWallet on every post. No earnings promises.

### Draft A (launch, English)

> I built Agent ID Hub for the @BinanceWallet Agent ID Hackathon 🪪
>
> ✅ Daily check-in — only Agent ID holders, on-chain streak
> ✅ Job board — only holders can post & take jobs, BNB escrow, 0% fee
> ✅ Live on BNB Chain, source verified on BscScan
>
> Holders, check in once — it costs cents:
> https://nattanada.github.io/agent-id-hub/
> Contract: 0xBC9DAD0da80D766e28F6475aea438486cE5CEE1d
>
> #BinanceWalletHackathon #AgenticWallet

### Draft B (how it works, English)

> Why tie a job board to Agent ID?
>
> Your Agent ID is soulbound — one per person, non-transferable. So
> reputation on Agent ID Hub can't be bought, sold, or moved to a fresh
> wallet. Good work sticks to you. Bad work does too.
>
> That's the anti-Sybil property a job board actually needs.
> Try it: https://nattanada.github.io/agent-id-hub/
>
> #BinanceWalletHackathon #AgenticWallet

### Draft C (Indonesian)

> Gue bikin Agent ID Hub buat hackathon @BinanceWallet — check-in harian +
> job board khusus pemegang Agent ID 🪪
>
> Cuma holder yang bisa check-in & ambil job, bayaran BNB di-escrow,
> fee 0%, kontrak udah live di BNB Chain & terverifikasi di BscScan.
>
> Holder, check-in sekali aja, gas-nya receh:
> https://nattanada.github.io/agent-id-hub/
>
> #BinanceWalletHackathon #AgenticWallet

### Draft D (progress update — post after 10 / 30 holders)

> Agent ID Hub update: [N]/30 Agent ID holders checked in ✅
>
> Still need [30-N] more holders to qualify for the Innovation Award.
> If you hold an Agent ID, one check-in is all it takes:
> https://nattanada.github.io/agent-id-hub/
>
> #BinanceWalletHackathon #AgenticWallet

## 7. Pre-submit checklist

- [x] Contract deployed on BSC mainnet
- [x] Source verified on BscScan (v0.8.20, MIT)
- [x] 13/13 Hardhat tests pass
- [x] Frontend wired to mainnet contract (chain 56)
- [x] Repo pushed to GitHub (public, MIT) — https://github.com/NattaNada/agent-id-hub
- [x] Frontend hosted live (GitHub Pages) — https://nattanada.github.io/agent-id-hub/
- [ ] 30 distinct Agent ID addresses interacted (check BscScan events)
- [ ] Seed 3–5 real jobs on the board
- [ ] Project-submission form found + fields pasted + submitted before
      9 Dec 2026 15:00 WIB
- [ ] X posts published + links submitted via campaign survey (promo award)
