# Quick Start: Launching on pump.fun

This guide will help you quickly set up and launch your first token on pump.fun.

## 1. Generate Solana Wallet

If you don't have a Solana wallet yet:

```bash
pnpm wallet generate
```

This will:
- Create a new Solana wallet
- Save keypair to `solana-wallet.json`
- Display your public address and base58 private key

## 2. Fund Your Wallet

Send at least **0.5 SOL** to your wallet address:

```bash
# Check balance
solana balance YOUR_PUBLIC_KEY

# Or use Phantom/Solflare wallet to send SOL
```

You can buy SOL on:
- Coinbase
- Binance
- Kraken
- Or any major exchange

## 3. Configure .env

Add your Solana private key to `.env`:

```bash
SOLANA_PRIVATE_KEY_BASE58=your_base58_private_key_from_step_1
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

Also configure other required services:
- Twitter API keys
- Groq API key
- Pinata JWT

## 4. Add Token Images

Place at least one image in `assets/token-images/`:

```bash
mkdir -p assets/token-images
cp /path/to/your/image.png assets/token-images/
```

Images should be:
- 512x512 or larger
- PNG or JPG format
- Meme-friendly and appropriate

## 5. Launch!

Run the bot:

```bash
pnpm start
```

The bot will:
1. ✅ Initialize services
2. 🐦 Monitor Twitter for tweets
3. 🤖 Generate token metadata with AI
4. 🎨 Upload image to IPFS
5. 🚀 Launch token on pump.fun
6. 💰 Make initial 0.001 SOL buy

## Expected Output

```
🔧 Initializing services...
✅ Solana wallet loaded: YourPublicKeyHere
✅ Services initialized.
👀 Checking for tweets...

🎨 Using image: pepe.png
📁 Uploading image to IPFS...
✅ Image uploaded: ipfs://QmHash...

🚀 Creating token on pump.fun...
   Name: Based Dog
   Symbol: BDOG
   Description: Based Dog - Inspired by @cz_binance

✅ Token launched on pump.fun (Solana)!
   📄 Mint Address: TokenAddressHere
   🔗 Pump.fun: https://pump.fun/TokenAddressHere
   🔗 Solscan: https://solscan.io/token/TokenAddressHere
```

## Customization

### Change Initial Buy Amount

Edit `config.yaml`:

```yaml
initial_buy:
  solana: 0.005  # Change SOL amount for pump.fun
  bsc: 0.001     # Change BNB amount for Flap
```

### Monitor Different Twitter Accounts

Edit `config.yaml` to change the monitored accounts:

```yaml
target_users:
  - elonmusk
  - cz_binance
```

## Troubleshooting

### "PumpFun service not initialized"

**Issue**: Solana private key not configured properly

**Solution**:
```bash
# Regenerate wallet
pnpm wallet generate

# Or convert existing wallet
pnpm wallet convert ./your-wallet.json
```

### "Insufficient SOL balance"

**Issue**: Not enough SOL in wallet

**Solution**:
```bash
# Check balance
solana balance YOUR_PUBLIC_KEY

# Send more SOL (need at least 0.5)
```

### "Transaction failed"

**Issue**: Network congestion or slippage too low

**Solution**: Edit [src/services/pumpfun/pumpfun.ts](src/services/pumpfun/pumpfun.ts) to increase slippage:

```typescript
BigInt(0.3 * 1e9), // Increase slippage to 0.3 SOL
```

## Cost Breakdown

Per token launch:
- **Transaction Fee**: ~0.00001 SOL
- **Initial Buy**: 0.001 SOL (customizable in config.yaml)
- **pump.fun Fee**: ~1% of buy
- **Total**: ~0.002 SOL per launch

With 0.5 SOL you can launch ~250 tokens.

## Next Steps

- Set up monitoring for multiple Twitter accounts
- Configure auto-submission to listing platforms
- Add custom token metadata generation
- Implement profit-taking strategies

## Support

Having issues? Check:
- Solana network status: [status.solana.com](https://status.solana.com)
- pump.fun status: [pump.fun](https://pump.fun)
- Your RPC endpoint: Try alternative endpoints if slow

Happy launching! 🚀
