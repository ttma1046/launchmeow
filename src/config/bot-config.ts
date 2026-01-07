import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

export interface BotConfig {
  target_users: string[];
  initial_buy: {
    solana: number;
    bsc: number;
  };
  token: {
    auto_sell_pumpfun: boolean;
  };
  ai: {
    temperature: number;
  };
}

let cachedConfig: BotConfig | null = null;

export function loadConfig(): BotConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'config.yaml');

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at: ${configPath}`);
  }

  const fileContents = fs.readFileSync(configPath, 'utf8');
  cachedConfig = yaml.load(fileContents) as BotConfig;

  console.log('📋 Loaded configuration:');
  console.log(`   👥 Target users: ${cachedConfig.target_users.join(', ')}`);
  console.log(
    `   💰 Initial buy - SOL: ${cachedConfig.initial_buy.solana}, BNB: ${cachedConfig.initial_buy.bsc}`
  );
  console.log(`   🤖 Auto-sell PumpFun: ${cachedConfig.token.auto_sell_pumpfun}`);

  return cachedConfig;
}

export function getConfig(): BotConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}
