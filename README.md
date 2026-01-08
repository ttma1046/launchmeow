<p align="center">
  <img src="https://ipfs.io/ipfs/bafybeibgzm2eif2g4wmmv7iicf6gp4sh7x4wc7uvqeoaxufxdwferfloq4" alt="LaunchMeow" width="200"/>
</p>

# launchmeow

A bot that monitors X for meme-worthy content and automatically launches tokens on **pump.fun** (Solana) and **Flap** (BSC).

- sol ca: EQhn57nSoSKBtEtd5VW3MmGFzGTNRkAWHK2yP8Hi3ncr
- bcs ca: 0xa08020a582D46de5804760fbFc58A6F0b54f8888

## Features

- 🐦 **X Monitoring**: Watches specified accounts for new posts
- 🤖 **AI-Powered**: Generates token metadata using AI
- 🎨 **Image Management**: Random token images with IPFS uploads
- 🚀 **Multi-Chain Launching**:
  - **pump.fun** (Solana) - Fair launch bonding curve
  - **Flap** (BSC) - Bonding curve with auto-migration to DEX

## Prerequisites

- Node.js 18+ and pnpm
- Solana wallet with SOL (for pump.fun launches)
- BSC wallet with BNB (for Flap launches)
- X (Twitter) API access
- Groq API key (for AI)
- Pinata account (for IPFS)

## Support the Project

If you find this project helpful, consider supporting development:

**Solana Wallet:**
```
9eeN2ryudjM4BUrbzGjdBX3B2Wa8BYiD1LiLNZHdr6kW
```

**BSC Wallet:**
```
0x7c22ca851f82dc77ed7dd192112a68c10432e8a0
```

## Setup

### 1. Clone and Install

```bash
git clone <your-repo>
cd launchmeow
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

#### Solana Wallet Setup (pump.fun)

1. **Create or Export Solana Wallet**:
   ```bash
   # If using Phantom or other wallet, export your private key
   # Or generate new wallet:
   solana-keygen new --outfile ~/my-solana-wallet.json
   ```

2. **Get Base58 Private Key**:
   ```bash
   # Convert JSON keypair to base58 (use Node.js):
   node -e "console.log(require('bs58').encode(Buffer.from(require('./my-solana-wallet.json'))))"
   ```

3. **Fund Your Wallet**:
   - Send SOL to your wallet address
   - Minimum: ~0.5 SOL (for transaction fees + initial buy)
   - Check balance: `solana balance <YOUR_ADDRESS>`

4. **Add to .env**:
   ```
   SOLANA_PRIVATE_KEY_BASE58=your_base58_encoded_private_key
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

#### BSC Wallet Setup (Flap)

1. **Export Private Key from MetaMask** (or create new wallet):
   - MetaMask → Account → Export Private Key
   - Must include `0x` prefix

2. **Fund Your Wallet**:
   - Send BNB to your wallet address
   - Minimum: ~0.1 BNB (for transaction fees + initial buy)

3. **Add to .env**:
   ```
   BSC_PRIVATE_KEY_HEX=0xyour_private_key_with_0x_prefix
   BSC_RPC_URL=https://bsc-dataseed1.binance.org
   ```

#### X (Twitter) API Setup

1. Create an X Developer account at [developer.x.com](https://developer.x.com)
2. Create a new app with Read permissions
3. Generate a Bearer Token
4. Add to `.env`:
   ```
   X_BEARER_TOKEN=your_bearer_token
   ```

#### AI Service Setup

1. Get Groq API key from [console.groq.com](https://console.groq.com)
2. Add to `.env`:
   ```
   GROQ_API_KEY=your_groq_api_key
   ```

#### IPFS Setup

1. Create Pinata account at [pinata.cloud](https://pinata.cloud)
2. Generate JWT token
3. Add to `.env`:
   ```
   PINATA_JWT=your_pinata_jwt
   ```

### 3. Add Token Images

Place your token images in `assets/token-images/`:

```bash
assets/token-images/
  ├── image1.png
  ├── image2.jpg
  └── image3.png
```

### 4. Run the Bot

```bash
pnpm start
```

## How It Works

1. **Monitor**: Bot checks X for new posts from configured accounts
2. **Analyze**: AI generates token name, symbol, and description
3. **Launch**: Creates token on pump.fun or Flap with bonding curve
4. **Initial Buy**: Bot buys 0.001 SOL worth to kickstart the curve
5. **Publish**: Shares contract address and links

## pump.fun Details

- **Fair Launch**: Uses bonding curve mechanism
- **No Presale**: Equal opportunity for all buyers
- **Graduated Liquidity**: When bonding curve completes, liquidity moves to Raydium
- **Transaction Fee**: pump.fun charges ~1% fee
- **Initial Buy**: Bot automatically buys 0.001 SOL worth to start

## Development

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Lint code
pnpm lint

# Format code
pnpm format
```

## Configuration

Edit [config.yaml](config.yaml) to configure:

```yaml
# Twitter accounts to monitor (without @)
target_users:
  - elonmusk
  - cz_binance

# Initial buy amounts
initial_buy:
  solana: 0.001  # SOL for pump.fun
  bsc: 0.0001    # BNB for Flap

# AI settings
ai:
  temperature: 0.7  # Creativity (0.0-1.0)
```

## Security

⚠️ **Important**:
- Never commit your `.env` file
- Keep private keys secure
- Test on devnet first before mainnet
- Start with small amounts

## Troubleshooting

### "PumpFun service not initialized"
- Check `SOLANA_PRIVATE_KEY_BASE58` is set correctly in `.env`
- Verify your private key is base58 encoded

### "Insufficient SOL balance"
- Ensure wallet has at least 0.5 SOL
- Check balance: `solana balance <address>`

### "Transaction failed"
- Increase slippage tolerance in [src/services/pumpfun/pumpfun.ts](src/services/pumpfun/pumpfun.ts)
- Check Solana network status
- Verify RPC endpoint is responsive

## License

MIT License