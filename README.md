# GateKeeper — Sovereign Paywalled Escrow & Access Engine

GateKeeper is a production-ready, full-stack sovereign booking, escrow settlement, and single-use digital pass engine with WebAuthn Passkeys, Stripe Connect / Hosted Checkout, and an external `/v1` REST API protocol.

---

## 🚀 Localhost Clone & Quick Start

Follow these steps to run GateKeeper locally after cloning from GitHub:

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm** or **bun** / **pnpm**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/MerkMorassi/GATEKEEPER-MVP-DEV-v1.2.git
cd GATEKEEPER-MVP-DEV-v1.2
npm install
```

### 3. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```

Open `.env` and verify your local port and configuration:
```env
PORT=3750
ENABLE_DEV_AUTH="true"
DEV_AUTH_USERNAME="dev_admin"
DEV_AUTH_PASSWORD="your-dev-password"
```

### 4. Start Development Server
```bash
npm run dev
```
The server will boot on **http://localhost:3750** (or whatever port is specified in `.env`).

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express backend with live Vite middleware via `tsx server.ts` |
| `npm run build` | Builds the React frontend client and compiles `server.ts` into `dist/server.cjs` via esbuild |
| `npm run start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans build artifacts and distribution directories |

---

## 🌐 Application Architecture & Port Details

- **Default Local Port**: `3750` (configurable via `process.env.PORT`)
- **Container Port**: `3000` (auto-routed by Docker/Cloud Run in production)
- **Local Dev Server**: Express + Vite integrated middleware (single unified port for both API and React frontend)
- **Database**: Local JSON persistence (`gatekeeper_db.json`) initialized automatically on startup

---

## 🏛️ Sovereign Architecture (Not a Marketplace)

- **Dedicated Sovereign Sales Page**: Every provider operates their own standalone Sales & Booking Landing Page with custom branding, service tiers, calendar scheduling, and instant checkout.
- **No Public Provider Directory**: GateKeeper is **not** a marketplace app. There is **no public-facing directory or list of providers**; each provider shares their direct sales page or marketing gate link.
- **Single Active Provider**: Currently seeded with one active provider (`Merk Morassi`), who controls their custom offerings, pricing, video call endpoints, and marketing gates.

---

## 🔑 Key Endpoints

- **Provider Sovereign Sales Page**: `http://localhost:3750/#sales`
- **Access Portal & Gateway**: `http://localhost:3750/`
- **Client Direct Checkout**: `http://localhost:3750/#client`
- **Provider Dashboard**: `http://localhost:3750/#provider`
- **Admin Control Center**: `http://localhost:3750/#admin`
- **Access Scanner Station**: `http://localhost:3750/#scanner`
- **Developer API Docs & Sandbox**: `http://localhost:3750/#admin/api`
- **Health Check**: `http://localhost:3750/v1/health`
