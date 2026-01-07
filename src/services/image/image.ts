import fs from 'fs';
import path from 'path';
import { PinataSDK } from 'pinata';
import { ENV } from '../../config/env';

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
