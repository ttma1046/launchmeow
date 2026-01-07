import { TwitterApi } from 'twitter-api-v2';
import { ENV } from '../../config/env';
import { getConfig } from '../../config/bot-config';

export class XMonitor {
  private client: TwitterApi;
  private targetUsers: string[];

  constructor() {
    // Use Bearer Token for app-only authentication
    this.client = new TwitterApi(ENV.X.BEARER_TOKEN);

    // Load target users from config
    const config = getConfig();
    this.targetUsers = config.target_users;
  }

  async init() {
    console.log('🔐 Initializing X API v2...');
    console.log(`📋 Target accounts: ${this.targetUsers.join(', ')}`);
    console.log('✅ X API ready');
  }

  // ========================================
  // FILTERED STREAM (COMMENTED OUT)
  // Real-time streaming using X API v2 Filtered Stream
  // Docs: https://docs.x.com/x-api/posts/filtered-stream/introduction
  // ========================================

  /*
  async setupStreamRules() {
    console.log('🔧 Setting up stream rules...');
    
    try {
      // Get existing rules
      const rules = await this.client.v2.streamRules();
      
      // Delete existing rules if any
      if (rules.data?.length) {
        const ruleIds = rules.data.map(rule => rule.id);
        await this.client.v2.updateStreamRules({
          delete: { ids: ruleIds }
        });
        console.log(`🗑️  Deleted ${ruleIds.length} existing rules`);
      }

      // Create new rules for target users
      const newRules = this.targetUsers.map(username => ({
        value: `from:${username} -is:retweet -is:reply`,
        tag: username
      }));

      const result = await this.client.v2.updateStreamRules({
        add: newRules
      });

      console.log(`✅ Added ${result.data?.length || 0} stream rules`);
      return result;
    } catch (error) {
      console.error('❌ Error setting up stream rules:', error);
      throw error;
    }
  }

  async startStream(
    callback: (tweet: {
      tweetText: string;
      user: string;
      tweetUrl?: string;
      imageUrl?: string;
      isVideo?: boolean;
    }) => Promise<void>
  ) {
    console.log('🌊 Starting filtered stream...');

    try {
      // Setup rules first
      await this.setupStreamRules();

      // Connect to stream with expansions for media
      const stream = await this.client.v2.searchStream({
        'tweet.fields': ['created_at', 'author_id', 'attachments'],
        'expansions': ['author_id', 'attachments.media_keys'],
        'user.fields': ['username'],
        'media.fields': ['url', 'preview_image_url', 'type']
      });

      console.log('✅ Stream connected, listening for tweets...');

      // Process tweets from stream
      for await (const data of stream) {
        try {
          if (!data.data) continue;

          const tweet = data.data;
          const author = data.includes?.users?.[0];
          const username = author?.username || 'unknown';

          // Construct tweet URL
          const tweetUrl = `https://x.com/${username}/status/${tweet.id}`;

          // Extract media if available
          let imageUrl: string | undefined;
          let isVideo = false;
          if (data.includes?.media && data.includes.media.length > 0) {
            const media = data.includes.media[0];
            if (media.type === 'photo' && 'url' in media) {
              imageUrl = media.url;
              console.log(`📷 Found image: ${imageUrl}`);
            } else if (media.type === 'video' && 'preview_image_url' in media) {
              imageUrl = media.preview_image_url;
              isVideo = true;
              console.log(`🎬 Found video, will extract first frame`);
            } else if (media.type === 'animated_gif' && 'preview_image_url' in media) {
              imageUrl = media.preview_image_url;
              isVideo = true;
              console.log(`🎞️ Found animated GIF, will extract first frame`);
            }
          }

          console.log(`\n📨 New tweet from @${username}`);
          console.log(`   ${tweet.text.substring(0, 100)}...`);

          // Process tweet
          await callback({
            tweetText: tweet.text,
            user: username,
            tweetUrl,
            imageUrl,
            isVideo
          });
        } catch (error) {
          console.error('❌ Error processing stream tweet:', error);
        }
      }
    } catch (error: unknown) {
      const err = error as { code?: number; data?: { title?: string } };
      if (err.code === 402 || err.data?.title === 'CreditsDepleted') {
        console.log('⚠️  Twitter API credits depleted');
        throw new Error('CREDITS_DEPLETED');
      }
      console.error('❌ Stream error:', error);
      throw error;
    }
  }
  */

