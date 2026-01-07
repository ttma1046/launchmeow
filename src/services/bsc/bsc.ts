import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  encodeAbiParameters,
} from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ENV } from '../../config/env';
import MemeTokenCompiled from './MemeToken.json';

// Use compiled contract ABI and bytecode
const ERC20_ABI = MemeTokenCompiled.abi;
const ERC20_BYTECODE = MemeTokenCompiled.bytecode as `0x${string}`;

// PancakeSwap V2 Router address on BSC
const PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`;

// PancakeSwap Router ABI (only the functions we need)
const PANCAKESWAP_ROUTER_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amountTokenDesired', type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'addLiquidityETH',
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface TokenMetadata {
  name: string;
  symbol: string;
  totalSupply?: bigint;
  lockupPercent?: number; // Percentage of tokens to lock (default: 30%)
}

// Dead address for burning/locking tokens on BSC
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;

export class BSCService {
  private account: ReturnType<typeof privateKeyToAccount>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;

  constructor() {
    // Initialize account from private key
    this.account = privateKeyToAccount(ENV.BSC.PRIVATE_KEY as `0x${string}`);

    // Create wallet client for writing transactions
    this.walletClient = createWalletClient({
      account: this.account,
      chain: bsc,
      transport: http(ENV.BSC.RPC),
    });

    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: bsc,
      transport: http(ENV.BSC.RPC),
    });
  }

  /**
   * Deploy a new ERC20 meme token on BSC
   */
  async deployToken(metadata: TokenMetadata): Promise<string | null> {
    try {
      console.log(`\n🚀 Deploying token on BSC...`);
      console.log(`   Name: ${metadata.name}`);
      console.log(`   Symbol: $${metadata.symbol}`);

      // Default total supply: 1 billion tokens with 18 decimals
      const totalSupply = metadata.totalSupply || parseEther('1000000000'); // 1B tokens
      const lockupPercent = metadata.lockupPercent || 30; // Default 30% lockup

      // Calculate locked and circulating amounts
      const lockedAmount = (totalSupply * BigInt(lockupPercent)) / BigInt(100);
      const circulatingAmount = totalSupply - lockedAmount;

      console.log(`   Total Supply: ${formatEther(totalSupply)} tokens`);
      console.log(`   🔒 Locked (${lockupPercent}%): ${formatEther(lockedAmount)} tokens`);
      console.log(
        `   💧 Circulating (${100 - lockupPercent}%): ${formatEther(circulatingAmount)} tokens`
      );

      // Check balance before deployment
      const balance = await this.publicClient.getBalance({
        address: this.account.address,
      });

      if (balance < parseEther('0.01')) {
        return null;
      }

      // Note: You need to provide actual compiled ERC20 contract bytecode
      // This is a placeholder implementation

      // Deployment would happen here with actual bytecode
      // Step 1: Deploy the contract
      const hash = await this.walletClient.deployContract({
        account: this.account,
        chain: bsc,
        abi: ERC20_ABI,
        bytecode: ERC20_BYTECODE,
        args: [metadata.name, metadata.symbol, totalSupply],
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const contractAddress = receipt.contractAddress;

      // Step 2: Lock 30% of tokens by sending to dead address
      if (!contractAddress) {
        throw new Error('Contract deployment failed: no address returned');
      }

      const lockHash = await this.walletClient.writeContract({
        account: this.account,
        address: contractAddress,
        abi: ERC20_ABI,
        chain: bsc,
        functionName: 'transfer',
        args: [DEAD_ADDRESS, lockedAmount],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: lockHash });

      return contractAddress;
    } catch {
      return null;
    }
  }

  /**
   * Get BNB balance of the wallet
   */
  async getBalance(): Promise<string> {
    try {
      const balance = await this.publicClient.getBalance({
        address: this.account.address,
      });
      return formatEther(balance);
    } catch {
      return '0';
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.account.address;
  }

  /**
   * Verify contract on BSCScan
   */
  async verifyContract(
    contractAddress: string,
    constructorArgs: { name: string; symbol: string; totalSupply: bigint }
  ): Promise<boolean> {
    if (!ENV.BSC.BSCSCAN_API_KEY) {
      console.log('⚠️  BSCScan API key not set, skipping verification');
      return false;
    }

    try {
      console.log('📝 Verifying contract on BSCScan...');

      const fs = await import('fs');
      const path = await import('path');

      // Read the source code
      const contractPath = path.join(process.cwd(), 'src/services/bsc', 'MemeToken.sol');
      const sourceCode = fs.readFileSync(contractPath, 'utf8');

      // Encode constructor arguments
      const encodedArgs = encodeAbiParameters(
        [
          { name: '_name', type: 'string' },
          { name: '_symbol', type: 'string' },
          { name: '_totalSupply', type: 'uint256' },
        ],
        [constructorArgs.name, constructorArgs.symbol, constructorArgs.totalSupply]
      ).slice(2); // Remove '0x' prefix

      // Use form data instead of URLSearchParams
      const formData = new URLSearchParams();
      formData.append('apikey', ENV.BSC.BSCSCAN_API_KEY!);
      formData.append('module', 'contract');
      formData.append('action', 'verifysourcecode');
      formData.append('contractaddress', contractAddress);
      formData.append('sourceCode', sourceCode);
      formData.append('codeformat', 'solidity-single-file');
      formData.append('contractname', 'MemeToken');
      formData.append('compilerversion', 'v0.8.33+commit.64118f21'); // Match actual compiler
      formData.append('optimizationUsed', '1');
      formData.append('runs', '200');
      formData.append('constructorArguements', encodedArgs);

      const response = await fetch('https://api.bscscan.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const data = (await response.json()) as { status: string; result: string; message?: string };

      if (data.status === '1') {
        console.log('✅ Contract verification submitted!');
        console.log(`   GUID: ${data.result}`);
        console.log('   ℹ️  Verification may take a few minutes to complete');
        return true;
      } else {
        console.log(`⚠️  Verification failed: ${data.result}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error verifying contract:', error);
      return false;
    }
  }

  /**
   * Add liquidity to PancakeSwap
   */
  async addLiquidity(
    tokenAddress: `0x${string}`,
    tokenAmount: bigint,
    bnbAmount: bigint
  ): Promise<boolean> {
    try {
      console.log('\n💧 Adding liquidity to PancakeSwap...');
      console.log(`   Token Amount: ${formatEther(tokenAmount)} tokens`);
      console.log(`   BNB Amount: ${formatEther(bnbAmount)} BNB`);

      // Step 1: Approve PancakeSwap Router to spend tokens
      console.log('📝 Approving tokens...');
      const approveHash = await this.walletClient.writeContract({
        account: this.account,
        address: tokenAddress,
        abi: ERC20_ABI,
        chain: bsc,
        functionName: 'approve',
        args: [PANCAKESWAP_ROUTER, tokenAmount],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log('✅ Tokens approved');

      // Step 2: Add liquidity (token + BNB)
      console.log('💦 Adding liquidity...');
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
      const slippage = 5; // 5% slippage tolerance
      const amountTokenMin = (tokenAmount * BigInt(100 - slippage)) / BigInt(100);
      const amountBNBMin = (bnbAmount * BigInt(100 - slippage)) / BigInt(100);

      const liquidityHash = await this.walletClient.writeContract({
        account: this.account,
        address: PANCAKESWAP_ROUTER,
        abi: PANCAKESWAP_ROUTER_ABI,
        chain: bsc,
        functionName: 'addLiquidityETH',
        args: [
          tokenAddress,
          tokenAmount,
          amountTokenMin,
          amountBNBMin,
          this.account.address,
          deadline,
        ],
        value: bnbAmount,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: liquidityHash });

      console.log('✅ Liquidity added successfully!');
      console.log(`   🔗 Transaction: https://bscscan.com/tx/${receipt.transactionHash}`);
      console.log(
        `   🥞 View on PancakeSwap: https://pancakeswap.finance/swap?outputCurrency=${tokenAddress}`
      );

      return true;
    } catch (error) {
      console.error('❌ Error adding liquidity:', error);
      return false;
    }
  }

  /**
   * Get token balance for the wallet
   */
  async getTokenBalance(tokenAddress: `0x${string}`): Promise<bigint> {
    try {
      const balance = (await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.account.address],
      })) as bigint;

      return balance;
    } catch (error) {
      console.error('❌ Error fetching token balance:', error);
      return 0n;
    }
  }

  /**
   * Sell all tokens on PancakeSwap
   */
  async sellAllTokens(tokenAddress: `0x${string}`): Promise<string | null> {
    try {
      console.log(`\n💰 Selling all tokens for ${tokenAddress}...`);

      // Get token balance
      const balance = await this.getTokenBalance(tokenAddress);

      if (balance === 0n) {
        console.log('   ⚠️  No tokens to sell');
        return null;
      }

      console.log(`   📊 Token balance: ${formatEther(balance)} tokens`);
      console.log('   ⚠️  Note: Newly deployed tokens need liquidity pool before selling');
      console.log('   ℹ️  You would need to add liquidity to PancakeSwap first to enable trading');

      // Since there's no liquidity pool, we'll just log the attempt
      // In a real scenario, you'd need to:
      // 1. Add liquidity (requires BNB)
      // 2. Wait for the pool to be created
      // 3. Then perform the swap

      console.log('   ⏭️  Skipping sell (no liquidity pool exists)');
      return null;
    } catch (error) {
      console.error('❌ Error selling tokens:', error);
      return null;
    }
  }
}
