import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './ai';

// Mock the Groq SDK
vi.mock('groq-sdk', () => {
  const Groq = vi.fn(function (this: any) {
    this.chat = {
      completions: {
        create: vi.fn(),
      },
    };
  });

  return { default: Groq };
});

describe('AIService', () => {
  let aiService: AIService;
  let mockCreate: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a fresh instance
    aiService = new AIService();

    // Get reference to the mocked create function
    mockCreate = (aiService as any).groq.chat.completions.create;
  });

  describe('generateTokenMetadata', () => {
    it('should generate token metadata from tweet text', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'Crypto Revolution',
                symbol: 'CREV',
                keyword: 'Revolution',
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.generateTokenMetadata(
        'The crypto revolution is here!',
        'testuser'
      );

      // Assert
      expect(result).toEqual({
        name: 'CRYPTO REVOLUTION',
        symbol: 'CREV',
        keyword: 'Revolution',
      });
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('should handle tweets with complex themes', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'To The Moon',
                symbol: 'MOON',
                keyword: 'Moon',
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.generateTokenMetadata(
        'Bitcoin going to the moon! 🚀',
        'crypto_expert'
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('MOON');
      expect(result?.name).toBe('TO THE MOON');
      expect(result?.keyword).toBe('Moon');
    });

    it('should return null when API returns no content', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.generateTokenMetadata('Some tweet text', 'user');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockCreate.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await aiService.generateTokenMetadata('Test tweet', 'user');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle invalid JSON responses', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'invalid json{',
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.generateTokenMetadata('Test tweet', 'user');

      // Assert
      expect(result).toBeNull();
    });

    it('should convert name and symbol to uppercase', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'degen plays',
                symbol: 'degen',
                keyword: 'plays',
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await aiService.generateTokenMetadata('Making degen plays today', 'trader');

      // Assert
      expect(result?.name).toBe('DEGEN PLAYS');
      expect(result?.symbol).toBe('DEGEN');
    });

    it('should call Groq API with correct parameters', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'Test',
                symbol: 'TST',
                keyword: 'test',
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const tweetText = 'Test tweet text';
      const author = 'testauthor';

      // Act
      await aiService.generateTokenMetadata(tweetText, author);

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          max_tokens: 50,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(tweetText),
            }),
          ]),
        })
      );
    });
  });
});
