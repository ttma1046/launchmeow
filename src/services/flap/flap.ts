import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  decodeEventLog,
  type Address,
  type Hex,
  getContractAddress,
  toBytes,
  toHex,
  keccak256,
} from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ENV } from '../../config/env.js';
import { ImageService } from '../image.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Flap Portal contract address on BSC
const FLAP_PORTAL_ADDRESS = '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0' as const;
// Token implementation address for non-tax tokens (suffix 8888)
const NON_TAX_TOKEN_IMPL = '0x8B4329947e34B6d56D71A3385caC122BaDe7d78D' as const;

// Load Flap ABI
const FLAP_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'flap-abi.json'), 'utf8'));

/**
 * Generate a vanity salt for a token address ending in 8888 (non-tax token)
 * @returns The salt and predicted token address
 */
async function findVanityTokenSalt(): Promise<{ salt: Hex; address: Address }> {
  const suffix = '8888'; // Non-tax tokens must end in 8888

  // Predict the vanity token address based on the salt
  const predictVanityTokenAddress = (salt: Hex): Address => {
    const bytecode = ('0x3d602d80600a3d3981f3363d3d373d3d3d363d73' +
      NON_TAX_TOKEN_IMPL.slice(2).toLowerCase() +
      '5af43d82803e903d91602b57fd5bf3') as Hex;

    return getContractAddress({
      from: FLAP_PORTAL_ADDRESS as Address,
      salt: toBytes(salt),
      bytecode,
      opcode: 'CREATE2',
    });
  };

  // Generate a random seed and hash until we find a vanity address
  const seed = `0x${crypto.randomBytes(32).toString('hex')}` as Hex;
  let salt = keccak256(toHex(seed));
  let iterations = 0;

  while (!predictVanityTokenAddress(salt).toLowerCase().endsWith(suffix)) {
    salt = keccak256(salt);
    iterations++;
  }

  console.log(`🔍 Found vanity address after ${iterations} iterations`);

  return {
    salt,
    address: predictVanityTokenAddress(salt),
  };
}

export class FlapService {
  private account;
  private publicClient;
  private walletClient;
  private imageService: ImageService;

  constructor(imageService: ImageService) {
    this.account = privateKeyToAccount(ENV.BSC.PRIVATE_KEY as `0x${string}`);
    this.imageService = imageService;

    this.publicClient = createPublicClient({
      chain: bsc,
      transport: http(ENV.BSC.RPC),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: bsc,
      transport: http(ENV.BSC.RPC),
    });
  }

