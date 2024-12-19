import { existsSync, readFileSync, writeFileSync } from "fs";
import { AbstractRenderableImage, DrawMode, Type } from "./AbstractRenderableImage";
import { CanvasRenderingContext2D, Image } from "canvas";
import sharp from "sharp";
import { GifReader } from "omggif";
import { PNG } from "pngjs";
import { createHash } from "crypto";

export class AnimatedRenderableImage extends AbstractRenderableImage {
  private _totalLength: number = 0;
  private _frames: AnimationFrame[] = [];
  private _loading = false;

  public get type(): Type {
    return Type.Animated;
  }

  public async loadImage(imageSource: string) {
    this._totalLength = 0;
    this._frames = [];

    if (!existsSync(imageSource)) {
      throw new Error("Image source file not found");
    }

    const maxScale = this.protogen.visor.scale;
    const buffer = readFileSync(imageSource);

    const digest = createHash('sha256');
    digest.update(buffer);
    const hash = digest.digest('hex');

    const cacheFile = this.protogen.config.dataDirectory + "/animcache/" + hash + ".json";
    if (!existsSync(cacheFile)) {
      this._loading = true;
      const cache: AnimationCacheEntry[] = [];

      const reader = new GifReader(buffer);

      const frames = reader.numFrames();
      const width = reader.width;
      const height = reader.height;

      // Buffer to store the "current full frame"
      const fullFrame = Buffer.alloc(width * height * 4, 0); // Initialize full frame with black
      let frameTimer = 0;
      for (let i = 0; i < frames; i++) {
        const currentFrame = Buffer.alloc(width * height * 4);
        reader.decodeAndBlitFrameRGBA(i, currentFrame);

        const info = reader.frameInfo(i);
        const delay = info.delay * 10; // convert to ms

        this._totalLength += delay;

        // Combine the partial frame with the previous full frame
        for (let j = 0; j < currentFrame.length; j += 4) {
          if (currentFrame[j + 3] > 0) { // Check if pixel is not fully transparent
            fullFrame[j] = currentFrame[j];     // R
            fullFrame[j + 1] = currentFrame[j + 1]; // G
            fullFrame[j + 2] = currentFrame[j + 2]; // B
            fullFrame[j + 3] = currentFrame[j + 3]; // A
          }
        }

        // Create a PNG instance for the full frame
        const png = new PNG({ width, height });
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4; // RGBA index
            png.data[idx] = fullFrame[idx];       // R
            png.data[idx + 1] = fullFrame[idx + 1]; // G
            png.data[idx + 2] = fullFrame[idx + 2]; // B
            png.data[idx + 3] = fullFrame[idx + 3]; // A
          }
        }

        const resized = await sharp(PNG.sync.write(png))
          .resize({
            width: maxScale.width,
            height: maxScale.height,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png()
          .toBuffer();

        const image = new Image();
        image.src = resized;

        const flippedBuffer = await sharp(resized)
          .flop()
          .png()
          .toBuffer();

        const invertedImage = new Image();
        invertedImage.src = flippedBuffer;

        this.frames.push({
          image: image,
          invertedImage: invertedImage,
          delay: delay,
          startAt: frameTimer,
        });

        cache.push({
          delay: delay,
          startAt: frameTimer,
          image: resized.toString("base64"),
          invertedImage: flippedBuffer.toString("base64"),
        });

        frameTimer += delay;
      }

      writeFileSync(cacheFile, JSON.stringify(cache));

      this._loading = false;
    } else {
      this._loading = true;
      const textContent = readFileSync(cacheFile).toString();
      const cached = JSON.parse(textContent) as AnimationCacheEntry[];
      cached.forEach(frame => {
        this._totalLength += frame.delay;

        const image = new Image();
        const invertedImage = new Image();

        image.src = "data:image/png;base64," + frame.image;
        invertedImage.src = "data:image/png;base64," + frame.invertedImage;

        this.frames.push({
          delay: frame.delay,
          startAt: frame.startAt,
          image: image,
          invertedImage: invertedImage,
        });
      });
      this._loading = false;
    }
  }

  get totalLength() {
    return this._totalLength;
  }

  get frames() {
    return this._frames;
  }

  public draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, mode: DrawMode, time: number): void {
    if (this.frames.length == 0 || this.totalLength == 0) {
      ctx.fillStyle = "#FF00FF";
      ctx.fillRect(x, y, width, height);
      return;
    }

    if (this._loading) {
      ctx.fillStyle = "#4D4D4D";
      ctx.fillRect(x, y, width, height);
      return;
    }

    const animationTime = time % this.totalLength;
    const frame = this.frames.find(frame => frame.startAt >= animationTime || frame.startAt + frame.delay >= animationTime);
    if (frame == null) {
      this.protogen.logger.warn("AnimatedRenderableImage", "Got null when trying to read frame at " + animationTime + "ms");
      return;
    }

    const image = mode == DrawMode.Inverted ? frame.invertedImage : frame.image;

    ctx.drawImage(image, x, y, width, height);
  }
}

interface AnimationFrame {
  image: Image;
  invertedImage: Image;
  delay: number;
  startAt: number;
}

interface AnimationCacheEntry {
  image: string;
  invertedImage: string;
  delay: number;
  startAt: number;
}