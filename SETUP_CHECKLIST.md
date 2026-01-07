# 🚀 Setup Checklist for pump.fun Launches

Use this checklist to ensure everything is configured correctly before launching.

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Git repository cloned

## 📦 Installation

- [ ] Run `pnpm install`
- [ ] Verify no installation errors
- [ ] Check TypeScript compiles: `npx tsc --noEmit`

## 🔑 Solana Wallet Setup

- [ ] Generate new wallet: `pnpm wallet generate`
  - OR convert existing: `pnpm wallet convert ./wallet.json`
- [ ] Note your public address
- [ ] Fund wallet with at least **0.5 SOL**
- [ ] Verify balance: `solana balance <YOUR_ADDRESS>`
- [ ] Add private key to `.env` as `SOLANA_PRIVATE_KEY_BASE58`

## 🌐 RPC Configuration

- [ ] Add Solana RPC URL to `.env`
  - Default: `https://api.mainnet-beta.solana.com`
  - Recommended: Get free RPC from [Helius](https://helius.dev) or [QuickNode](https://quicknode.com)

## 🐦 Twitter API Setup

- [ ] Create Twitter Developer account
- [ ] Generate API keys (v2 with OAuth 1.0a)
- [ ] Add all Twitter keys to `.env`:
  - `X_APIKEY`
  - `X_APIKEY_SECRET`
  - `X_BEARER_TOKEN`
  - `X_ACCESS_TOKEN`
  - `X_ACCESS_TOKEN_SECRET`
- [ ] Test connection: Check console logs on startup

## 🤖 AI Service Setup

- [ ] Get Groq API key from [console.groq.com](https://console.groq.com)
- [ ] Add to `.env`: `GROQ_API_KEY`
- [ ] Verify free tier limits (check Groq dashboard)

## 📌 IPFS/Pinata Setup (Recommended)

- [ ] Create Pinata account at [pinata.cloud](https://pinata.cloud)
- [ ] Generate JWT token
- [ ] Add to `.env`: `PINATA_JWT`
- [ ] Test upload: Images will be uploaded to IPFS

## 🎨 Token Images

- [ ] Create directory: `mkdir -p assets/token-images`
- [ ] Add at least one image:
  - Format: PNG or JPG
  - Size: 512x512 or larger
  - Appropriate content for meme tokens
- [ ] Verify images are readable: `ls -la assets/token-images/`

## ⚙️ Configuration Files

- [ ] `.env` file exists (copy from `.env.example`)
- [ ] All required environment variables set
- [ ] No syntax errors in `.env`
- [ ] Private keys are valid

## 🧪 Testing

- [ ] Run tests: `pnpm test`
- [ ] All tests pass (skipped tests are OK)
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Linting passes: `pnpm lint`

## 🎯 Pre-Launch Verification

- [ ] Review bot logic in `src/index.ts`
- [ ] Confirm Twitter accounts to monitor
- [ ] Check initial buy amount (default: 0.01 SOL)
- [ ] Verify slippage settings (default: 1%)
- [ ] Test on devnet first (optional but recommended)

## 🚀 Launch Readiness

- [ ] Wallet funded with sufficient SOL (0.5+ recommended)
- [ ] All services initialized without errors
- [ ] Bot can connect to Twitter
- [ ] AI service responding
- [ ] IPFS uploads working (if configured)
- [ ] pump.fun service initialized

## 🔍 Final Checks

Run the bot with `pnpm start` and verify:

- [ ] ✅ "Solana wallet loaded" appears
- [ ] ✅ "Services initialized" appears
- [ ] ✅ No error messages in console
- [ ] ✅ Twitter monitoring starts
- [ ] ✅ Can detect tweets (test with known tweet)

## 📊 Cost Preparation

Estimated costs per token launch:
- Solana transaction fees: ~0.00001 SOL
- Initial buy on pump.fun: 0.01 SOL (configurable)
- pump.fun platform fee: ~1% of buy
- **Total per token: ~0.011 SOL**

With 0.5 SOL, you can launch approximately 45 tokens.

Budget accordingly:
- [ ] Calculated expected launch volume
- [ ] Funded wallet with sufficient SOL
- [ ] Set aside extra for unexpected fees

## 🔐 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Never shared private keys
- [ ] Wallet backup stored securely
- [ ] API keys kept confidential
- [ ] Using environment variables (not hardcoded)

## 📝 Optional Enhancements

- [ ] Configure Flap (BSC) for dual-chain launches
- [ ] Set up submission to listing platforms
- [ ] Add custom token metadata logic
- [ ] Implement profit-taking strategies
- [ ] Set up monitoring/alerts

## ✨ You're Ready!

Once all items are checked:

```bash
pnpm start
```

Your bot will:
1. Monitor Twitter for eligible tweets
2. Generate token metadata with AI
3. Upload images to IPFS
4. Launch tokens on pump.fun
5. Make initial buy to kickstart trading
6. Log all transaction details

## 🆘 Need Help?

If you encounter issues:

1. Check [QUICKSTART.md](QUICKSTART.md) for quick solutions
2. Review [README.md](README.md) for detailed setup
3. Read [PUMPFUN_INTEGRATION.md](PUMPFUN_INTEGRATION.md) for technical details
4. Verify all environment variables are set correctly
5. Check Solana network status at [status.solana.com](https://status.solana.com)

## 📈 Success Metrics

Track your launches:
- [ ] Number of tokens created
- [ ] Total SOL spent
- [ ] Average launch time
- [ ] Success rate
- [ ] Community engagement

---

**Good luck with your launches! 🚀**
