import { describe, it, expect, beforeEach } from 'vitest';
import { ImageService } from './image';
import fs from 'fs';
import path from 'path';

describe('ImageService', () => {
  let imageService: ImageService;
  const testImagePath = path.join(process.cwd(), 'assets', 'token-images', 'test-image.png');

  beforeEach(() => {
    imageService = new ImageService();
  });

  it('should initialize without errors', () => {
    expect(imageService).toBeDefined();
    expect(imageService.getImageCount()).toBeGreaterThanOrEqual(0);
  });

  it('should return null when no images are available', () => {
    const images = imageService.getAllImages();
    if (images.length === 0) {
      const randomImage = imageService.getRandomImage();
      expect(randomImage).toBeNull();
    }
  });

  it('should get a random image if images exist', () => {
    const images = imageService.getAllImages();
    if (images.length > 0) {
      const randomImage = imageService.getRandomImage();
      expect(randomImage).not.toBeNull();
      expect(randomImage?.fileName).toBeDefined();
      expect(randomImage?.buffer).toBeInstanceOf(Buffer);
    }
  });

  it('should list all available images', () => {
    const images = imageService.getAllImages();
    expect(Array.isArray(images)).toBe(true);
  });
});
