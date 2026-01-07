import fs from 'fs';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { PinataSDK } from 'pinata';
import { ENV } from '../config/env';
import ffmpeg from 'fluent-ffmpeg';

export interface TokenImage {
  fileName: string;
  path: string;
  buffer: Buffer;
  ipfsUrl?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  decimals: number;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export class ImageService {
  private imagesDirectory: string;
  private availableImages: string[] = [];
  private pinata: PinataSDK | null = null;

  constructor() {
    this.imagesDirectory = path.join(process.cwd(), 'assets', 'token-images');
    this.ensureDirectoryExists();
    this.loadAvailableImages();
    this.initPinata();
  }

  /**
   * Initialize Pinata client for IPFS uploads
   */
  private initPinata(): void {
    if (ENV.PINATA.JWT) {
      this.pinata = new PinataSDK({ pinataJwt: ENV.PINATA.JWT });
      console.log('📌 Pinata IPFS client initialized');
    } else {
      console.warn('⚠️  Pinata JWT not set. IPFS uploads disabled.');
    }
  }

  /**
   * Ensure the images directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.imagesDirectory)) {
      fs.mkdirSync(this.imagesDirectory, { recursive: true });
      console.log(`📁 Created images directory: ${this.imagesDirectory}`);
    }
  }

  /**
   * Load all available images from the directory
   */
  private loadAvailableImages(): void {
    try {
      const files = fs.readdirSync(this.imagesDirectory);
      this.availableImages = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

      console.log(`🖼️  Loaded ${this.availableImages.length} images from assets`);
    } catch (error) {
      console.error('❌ Error loading images:', error);
      this.availableImages = [];
    }
  }

  /**
   * Get a random image from the available images
   */
  getRandomImage(): TokenImage | null {
    if (this.availableImages.length === 0) {
      console.warn('⚠️  No images available. Add images to assets/token-images/');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.availableImages.length);
    const fileName = this.availableImages[randomIndex];
    const imagePath = path.join(this.imagesDirectory, fileName);

    try {
      const buffer = fs.readFileSync(imagePath);
      console.log(`🎨 Selected image: ${fileName}`);

      return {
        fileName,
        path: imagePath,
        buffer,
      };
    } catch (error) {
      console.error(`❌ Error reading image ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Get all available images
   */
  getAllImages(): string[] {
    return [...this.availableImages];
  }

  /**
   * Get the count of available images
   */
  getImageCount(): number {
    return this.availableImages.length;
  }

  /**
   * Refresh the list of available images
   */
  refresh(): void {
    this.loadAvailableImages();
  }

  /**
   * Save an image buffer to the assets directory
   */
  saveImage(buffer: Buffer, fileName: string): string {
    try {
      const filePath = path.join(this.imagesDirectory, fileName);
      fs.writeFileSync(filePath, buffer);
      this.loadAvailableImages(); // Refresh the list
      console.log(`✅ Saved image: ${fileName}`);
      return filePath;
    } catch (error) {
      console.error(`❌ Error saving image ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Upload image to IPFS via Pinata
   */
  async uploadToIPFS(image: TokenImage): Promise<string | null> {
    if (!this.pinata) {
      console.warn('⚠️  Pinata not initialized. Skipping IPFS upload.');
      return null;
    }

    try {
      console.log('📤 Uploading image to IPFS...');

      // Create a File object from the buffer
      const blob = new Blob([new Uint8Array(image.buffer)], {
        type: this.getMimeType(image.fileName),
      });
      const file = new File([blob], image.fileName, {
        type: this.getMimeType(image.fileName),
      });

      const upload = await this.pinata.upload.public.file(file).name(image.fileName);

      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${upload.cid}`;

      console.log(`✅ Image uploaded to IPFS: ${ipfsUrl}`);
      return ipfsUrl;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error uploading to IPFS:', message);
      return null;
    }
  }

  /**
   * Upload token metadata to IPFS
   */
  async uploadMetadata(metadata: TokenMetadata): Promise<string | null> {
    if (!this.pinata) {
      console.warn('⚠️  Pinata not initialized. Skipping metadata upload.');
      return null;
    }

    try {
      console.log('📤 Uploading metadata to IPFS...');

      const upload = await this.pinata.upload.public
        .json(metadata)
        .name(`${metadata.symbol}_metadata.json`);

      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${upload.cid}`;

      console.log(`✅ Metadata uploaded to IPFS: ${metadataUrl}`);
      return metadataUrl;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error uploading metadata:', message);
      return null;
    }
  }

  /**
   * Download image from URL and upload to IPFS
   * @param imageUrl URL of the image to download
   * @param fileName Name for the file
   * @returns IPFS CID or null
   */
  async downloadAndUploadToIPFS(imageUrl: string, fileName: string): Promise<string | null> {
    if (!this.pinata) {
      console.warn('⚠️  Pinata not initialized. Skipping IPFS upload.');
      return null;
    }

    try {
      console.log(`📥 Downloading image from ${imageUrl}...`);

      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('📤 Uploading image to IPFS...');

      // Create a File object from the buffer
      const blob = new Blob([buffer], {
        type: response.headers.get('content-type') || 'image/jpeg',
      });
      const file = new File([blob], fileName, {
        type: response.headers.get('content-type') || 'image/jpeg',
      });

      const upload = await this.pinata.upload.public.file(file).name(fileName);

      console.log(`✅ Image uploaded to IPFS with CID: ${upload.cid}`);
      return upload.cid;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error downloading/uploading to IPFS:', message);
      return null;
    }
  }

  /**
   * Extract first frame from video URL and return as image buffer
   * @param videoUrl URL of the video
   * @returns Buffer containing the first frame as JPEG
   */
  async extractVideoFrame(videoUrl: string): Promise<Buffer | null> {
    const tempVideoPath = path.join(process.cwd(), 'temp_video.mp4');
    const tempImagePath = path.join(process.cwd(), 'temp_frame.jpg');

    try {
      console.log('🎬 Downloading video...');

      // Download video
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(tempVideoPath, videoBuffer);

      console.log('📸 Extracting first frame...');

      // Extract first frame using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            count: 1,
            folder: process.cwd(),
            filename: 'temp_frame.jpg',
            timestamps: ['00:00:00.000'],
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      // Read the extracted frame
      const frameBuffer = fs.readFileSync(tempImagePath);

      // Clean up temp files
      await unlink(tempVideoPath).catch(() => {});
      await unlink(tempImagePath).catch(() => {});

      console.log('✅ Video frame extracted successfully');
      return frameBuffer;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error extracting video frame:', message);

      // Clean up temp files on error
      await unlink(tempVideoPath).catch(() => {});
      await unlink(tempImagePath).catch(() => {});

      return null;
    }
  }

  /**
   * Download image or video from URL and upload to IPFS
   * Automatically extracts first frame if URL is a video
   * @param mediaUrl URL of the image or video
   * @param fileName Name for the file
   * @returns IPFS CID or null
   */
  async downloadMediaAndUploadToIPFS(mediaUrl: string, fileName: string): Promise<string | null> {
    if (!this.pinata) {
      console.warn('⚠️  Pinata not initialized. Skipping IPFS upload.');
      return null;
    }

    try {
      let buffer: Buffer;

      // Check if it's a local file path
      const isLocalFile = !mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://');

      if (isLocalFile) {
        console.log(`📁 Reading local file from ${mediaUrl}...`);
        buffer = await readFile(mediaUrl);
      } else {
        // Check if URL is a video (simple heuristic based on common video extensions)
        const isVideo =
          /\.(mp4|mov|avi|webm|mkv|flv|m3u8)(\?|$)/i.test(mediaUrl) ||
          mediaUrl.includes('/video/') ||
          mediaUrl.includes('video_');

        if (isVideo) {
          console.log('🎬 Detected video URL, extracting first frame...');
          const frameBuffer = await this.extractVideoFrame(mediaUrl);
          if (!frameBuffer) {
            return null;
          }
          buffer = frameBuffer;
        } else {
          console.log(`📥 Downloading image from ${mediaUrl}...`);

          // Download the image
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
      }

      console.log('📤 Uploading to IPFS...');

      // Create a File object from the buffer
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'image/jpeg',
      });
      const file = new File([blob], fileName.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });

      const upload = await this.pinata.upload.public.file(file).name(file.name);

      console.log(`✅ Media uploaded to IPFS with CID: ${upload.cid}`);
      return upload.cid;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error downloading/uploading media to IPFS:', message);
      return null;
    }
  }

  /**
   * Upload Flap metadata (image + metadata JSON) to IPFS
   * Returns the metadata CID that Flap expects
   */
  async uploadFlapMetadata(
    imageUrl: string,
    name: string,
    symbol: string,
    description: string,
    twitter?: string,
    telegram?: string,
    website?: string
  ): Promise<string | null> {
    if (!this.pinata) {
      console.warn('⚠️  Pinata not initialized. Skipping IPFS upload.');
      return null;
    }

    try {
      // Step 1: Upload image/video to IPFS (will extract frame if video)
      const imageCid = await this.downloadMediaAndUploadToIPFS(imageUrl, `${symbol}_image.jpg`);
      if (!imageCid) {
        return null;
      }

      // Step 2: Create metadata JSON with image CID
      const metadata = {
        name,
        symbol,
        description,
        image: imageCid, // This is the image CID
        twitter: twitter || null,
        telegram: telegram || null,
        website: website || null,
        creator: this.pinata ? '0x0000000000000000000000000000000000000000' : null,
      };

      console.log('📤 Uploading metadata JSON to IPFS...');

      const upload = await this.pinata.upload.public.json(metadata).name(`${symbol}_metadata.json`);

      console.log(`✅ Metadata uploaded to IPFS with CID: ${upload.cid}`);
      return upload.cid;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error uploading Flap metadata:', message);
      return null;
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
