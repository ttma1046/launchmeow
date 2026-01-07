import Groq from 'groq-sdk';
import { ENV } from '../../config/env';

export class AIService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: ENV.AI.GROQ_KEY });
  }

  /**
   * PROCESS TWEET (The "Brain")
   * Goal: Extract a Ticker (3-5 letters) and a Name (1-2 words) in <200ms
   */
  async generateTokenMetadata(
    tweetText: string,
    author: string
  ): Promise<{ name: string; symbol: string; keyword: string } | null> {
    console.log(`🧠 Processing tweet via Groq: "${tweetText.substring(0, 30)}..."`);

    // Detect if tweet contains Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(tweetText);

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `
                        You are a meme token creator AI. Analyze tweets and create viral token concepts by identifying the MAIN FOCUS.
                        
                        CRITICAL ANALYSIS RULES:
                        1. **Identify the Main Topic**: What is the tweet REALLY about?
                           - Look at emojis 🎤🚀💎 - they often represent the main subject
                           - For Chinese text, understand the context and cultural meaning
                           - Don't just pick the first words - find what the tweet emphasizes
                           - Visual elements (emojis, images mentioned) often carry the core message
                        
                        2. **Symbol (Ticker)**: 2-4 characters
                           ${
                             hasChinese
                               ? `- For CHINESE tweets: Use 2-4 CHINESE characters
                           - Should be catchy and related to main concept
                           - Examples: "话筒" (microphone), "登月" (moon), "钻石" (diamond)`
                               : `- For English tweets: 3-5 uppercase letters
                           - Use relevant English words (🎤 → "MIC", 🚀 → "MOON", 💎 → "DIAM")
                           - Create memorable acronym from key phrase`
                           }
                           - Must be catchy and meme-worthy
                        
                        3. **Name**: 1-3 words that represent the main concept
                           ${
                             hasChinese
                               ? `- For CHINESE tweets: Keep the name in CHINESE characters (original language)
                           - Extract the most catchy/meme-worthy phrase directly from the tweet
                           - If emoji is central, use Chinese translation of the emoji concept`
                               : `- For English tweets: use English name
                           - Extract exact key phrase from tweet
                           - For emoji-focused: use English name of the emoji/concept`
                           }
                           - Examples: 
                             * Chinese + 🎤: "小话筒" or "麦克风"
                             * English + 🚀: "To The Moon"
                        
                        4. **Keyword**: Single most powerful word representing the core concept
                           ${
                             hasChinese
                               ? '- For CHINESE tweets: Keep keyword in CHINESE'
                               : '- For English tweets: Keep keyword in English'
                           }
                           - If emoji is central: use appropriate language name
                           - Should have viral/meme potential
                        
                        EXAMPLES:
                        - Chinese Tweet: "我踏马还拿个🎤？😂" → {"name": "小话筒", "symbol": "话筒", "keyword": "话筒"}
                        - English Tweet: "Going to the moon! 🚀" → {"name": "To The Moon", "symbol": "MOON", "keyword": "moon"}
                        
                        OUTPUT STRICT JSON ONLY:
                        {"name": "...", "symbol": "...", "keyword": "..."}
                        `,
          },
          {
            role: 'user',
            content: `Tweet by ${author}: ${tweetText}`,
          },
        ],
        model: 'llama-3.3-70b-versatile', // Updated to current model
        temperature: 0.7, // Slight creativity allowed
        response_format: { type: 'json_object' }, // FORCE JSON (Critical for speed)
        max_tokens: 50, // Cut off early to save ms
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      // Parse immediately
      const result = JSON.parse(content);
      console.log(`⚡ AI GENERATED: $${result.symbol} ("${result.name}")`);
      return {
        name: hasChinese ? result.name : result.name.toUpperCase(),
        symbol: hasChinese ? result.symbol : result.symbol.toUpperCase(),
        keyword: result.keyword,
      };
    } catch (error) {
      console.error('❌ AI Generation Failed:', error);
      return null;
    }
  }
}
