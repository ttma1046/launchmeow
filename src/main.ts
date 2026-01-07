import { XMonitor } from './services/x/x';
import { AIService } from './services/ai/ai';
import { FlapService } from './services/flap/flap';
import { ImageService } from './services/image';
import { PumpFunService } from './services/pumpfun/pumpfun';
import { loadConfig } from './config/bot-config';

const start = async () => {
  // 0. Load configuration
  const config = loadConfig();

  // 1. Initialize Services
  console.log('🔧 Initializing services...');
  const x = new XMonitor();
  const ai = new AIService();
  const imageService = new ImageService();
  const flap = new FlapService(imageService);
  const pumpFun = new PumpFunService();
  console.log('✅ Services initialized.');
  // 2. Login to X
  await x.init();

  // 3. Define the Action Logic (What happens when a tweet is found)
  const onTweetFound = async (tweet: {
    tweetText: string;
    user: string;
    tweetUrl?: string;
    imageUrl?: string;
  }) => {
    const { tweetText, user, tweetUrl, imageUrl } = tweet;

    // Generate token metadata
    const metadata = await ai.generateTokenMetadata(tweetText, user);

    if (metadata) {
      const token = {
        ticker: metadata.symbol,
        name: metadata.name,
        reason: metadata.keyword,
        tweetUrl: tweetUrl || 'https://x.com/cz_binance/status/2007988941472022611',
        imageUrl,
      };

      // Use tweet image if available, otherwise get a random local image
      let imageToUse: string | undefined;

      if (token.imageUrl) {
        console.log(`\n📷 Using image from tweet: ${token.imageUrl}`);
        imageToUse = token.imageUrl;
      } else {
        const tokenImage = imageService.getRandomImage();
        if (tokenImage) {
          console.log(`\n🎨 Using local image: ${tokenImage.fileName}`);
          imageToUse = tokenImage.path;
        }
      }

      // Launch on both chains in parallel
      console.log('\n🚀 Deploying on Solana & BSC...');

      const [pumpMintAddress, flapResult] = await Promise.all([
        // Launch on pump.fun (Solana)
        pumpFun.createToken({
          name: token.name,
          symbol: token.ticker,
          description: `${token.name} - ${token.reason}`,
          imageFile: token.imageUrl ? undefined : imageToUse, // Use imageFile for local files
          imageUrl: token.imageUrl, // Use imageUrl for remote URLs
          twitter: token.tweetUrl,
        }),
        // Launch on BSC via Flap (with bonding curve)
        flap.createToken(
          token.name,
          token.ticker,
          token.imageUrl || imageToUse || '',
          token.tweetUrl, // Tweet URL for metadata
          `${token.name} - ${token.reason}`, // Description
          config.initial_buy.bsc.toString() // Initial buy amount from config
        ),
      ]);

      // Handle Solana results
      if (pumpMintAddress) {
        console.log(`\n✅ Token launched on pump.fun (Solana)!`);
        console.log(`   📄 Mint Address: ${pumpMintAddress}`);
        console.log(`   🔗 Pump.fun: https://pump.fun/${pumpMintAddress}`);
        console.log(`   🔗 Solscan: https://solscan.io/token/${pumpMintAddress}`);
        console.log(`   🐦 Tweet Reference: ${token.tweetUrl}`);

        // NOTE: Auto-sell removed to maintain token liquidity and price stability
        // Users can manually sell tokens through pump.fun interface if needed
      }

      // Handle BSC/Flap results
      if (flapResult) {
        const { tokenAddress, txHash } = flapResult;
        console.log(`\n✅ Token launched on Flap (BSC)!`);
        console.log(`   📄 Token Address: ${tokenAddress}`);
        console.log(`   🦋 Flap: https://flap.sh/bsc/${tokenAddress}`);
        console.log(`   🔗 BSCScan: https://bscscan.com/address/${tokenAddress}`);
        console.log(`   🔗 TX: https://bscscan.com/tx/${txHash}`);
        console.log(`   🐦 Tweet Reference: ${token.tweetUrl}`);

        // NOTE: Flap has disabled the sell() function (FeatureDisabled error)
        // Auto-sell is not supported - users must sell through Flap's website
      }
    }
  };

  // 4. Fetch latest tweet and create token (runs once, then exits)
  console.log('👀 Fetching latest tweet...');
  await x.startMonitoring(onTweetFound);
  console.log('✅ Done!');

  // Exit cleanly after processing
  process.exit(0);
};

// Prevent crashes but log them
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection:', reason);
});

start();
