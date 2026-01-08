import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XMonitor } from './x';

// Create mock functions
const mockUserByUsername = vi.fn();
const mockTimeline = vi.fn();

// Mock the twitter-api-v2 library
vi.mock('twitter-api-v2', () => {
  const TwitterApi = vi.fn(function (this: any) {
    this.v2 = {
      userByUsername: mockUserByUsername,
      userTimeline: mockTimeline,
    };
  });

  return { TwitterApi };
});

describe('XMonitor', () => {
  let xMonitor: XMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    xMonitor = new XMonitor();
  });

  describe('init', () => {
    it('should initialize successfully', async () => {
      // Act
      await xMonitor.init();

      // Assert - Just verify it completes without error
      expect(true).toBe(true);
    });

    it('should handle initialization multiple times', async () => {
      // Act
      await xMonitor.init();
      await xMonitor.init();

      // Assert
      expect(true).toBe(true);
    });
  });

  describe('startMonitoring', () => {
    beforeEach(async () => {
      await xMonitor.init();
    });

    it('should fetch and process new tweets', async () => {
      // Arrange
      const callback = vi.fn().mockResolvedValue(undefined);

      mockUserByUsername.mockResolvedValue({
        data: { id: '123', username: 'launchmeow' },
      });

      mockTimeline.mockResolvedValue({
        data: {
          data: [
            {
              id: '1',
              text: 'First tweet',
              created_at: new Date().toISOString(),
            },
          ],
        },
        includes: {},
      });

      // Act
      await xMonitor.startMonitoring(callback);

      // Assert
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetText: 'First tweet',
          user: 'launchmeow',
          tweetUrl: 'https://x.com/launchmeow/status/1',
        })
      );
    });

    it('should handle empty timeline gracefully', async () => {
      // Arrange
      const callback = vi.fn().mockResolvedValue(undefined);

      mockUserByUsername.mockResolvedValue({
        data: { id: '123', username: 'launchmeow' },
      });

      mockTimeline.mockResolvedValue({
        data: { data: [] },
        includes: {},
      });

      // Act
      await xMonitor.startMonitoring(callback);

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should extract image URLs from tweets', async () => {
      // Arrange
      const callback = vi.fn().mockResolvedValue(undefined);

      mockUserByUsername.mockResolvedValue({
        data: { id: '123', username: 'launchmeow' },
      });

      mockTimeline.mockResolvedValue({
        data: {
          data: [
            {
              id: '1',
              text: 'Tweet with image',
              created_at: new Date().toISOString(),
              attachments: { media_keys: ['media1'] },
            },
          ],
        },
        includes: {
          media: [
            {
              media_key: 'media1',
              type: 'photo',
              url: 'https://pbs.twimg.com/media/test.jpg',
            },
          ],
        },
      });

      // Act
      await xMonitor.startMonitoring(callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://pbs.twimg.com/media/test.jpg',
        })
      );
    });

    it('should handle rate limit errors gracefully', async () => {
      // Arrange
      const callback = vi.fn().mockResolvedValue(undefined);

      mockUserByUsername.mockResolvedValue({
        data: { id: '123', username: 'launchmeow' },
      });

      mockTimeline.mockRejectedValue({
        code: 429,
        message: 'Rate limit',
      });

      // Act
      await xMonitor.startMonitoring(callback);

      // Assert - Should not throw, should not call callback
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      // Arrange
      const callback = vi.fn().mockResolvedValue(undefined);

      mockUserByUsername.mockResolvedValue({
        data: null,
      });

      // Act
      await xMonitor.startMonitoring(callback);

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle API credits depleted gracefully', async () => {
      // Arrange
      const callback = vi.fn().mockResolvedValue(undefined);

      mockUserByUsername.mockResolvedValue({
        data: { id: '123', username: 'launchmeow' },
      });

      mockTimeline.mockRejectedValue({
        code: 402,
        data: { title: 'CreditsDepleted' },
      });

      // Act
      await xMonitor.startMonitoring(callback);

      // Assert - Should not call callback when credits depleted
      expect(callback).not.toHaveBeenCalled();
    });

    it('should process callbacks independently', async () => {
      // Arrange
      let callbackResolve: () => void;
      const callbackPromise = new Promise<void>((resolve) => {
        callbackResolve = resolve;
      });

      const callback = vi.fn().mockImplementation(() => callbackPromise);

      mockUserByUsername.mockResolvedValue({
        data: { id: '123', username: 'launchmeow' },
      });

      mockTimeline.mockResolvedValue({
        data: {
          data: [
            {
              id: '1',
              text: 'Test tweet',
              created_at: new Date().toISOString(),
            },
          ],
        },
        includes: {},
      });

      // Act
      const monitoringPromise = xMonitor.startMonitoring(callback);

      // Assert - Callback should be called but monitoring should wait
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();

      // Resolve callback
      callbackResolve!();
      await monitoringPromise;
    });
  });
});
