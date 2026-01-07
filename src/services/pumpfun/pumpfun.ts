import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from '@solana/web3.js';
import { PumpFunSDK } from 'pumpdotfun-repumped-sdk';
import { AnchorProvider } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import { ENV } from '../../config/env';

export interface PumpFunTokenParams {
  name: string;
  symbol: string;
  description: string;
  imageFile?: string; // Local file path
  imageUrl?: string; // URL to fetch image from or IPFS URI
  twitter?: string;
  telegram?: string;
  website?: string;
}

export class PumpFunService {
  private connection: Connection;
  private wallet: Keypair | null = null;
  private sdk: PumpFunSDK | null = null;

  constructor() {
    this.connection = new Connection(ENV.SOLANA.RPC, 'confirmed');

    if (ENV.SOLANA.PRIVATE_KEY) {
      try {
        const privateKeyBytes = bs58.decode(ENV.SOLANA.PRIVATE_KEY);
        this.wallet = Keypair.fromSecretKey(privateKeyBytes);
        console.log('✅ Solana wallet loaded:', this.wallet.publicKey.toString());

        // Initialize community-fixed pump.fun SDK (pumpdotfun-repumped-sdk)
        const provider = new AnchorProvider(
          this.connection,
          {
            publicKey: this.wallet.publicKey,
            signTransaction: async (tx) => {
              if (tx instanceof VersionedTransaction) {
                tx.sign([this.wallet!]);
              } else {
                tx.partialSign(this.wallet!);
              }
              return tx;
            },
            signAllTransactions: async (txs) => {
              txs.forEach((tx) => {
                if (tx instanceof VersionedTransaction) {
                  tx.sign([this.wallet!]);
                } else {
                  tx.partialSign(this.wallet!);
                }
              });
              return txs;
            },
          },
          { commitment: 'confirmed' }
        );
        this.sdk = new PumpFunSDK(provider);
      } catch (error) {
        console.error('❌ Failed to load Solana wallet:', error);
      }
    } else {
      console.warn('⚠️  No Solana private key found. PumpFun service will not be available.');
    }
  }

