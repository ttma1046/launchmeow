import dotenv from 'dotenv';

dotenv.config();

// Helper to ensure critical keys exist
const getEnv = (key: string, required: boolean = true): string => {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`CRITICAL ERROR: Missing ENV variable: ${key}`);
  }
  return value || '';
};

export const ENV = {
  X: {
    BEARER_TOKEN: getEnv('X_BEARER_TOKEN'),
  },
  AI: {
    GROQ_KEY: getEnv('GROQ_API_KEY'),
  },
  BSC: {
    RPC: getEnv('BSC_RPC_URL', false) || 'https://bsc-dataseed1.binance.org',
    PRIVATE_KEY: getEnv('BSC_PRIVATE_KEY_HEX'),
    BSCSCAN_API_KEY: getEnv('BSCSCAN_API_KEY', false),
  },
  PINATA: {
    JWT: getEnv('PINATA_JWT', false),
  },
  SOLANA: {
    RPC: getEnv('SOLANA_RPC_URL', false) || 'https://api.mainnet-beta.solana.com',
    PRIVATE_KEY: getEnv('SOLANA_PRIVATE_KEY_BASE58', false),
  },
};
