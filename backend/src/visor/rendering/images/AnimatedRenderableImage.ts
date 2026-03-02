import { existsSync, readFileSync } from "fs";
import { AbstractRenderableImage, DrawMode, Type } from "./AbstractRenderableImage";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { GifReader } from "omggif";

export class AnimatedRenderableImage extends AbstractRenderableImage {
  private _totalLength: number = 0;
  private _frames: AnimationFrame[] = [];
  private _loaded = false;

  public get type(): Type {
    return Type.Animated;
  }

  public async loadImage(imageSource: string) {
    this._totalLength = 0;
    this._frames = [];
    this._loaded = false;

    this.protogen.logger.info("AnimatedImage", "Loading GIF from: " + imageSource);

    if (!existsSync(imageSource)) {
      this.protogen.logger.error("AnimatedImage", "Image source file not found: " + imageSource);
      throw new Error("Image source file not found");
    }

    try {
      const buffer = readFileSync(imageSource);
      this.protogen.logger.info("AnimatedImage", "Read " + buffer.length + " bytes from file");

      const reader = new GifReader(buffer);

      const numFrames = reader.numFrames();
      const gifWidth = reader.width;
      const gifHeight = reader.height;

      // Composite canvas accumulates frames across the animation
      const compositeCanvas = createCanvas(gifWidth, gifHeight);
      const compositeCtx = compositeCanvas.getContext('2d');

      // Used to restore previous state for disposal mode 3
      const previousCanvas = createCanvas(gifWidth, gifHeight);
      const previousCtx = previousCanvas.getContext('2d');

      let frameTimer = 0;

      for (let i = 0; i < numFrames; i++) {
        const info = reader.frameInfo(i);
        const delay = Math.max(info.delay * 10, 20); // convert to ms, min 20ms for 0-delay frames

        // Save composite state before applying this frame (needed for disposal mode 3)
        previousCtx.clearRect(0, 0, gifWidth, gifHeight);
        previousCtx.drawImage(compositeCanvas, 0, 0);

        // Decode frame RGBA pixels
        const framePixels = new Uint8Array(gifWidth * gifHeight * 4);
        reader.decodeAndBlitFrameRGBA(i, framePixels);

        // Paint decoded pixels onto a temp canvas
        const tempCanvas = createCanvas(gifWidth, gifHeight);
        const tempCtx = tempCanvas.getContext('2d');
        const imageData = tempCtx.createImageData(gifWidth, gifHeight);
        imageData.data.set(framePixels);
        tempCtx.putImageData(imageData, 0, 0);

        // Composite this frame on top
        compositeCtx.drawImage(tempCanvas, 0, 0);

        // Snapshot the current composite as this animation frame
        const frameCanvas = createCanvas(gifWidth, gifHeight);
        frameCanvas.getContext('2d').drawImage(compositeCanvas, 0, 0);

        this._frames.push({
          canvas: frameCanvas,
          delay: delay,
          startAt: frameTimer,
        });

        this._totalLength += delay;
        frameTimer += delay;

        // Handle GIF disposal methods
        const disposal = info.disposal || 0;
        if (disposal === 2) {
          // Restore to background: clear the frame region
          compositeCtx.clearRect(info.x, info.y, info.width, info.height);
        } else if (disposal === 3) {
          // Restore to previous state
          compositeCtx.clearRect(0, 0, gifWidth, gifHeight);
          compositeCtx.drawImage(previousCanvas, 0, 0);
        }
        // disposal 0 & 1: leave composite as-is
      }

      this._loaded = true;
      this.protogen.logger.info("AnimatedImage", "Loaded " + this._frames.length + " frames, total duration: " + this._totalLength + "ms");
    } catch (err: any) {
      this.protogen.logger.error("AnimatedImage", "Failed to load GIF: " + String(err?.message || err));
      console.error(err);
      this._loaded = false;
    }
  }

  get totalLength() {
    return this._totalLength;
  }

  get frames() {
    return this._frames;
  }

  public draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, mode: DrawMode, time: number): void {
    if (this._frames.length === 0 || this._totalLength === 0) {
      ctx.fillStyle = "#FF00FF";
      ctx.fillRect(x, y, width, height);
      return;
    }

    if (!this._loaded) {
      ctx.fillStyle = "#4D4D4D";
      ctx.fillRect(x, y, width, height);
      return;
    }

    const animationTime = time % this._totalLength;

    // Find the active frame (frames are sorted by startAt)
    let frame = this._frames[0];
    for (let i = this._frames.length - 1; i >= 0; i--) {
      if (animationTime >= this._frames[i].startAt) {
        frame = this._frames[i];
        break;
      }
    }

    // Draw with canvas transform for flipping instead of storing a flipped copy
    if (mode === DrawMode.Inverted) {
      ctx.save();
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(frame.canvas, 0, 0, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(frame.canvas, x, y, width, height);
    }
  }
}

interface AnimationFrame {
  canvas: Canvas;
  delay: number;
  startAt: number;
}