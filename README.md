# DM Locker Pro — Zero-Knowledge Digital Document Custody

An enterprise-grade, human-designed digital document security and insurance continuity application built for hackathons and production deployment.

DM Locker Pro provides client-side **AES-256-GCM authenticated encryption**, autonomous **TinyFish web agent integration** for policy renewals, zero-knowledge clause comparisons, nominee claim preparation, and an emergency **Dead Man's Switch with mathematical 2-of-3 Shamir's Secret Sharing**.

---

## 1. Key Architectural Features

1. **Strict Case-Insensitive Username Uniqueness**:
   - Normalized at the backend (trimmed + lowercase).
   - Atomic database `UNIQUE` constraint in SQLite (`normalized_username`).
   - Rejects existing usernames with the exact mandatory inline message:
     `"This username is already taken. Please choose another username."`
   - Preserves user input and stays on the signup page so the handle can be edited.
   - Concurrency safe under simultaneous registration requests.

2. **Client-Side AES-256-GCM Encryption (Web Crypto API)**:
   - Zero-Knowledge architecture: files are encrypted in browser memory prior to network transmission.
   - Master passphrase derives a 256-bit AES-GCM vault key using **PBKDF2-HMAC-SHA256 (100,000 rounds)**.
   - Each upload generates a fresh, random 12-byte (96-bit) IV via CSPRNG.
   - Plaintexts and decryption keys never touch the server.

3. **Self-Healing Locker — Renewal Center**:
   - Autonomous **TinyFish web agent** workflow for policy rate and schedule retrieval.
   - Step-by-step agent telemetry streaming.
   - Promotes approved renewals to a new document version while automatically archiving superseded versions.
   - Transparent simulation badge when operating in sandbox mode without API keys.

4. **Zero-Knowledge Policy Health Check**:
   - Compares stored policy schedules against current underwriter filings.
   - Side-by-side clause diffing for room-rent caps, robotic surgeries, and waiting periods.
   - Status classifications: `Verified Difference`, `Requires Review`, `No Difference Detected`.

5. **Autonomous Nominee Claim Pilot**:
   - Evaluates required claim documents dynamically against existing vault records.
   - Tracks available vs missing evidence (Identity proofs, death certificates, hospital records).
   - Halts strictly before legally binding transactions, signatures, or OTPs.

6. **Emergency Access — Dead Man's Switch & 2-of-3 Shamir's Secret Sharing**:
   - Heartbeat check-in timer with configurable tolerance (1 to 90 days).
   - Mathematically verified Galois Field $GF(2^8)$ 2-of-3 Shamir threshold scheme.
   - Any 2 shares (User Offline Key, Nominee Key, Server Escrow) reconstruct the key; 1 share alone yields 0 bits.
   - Interactive verification test suite built directly into the UI.

7. **Permanent Bottom Theme Switcher**:
   - Located at the bottom of the desktop sidebar and mobile drawer.
   - Three modes: **Light** (warm alabaster), **Dark** (deep charcoal), **System** (OS sync).
   - Zero-flash initial load via `<head>` script.
   - Persisted in `localStorage` and synchronized to the user's database profile.

---

## 2. Quick Start & Local Execution

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run both the backend server and frontend client concurrently
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:3001](http://localhost:3001)

### Demo Credentials
- **Username**: `shyamkeshri`
- **Master Passphrase**: `Password123!`
*(Or click "Quick-Fill Demo Account" on the Sign In page)*

---

## 3. Running the Verification Test Suite

A comprehensive automated test suite validates all 14 mandatory operational requirements:
```bash
npm test
```

This verifies:
- New user registration
- Duplicate username rejection with exact inline message
- Case-insensitive & whitespace duplicate rejection
- Concurrent duplicate registration race condition safety
- PBKDF2 vault key derivation and scrypt password hashing
- Client-side AES-256-GCM encrypted document upload & storage
- Cross-user document authorization isolation
- TinyFish renewal agent dispatch and quote retrieval
- Policy version promotion & superseded version archival
- Zero-Knowledge policy health clause diffing
- Nominee claim dynamic checklist derivation
- Emergency switch check-in & timer reset
- 2-of-3 Shamir secret sharing mathematical reconstruction across all pairs & single-share rejection
- Theme persistence in the database

---

## 4. TinyFish Configuration

To enable live underwriter portal agent execution:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your TinyFish API key:
   ```env
   TINYFISH_API_KEY=your_actual_api_key_here
   ```
3. Restart the server (`npm run dev`).

When no API key is set, the application runs transparently in **Development Simulation Mode**, displaying authentic browser agent telemetry logs with an explicit `[DEVELOPMENT SIMULATION (MOCK PORTAL)]` badge.

---

## 5. Security & Cryptographic Model

- **Database**: SQLite WAL mode with persistent schema (`server/data/dmlocker.db`).
- **Passwords**: Scrypt salted hash (OWASP recommended parameters).
- **Client Vault Key**: PBKDF2 (SHA-256, 100,000 iterations). Key is held purely in browser RAM during an authenticated session.
- **Payload Encryption**: AES-256-GCM with 96-bit fresh random IV per file and 128-bit authentication tag.
- **Recovery Escrow**: 2-of-3 Shamir polynomial secret sharing over $GF(2^8)$ with irreducible generator polynomial `0x11d`.
