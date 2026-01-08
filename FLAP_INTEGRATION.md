# Flap.sh Integration for BSC

## Summary

Successfully integrated flap.sh for BSC meme token launches, replacing the previous raw token deployment. Flap provides a bonding curve mechanism similar to pump.fun, enabling instant liquidity and immediate token selling.

## Key Benefits

### Before (Raw BSC Deployment)
- ❌ No liquidity pool after deployment
- ❌ Cannot sell tokens immediately
- ❌ Must manually create liquidity pool on PancakeSwap
- ❌ Complex liquidity management

### After (Flap Integration)
- ✅ **Instant liquidity** via bonding curve
- ✅ **Can sell immediately** after token creation
- ✅ **Auto-migration to DEX** when bonding curve completes
- ✅ **Same experience as pump.fun** but on BSC

## Technical Details

### Flap Contract Information
- **Chain**: BNB Smart Chain (BSC)
- **Portal Contract**: `0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0`
- **Version**: v5.8.0
- **Standard Token Impl**: `0x8b4329947e34b6d56d71a3385cac122bade7d78d`
- **Tax Token V1**: `0x29e6383F0ce68507b5A72a53c2B118a118332aA8`
- **Tax Token V2**: `0xae562c6A05b798499507c6276C6Ed796027807BA`

### Bonding Curve Mechanics
- All tokens: **1 billion (10^9)** max supply with 18 decimals
- Equation: `(x+h)(y+r)=K`
  - `x` = base token amount in curve
  - `y` = quote token (BNB) amount
  - `r`, `h`, `K` = immutable curve parameters
- Instant buy/sell capability (no liquidity pool needed)
- Automatic DEX migration upon curve completion

### Key Functions Implemented

#### 1. `createToken()`
Creates a new token on BSC via Flap with initial buy:
```typescript
const { tokenAddress, txHash } = await flap.createToken(
  name: string,
  symbol: string, 
  imageUrl: string,
  initialBuyAmount: string = '0.0001' // in BNB
);
```

Parameters:
- `salt`: Random bytes for deterministic address
- `taxRate`: 0 (no tax)
- `name`: Token name
- `symbol`: Token symbol
- `meta`: Image URL (stored in meta field)
- `quoteAmt`: Initial buy amount in BNB
- `beneficiary`: Creator's wallet address
- All other tax/fee parameters: 0

#### 2. `buyTokens()`
Buy tokens from the bonding curve:
```typescript
await flap.buyTokens(tokenAddress, bnbAmount);
```

#### 3. `sellTokens()`
Sell tokens back to the bonding curve:
```typescript
await flap.sellTokens(tokenAddress, amount);
```

#### 4. `sellAllTokens()`
Auto-sell all tokens immediately after creation:
```typescript
await flap.sellAllTokens(tokenAddress);
```

### Event Parsing

Token address is extracted from the `FlapTokenStaged` event:
```solidity
event FlapTokenStaged(
  uint256 ts,
  address creator,
  address token  // <-- The new token address
)
```

## Implementation Changes

### Files Created
- `src/services/flap/flap.ts` - Flap service implementation
- `src/services/flap/flap-abi.json` - Full Flap contract ABI (74KB)

### Files Modified
- `src/main.ts`:
  - Replaced `BSCService` with `FlapService`
  - Updated deployment logic to use Flap's bonding curve
  - Auto-sell works immediately after token creation

### Files Unchanged (Can be removed later)
- `src/services/bsc.ts` - Old raw BSC deployment (kept for reference)

## How It Works

1. **Parallel Tweet Fetching**: Monitor all target Twitter accounts simultaneously
2. **Immediate Processing**: Each tweet triggers token creation immediately
3. **Parallel Deployment**: 
   - Solana via pump.fun (with bonding curve)
   - BSC via flap.sh (with bonding curve)
4. **Auto-Sell**:
   - Solana: Sell via pump.fun bonding curve ✅
   - BSC: ⚠️ Flap has disabled the sell() function - users must sell through Flap's website

## Testing

To test the integration:
```bash
pnpm start
```

Expected output:
- Token created on Flap (BSC)
- Token address logged
- BSCScan link provided
- Flap link provided for manual selling

## Future Enhancements

1. **Parse More Events**: Track buy/sell events for analytics
2. **Price Monitoring**: Query current token price from bonding curve
3. **Slippage Control**: Add slippage parameters for buy/sell operations
4. **Gas Optimization**: Estimate and optimize gas prices
5. **Error Handling**: Better handling of failed transactions

## Resources

- Flap Documentation: https://docs.flap.sh/flap/developers
- Flap App: https://flap.sh
- BSC Explorer: https://bscscan.com
- Contract ABI: Available in `src/services/flap/flap-abi.json`

## Notes

- Initial buy amount: **0.0001 BNB** (configurable)
- No tax/fees by default (all set to 0)
- Token image stored in `meta` field
- Bonding curve parameters are set by Flap protocol
- Auto-migration to DEX when curve completes
