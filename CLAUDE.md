# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the bot (fetches latest tweets and deploys tokens)
pnpm start

# Run tests
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage

# Linting and formatting
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues
pnpm format            # Format with Prettier
pnpm format:check      # Check formatting
```

## Architecture

This is a meme token launcher bot that monitors X (Twitter) accounts and automatically deploys tokens on Solana (pump.fun) and BSC (Flap) based on tweet content.

### Flow

1. `main.ts` - Entry point that orchestrates the token creation pipeline
2. `XMonitor` fetches latest tweets from target accounts (configured in `config.yaml`)
3. `AIService` uses Groq (llama-3.3-70b) to extract token name/symbol from tweet text
4. Tokens are deployed in parallel on both chains:
   - `PumpFunService` - Solana via pumpdotfun-repumped-sdk
   - `FlapService` - BSC via direct contract calls (viem)
5. `ImageService` handles IPFS uploads via Pinata for token metadata

### Key Services

- **src/services/x/** - Twitter API v2 integration (polling mode active, streaming commented out)
- **src/services/ai/** - Groq LLM for generating token metadata from tweets
- **src/services/pumpfun/** - Solana pump.fun token creation
- **src/services/flap/** - BSC Flap portal integration with vanity address generation (8888 suffix)
- **src/services/image.ts** - Image handling and IPFS (Pinata) uploads, including video frame extraction

### Configuration

- **config.yaml** - Runtime config: target users, initial buy amounts, AI temperature
- **src/config/env.ts** - Environment variables (X_BEARER_TOKEN, GROQ_API_KEY, wallet keys, RPC URLs)

### Multi-chain Token Deployment

Both services create tokens with initial buys to establish liquidity. The Flap service generates CREATE2 vanity salts for non-tax tokens (addresses ending in 8888).