  /**
   * Create a token on pump.fun
   */
  async createToken(params: PumpFunTokenParams): Promise<string | null> {
    if (!this.wallet || !this.sdk) {
      console.error('❌ PumpFun service not initialized. Check your SOLANA_PRIVATE_KEY_BASE58.');
      return null;
    }

    try {
      console.log(`\n🚀 Creating token on pump.fun...`);
      console.log(`   Name: ${params.name}`);
      console.log(`   Symbol: ${params.symbol}`);
      console.log(`   Description: ${params.description}`);

      // Generate new mint keypair
      const mint = Keypair.generate();

      // Get image from local file or URL
      let imageBlob: Blob;

      if (params.imageFile) {
        // Read from local file
        console.log(`   📄 Reading image from: ${params.imageFile}`);
        const fs = await import('fs');
        const imageBuffer = fs.readFileSync(params.imageFile);
        imageBlob = new Blob([imageBuffer], { type: 'image/png' });
        console.log(`   ✅ Image loaded: ${imageBlob.size} bytes`);
      } else if (params.imageUrl) {
        // Fetch from URL
        console.log(`   📄 Fetching image from: ${params.imageUrl}`);
        const imageResponse = await fetch(params.imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        imageBlob = await imageResponse.blob();
        console.log(`   ✅ Image fetched: ${imageBlob.size} bytes`);
      } else {
        throw new Error('Either imageFile or imageUrl must be provided');
      }

      console.log(`   💰 Initial buy: 0.0001 SOL`);

      // Create token metadata object
      const tokenMetadata = {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        file: imageBlob,
        twitter: params.twitter || '',
        telegram: params.telegram || '',
        website: params.website || '',
      };

      console.log(`   📤 Sending createAndBuy transaction (with 0.001 SOL buy)...`);
      // Create and buy token with initial liquidity and high slippage
      const result = await this.sdk.trade.createAndBuy(
        this.wallet,
        mint,
        tokenMetadata,
        BigInt(Math.floor(0.001 * LAMPORTS_PER_SOL)), // Initial buy for liquidity (0.001 SOL = 10x)
        1000n, // 10% slippage (1000 basis points)
        {
          unitLimit: 400000,
          unitPrice: 300000,
        }
      );
      console.log(`   ⏳ Transaction sent, waiting for confirmation...`);

      const mintAddress = mint.publicKey.toString();

      if (result.success) {
        return mintAddress;
      } else {
        console.error('❌ Token creation failed');
        console.error('   Error:', result.error);
        return null;
      }
    } catch (error: unknown) {
      console.error(
        '❌ Error creating token on pump.fun:',
        error instanceof Error ? error.message : error
      );
      if (error && typeof error === 'object' && 'logs' in error) {
        console.error('   Transaction logs:', (error as { logs: string[] }).logs);
      }
      return null;
    }
  }

  /**
   * Get token information from pump.fun
   */
  async getTokenInfo(mintAddress: string): Promise<unknown> {
    if (!this.sdk) {
      console.error('❌ PumpFun service not initialized.');
      return null;
    }

    try {
      const mint = new PublicKey(mintAddress);
      const bondingCurvePDA = this.sdk.pda.getBondingCurvePDA(mint);
      const accountInfo = await this.connection.getAccountInfo(bondingCurvePDA);
      return accountInfo;
    } catch (error: unknown) {
      console.error(
        '❌ Error fetching token info:',
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Buy tokens on pump.fun
   */
  async buyToken(mintAddress: string, solAmount: number): Promise<string | null> {
    if (!this.wallet || !this.sdk) {
      console.error('❌ PumpFun service not initialized.');
      return null;
    }

    try {
      const mint = new PublicKey(mintAddress);
      const result = await this.sdk.trade.buy(
        this.wallet,
        mint,
        BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL)),
        100n, // 1% slippage
        {
          unitLimit: 250000,
          unitPrice: 250000,
        }
      );

      if (result.success) {
        console.log(`✅ Successfully bought tokens!`);
        console.log(`   📝 Transaction: ${result.signature}`);
        return result.signature || null;
      } else {
        console.error('❌ Buy failed');
        console.error('   Error:', result.error);
        return null;
      }
    } catch (error: unknown) {
      console.error('❌ Error buying tokens:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Sell tokens on pump.fun
   */
  async sellToken(mintAddress: string, tokenAmount: bigint): Promise<string | null> {
    if (!this.wallet || !this.sdk) {
      console.error('❌ PumpFun service not initialized.');
      return null;
    }

    try {
      const mint = new PublicKey(mintAddress);
      const result = await this.sdk.trade.sell(
        this.wallet,
        mint,
        tokenAmount,
        100n, // 1% slippage
        {
          unitLimit: 250000,
          unitPrice: 250000,
        }
      );

      if (result.success) {
        console.log(`✅ Successfully sold tokens!`);
        console.log(`   📝 Transaction: ${result.signature}`);
        return result.signature || null;
      } else {
        console.error('❌ Sell failed');
        console.error('   Error:', result.error);
        return null;
      }
    } catch (error: unknown) {
      console.error('❌ Error selling tokens:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Get token balance for the wallet
   */
  async getTokenBalance(mintAddress: string): Promise<bigint> {
    if (!this.wallet) {
      return 0n;
    }

    try {
      const mint = new PublicKey(mintAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint }
      );

      if (tokenAccounts.value.length === 0) {
        return 0n;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
      return BigInt(balance);
    } catch (error) {
      console.error('❌ Error fetching token balance:', error);
      return 0n;
    }
  }

  /**
   * Sell all tokens for a given mint address
   */
  async sellAllTokens(mintAddress: string): Promise<string | null> {
    if (!this.wallet || !this.sdk) {
      console.error('❌ PumpFun service not initialized.');
      return null;
    }

    try {
      console.log(`\n💰 Selling all tokens for ${mintAddress}...`);

      // Get token balance
      const balance = await this.getTokenBalance(mintAddress);

      if (balance === 0n) {
        console.log('   ⚠️  No tokens to sell');
        return null;
      }

      console.log(`   📊 Token balance: ${balance.toString()}`);
      console.log(`   📤 Selling all tokens...`);

      const mint = new PublicKey(mintAddress);
      const result = await this.sdk.trade.sell(
        this.wallet,
        mint,
        balance,
        1000n, // 10% slippage for safety
        {
          unitLimit: 250000,
          unitPrice: 250000,
        }
      );

      if (result.success) {
        console.log(`✅ Successfully sold all tokens!`);
        console.log(`   📝 Transaction: ${result.signature}`);
        return result.signature || null;
      } else {
        console.error('❌ Sell failed');
        console.error('   Error:', result.error);
        return null;
      }
    } catch (error: unknown) {
      console.error('❌ Error selling all tokens:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    if (!this.wallet) {
      return 0;
    }

    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      return 0;
    }
  }
}