  /**
   * Create a new meme token on BSC via Flap
   * @param name Token name
   * @param symbol Token symbol
   * @param imageUrl Token image URL
   * @param tweetUrl Tweet URL (for metadata)
   * @param description Token description
   * @param initialBuyAmount Initial buy amount in BNB
   * @returns Token address and transaction hash
   */
  async createToken(
    name: string,
    symbol: string,
    imageUrl: string,
    tweetUrl?: string,
    description?: string,
    initialBuyAmount: string = '0.0001'
  ): Promise<{ tokenAddress: Address; txHash: string }> {
    console.log('\n🦋 Creating token on Flap (BSC)...');
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Initial buy: ${initialBuyAmount} BNB`);

    const quoteAmount = parseEther(initialBuyAmount);

    // Upload image and metadata to IPFS
    console.log('📦 Preparing IPFS metadata...');
    const metadataCid = await this.imageService.uploadFlapMetadata(
      imageUrl,
      name,
      symbol,
      description || `${name} - Inspired by trending topics`,
      tweetUrl, // twitter
      undefined, // telegram
      undefined // website
    );

    if (!metadataCid) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    console.log(`✅ Metadata CID: ${metadataCid}`);

    // Generate vanity salt for token address ending in 8888
    console.log('🎲 Generating vanity salt...');
    const { salt, address: predictedAddress } = await findVanityTokenSalt();
    console.log(`📍 Predicted token address: ${predictedAddress}`);

    // Prepare NewTokenV5Params
    const params = {
      name,
      symbol,
      meta: metadataCid, // IPFS CID of the metadata JSON
      dexThresh: 1, // FOUR_FIFTHS = 80% supply threshold
      salt,
      taxRate: 0, // No tax
      migratorType: 0, // V3_MIGRATOR
      quoteToken: '0x0000000000000000000000000000000000000000' as Address, // Native BNB
      quoteAmt: quoteAmount,
      beneficiary: this.account.address,
      permitData: '0x' as `0x${string}`,
      extensionID:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      extensionData: '0x' as `0x${string}`,
      dexId: 0, // DEX0 = PancakeSwap on BSC
      lpFeeProfile: 0, // LP_FEE_PROFILE_STANDARD
      // Tax V2 parameters (unused since taxRate = 0)
      taxDuration: BigInt(0),
      antiFarmerDuration: BigInt(0),
      mktBps: 0,
      deflationBps: 0,
      dividendBps: 0,
      lpBps: 0,
      minimumShareBalance: BigInt(0),
    };

    console.log('📝 Calling newTokenV5...');
    const hash = await this.walletClient.writeContract({
      address: FLAP_PORTAL_ADDRESS,
      abi: FLAP_ABI,
      functionName: 'newTokenV5',
      args: [params],
      value: quoteAmount,
    });

    console.log(`⏳ Waiting for transaction confirmation...`);
    console.log(`   TX: https://bscscan.com/tx/${hash}`);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Parse logs to find TokenCreated event and get token address
    let tokenAddress: Address = '0x0000000000000000000000000000000000000000';

    // Find the TokenCreated event
    for (const log of receipt.logs) {
      try {
        if (log.topics[0]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded: any = decodeEventLog({
            abi: FLAP_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'TokenCreated') {
            tokenAddress = decoded.args.token;
            break;
          }
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }

    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Token address not found in transaction logs');
    }

    console.log('✅ Token created on Flap!');
    console.log(`   Token: ${tokenAddress}`);
    console.log(`   TX: https://bscscan.com/tx/${hash}`);

    return {
      tokenAddress,
      txHash: hash,
    };
  }

  /**
   * Buy tokens from bonding curve
   */
  async buyTokens(tokenAddress: Address, bnbAmount: string): Promise<string> {
    console.log(`\n💰 Buying ${bnbAmount} BNB worth of tokens...`);

    const value = parseEther(bnbAmount);

    const hash = await this.walletClient.writeContract({
      address: FLAP_PORTAL_ADDRESS,
      abi: FLAP_ABI,
      functionName: 'buy',
      args: [tokenAddress, this.account.address, BigInt(0)], // minAmount = 0 for simplicity
      value,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Buy completed: https://bscscan.com/tx/${hash}`);
    return hash;
  }

  /**
   * Sell tokens to bonding curve
   */
  async sellTokens(tokenAddress: Address, amount: bigint): Promise<string> {
    console.log(`\n💸 Selling ${amount.toString()} tokens...`);

    // First approve the portal to spend tokens
    const ERC20_ABI = [
      {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
    ] as const;

    console.log('📝 Approving portal to spend tokens...');
    const approveHash = await this.walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [FLAP_PORTAL_ADDRESS, amount],
    });

    await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('✅ Approval confirmed');

    console.log('📝 Selling tokens...');
    const hash = await this.walletClient.writeContract({
      address: FLAP_PORTAL_ADDRESS,
      abi: FLAP_ABI,
      functionName: 'sell',
      args: [tokenAddress, amount, BigInt(0)], // minEth = 0 for simplicity
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Sell completed: https://bscscan.com/tx/${hash}`);
    return hash;
  }

  /**
   * Get token balance for wallet
   */
  async getTokenBalance(tokenAddress: Address): Promise<bigint> {
    const ERC20_ABI = [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const balance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.account.address],
    });

    return balance;
  }

  /**
   * Sell all tokens owned by wallet
   */
  async sellAllTokens(tokenAddress: Address): Promise<void> {
    console.log('\n🔄 Checking token balance for auto-sell...');

    const balance = await this.getTokenBalance(tokenAddress);

    if (balance === BigInt(0)) {
      console.log('⚠️  No tokens to sell');
      return;
    }

    console.log(`💰 Balance: ${balance.toString()} tokens`);
    console.log('💸 Selling all tokens via Flap bonding curve...');

    await this.sellTokens(tokenAddress, balance);

    console.log('✅ All tokens sold successfully!');
  }
}
