import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Server } from "../Server";
import { createHash } from "crypto";
import { Image } from "canvas";
import { GifReader } from "omggif";
import { PNG } from "pngjs";
import sharp from "sharp";
import { cyan } from "colors";

export class GifProcessor {
  private _server;
  private _dataDirectory;

  constructor(server: Server) {
    this._server = server;
    this._dataDirectory = this.server.dataDirectory + "/gif_processor";

    if (!existsSync(this.dataDirectory)) {
      mkdirSync(this.dataDirectory);
    }
  }

  private get server() {
    return this._server;
  }

  public get dataDirectory() {
    return this._dataDirectory;
  }

  public async handleGif(file: string, maxWidth: number, maxHeight: number): Promise<AnimationCacheEntry[]> {
    const dataBuffer = readFileSync(file);

    const digest = createHash('sha256');
    digest.update(dataBuffer);
    const hash = digest.digest('hex');

    const dimStr = maxWidth + "x" + maxHeight;

    const folder = this.dataDirectory + "/" + hash.substring(0, 2);
    const cacheFile = folder + "/" + hash + "_" + dimStr + ".json";

    if (existsSync(cacheFile)) {
      console.log("Serving cached frames for gif " + cyan(hash) + " with dim " + cyan(maxWidth + "x" + maxHeight));
      const text = readFileSync(cacheFile).toString();
      return JSON.parse(text) as AnimationCacheEntry[];
    } else {
      console.log("Generating data for gif " + cyan(hash) + " with dim " + cyan(maxWidth + "x" + maxHeight));
      let totalLength = 0;
      const cache: AnimationCacheEntry[] = [];

      const reader = new GifReader(dataBuffer);

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

        totalLength += delay;

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
            width: maxWidth,
            height: maxHeight,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png()
          .toBuffer();

        const flippedBuffer = await sharp(resized)
          .flop()
          .png()
          .toBuffer();

        cache.push({
          delay: delay,
          startAt: frameTimer,
          image: resized.toString("base64"),
          invertedImage: flippedBuffer.toString("base64"),
        });

        frameTimer += delay;
      }

      if (!existsSync(folder)) {
        mkdirSync(folder);
      }
      writeFileSync(cacheFile, JSON.stringify(cache));

      return cache;
    }
  }
}

interface AnimationCacheEntry {
  image: string;
  invertedImage: string;
  delay: number;
  startAt: number;
}
