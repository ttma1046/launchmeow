import { describe, it, expect, beforeAll } from 'vitest';
import { PumpFunService } from './pumpfun';

describe('PumpFunService', () => {
  let pumpFun: PumpFunService;

  beforeAll(() => {
    pumpFun = new PumpFunService();
  });

  it('should initialize the service', () => {
    expect(pumpFun).toBeDefined();
  });

  it('should get wallet balance', async () => {
    const balance = await pumpFun.getBalance();
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  // Note: This test requires SOL balance and should only be run manually
  it.skip('should create a token on pump.fun', async () => {
    const mintAddress = await pumpFun.createToken({
      name: 'Test Token',
      symbol: 'TEST',
      description: 'A test token created via the bot',
      imageUrl: 'https://via.placeholder.com/512',
      twitter: 'https://x.com/test',
    });

    expect(mintAddress).toBeTruthy();
    console.log('Created token:', mintAddress);
  }, 60000); // 60 second timeout
});
