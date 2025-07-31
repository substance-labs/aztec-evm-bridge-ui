# Aztec <> EVM Bridge UI

> A privacy-preserving, trust-minimized framework for cross-chain intent execution between the Aztec Network and EVM-compatible Layer 2s.


## ⚙️ Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-org/aztec-evm-intent-ui.git
cd aztec-evm-intent-ui
```

### 2. Use Node.js v22

Make sure you have [nvm](https://github.com/nvm-sh/nvm) installed:

```bash
nvm use
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up environment variables

Copy the example `.env` file and configure the required values:

```bash
cp .env.example .env
```

Update `.env` with your values:

```
NODE_DEBUG=
REOWN_PROJECT_ID=
```

## 🚀 Available Scripts

### Start in development mode

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```