  // ========================================
  // POLLING MODE (CURRENT ACTIVE METHOD)
  // ========================================

  async startMonitoring(
    callback: (tweet: {
      tweetText: string;
      user: string;
      tweetUrl?: string;
      imageUrl?: string;
      isVideo?: boolean;
    }) => Promise<void>
  ) {
    console.log('🔍 Fetching latest tweet from each target user in parallel...');

    let apiCreditsError = false;
    let processedAnyTweet = false;
    const callbackPromises: Promise<void>[] = [];

    // Fetch latest tweet from each user in parallel and process immediately
    const tweetPromises = this.targetUsers.map(async (username) => {
      try {
        console.log(`\n📡 Fetching latest tweet from @${username}...`);
        const user = await this.client.v2.userByUsername(username);

        if (!user.data) {
          console.error(`❌ User ${username} not found`);
          return;
        }

        console.log(`✅ Found user: ${user.data.username} (ID: ${user.data.id})`);

        const timeline = await this.client.v2.userTimeline(user.data.id, {
          max_results: 5,
          'tweet.fields': ['created_at'],
          expansions: ['attachments.media_keys'],
          'media.fields': ['url', 'preview_image_url', 'type'],
        });

        if (!timeline.data.data || timeline.data.data.length === 0) {
          console.log(`📭 No latest tweet found for @${username}`);
          return;
        }

        const latestTweet = timeline.data.data[0];

        // Construct tweet URL
        const tweetUrl = `https://x.com/${username}/status/${latestTweet.id}`;

        // Extract image or video URL if available
        let imageUrl: string | undefined;
        let isVideo = false;
        if (timeline.includes?.media && timeline.includes.media.length > 0) {
          const media = timeline.includes.media[0];
          if (media.type === 'photo' && 'url' in media) {
            imageUrl = media.url;
            console.log(`📷 Found image in latest tweet: ${imageUrl}`);
          } else if (media.type === 'video' && 'preview_image_url' in media) {
            // For videos, we'll use the preview image URL or video URL
            // The ImageService will detect it's a video and extract the first frame
            imageUrl = media.preview_image_url;
            isVideo = true;
            console.log(`🎬 Found video in latest tweet, will extract first frame`);
          } else if (media.type === 'animated_gif' && 'preview_image_url' in media) {
            imageUrl = media.preview_image_url;
            isVideo = true;
            console.log(`🎞️ Found animated GIF in latest tweet, will extract first frame`);
          }
        }

        console.log(`📨 Latest tweet from @${username}`);
        console.log(`   ${latestTweet.text.substring(0, 100)}...`);

        const tweet = {
          tweetText: latestTweet.text,
          user: username,
          tweetUrl,
          imageUrl,
          isVideo, // Pass video flag to the callback
        };

        // Immediately process this tweet without blocking others
        processedAnyTweet = true;
        const callbackPromise = callback(tweet); // Don't await - let it run independently
        callbackPromises.push(callbackPromise);

        return tweet;
      } catch (error: unknown) {
        const err = error as { code?: number; data?: { title?: string }; message?: string };
        if (err.code === 402 || err.data?.title === 'CreditsDepleted') {
          console.log(`⚠️  Twitter API credits depleted for @${username}`);
          apiCreditsError = true;
          return;
        }
        const errorMessage = err.message || String(error);
        console.error(`❌ Error fetching latest tweet for @${username}:`, errorMessage);
        return;
      }
    });

    // Wait for all tweets to be fetched (but not processed)
    await Promise.all(tweetPromises);

    // If API credits are depleted and no tweets were processed, use mock data
    if (apiCreditsError && !processedAnyTweet) {
      console.log('\n⚠️  Using mock data...');

      const config = getConfig();
      const mockTweet = {
        tweetText: config.mock.tweet_text,
        user: config.mock.user,
        tweetUrl: config.mock.tweet_url,
        imageUrl: undefined, // Twitter video URLs require auth - use local image for mock testing
        isVideo: false, // Will use local image; video extraction ready for real API
      };

      console.log(`\n📨 Mock tweet from @${mockTweet.user}`);
      console.log(`   ${mockTweet.tweetText.substring(0, 100)}...`);

      await callback(mockTweet);
    } else if (!processedAnyTweet) {
      console.log('📭 No latest tweets found from any target users');
    }

    // Wait for all callbacks to complete before returning
    if (callbackPromises.length > 0) {
      await Promise.all(callbackPromises);
    }
  }
}
