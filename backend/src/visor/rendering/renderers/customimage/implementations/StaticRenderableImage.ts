import { existsSync } from "fs";
import { AbstractRenderableImage, DrawMode, Type } from "./AbstractRenderableImage";
import { Image } from "canvas";
import { cyan } from "colors";
import { flipCanvasImage } from "../../../../../utils/ImageUtils";
import { CanvasRenderingContext2D } from "canvas";
import { FileImageSourceProvider } from "../../../../image/FileImageSourceProvider";

export class StaticRenderableImage extends AbstractRenderableImage {
  private _image: Image | null = null;
  private _imageFlipped: Image | null = null;

  public get type(): Type {
    return Type.Static;
  }

  public async loadImage(imageSource: string) {
    if (!existsSync(imageSource)) {
      throw new Error("Image source file not found");
    }

    let loadOk = false;
    try {
      const provider = new FileImageSourceProvider(imageSource);
      this._image = await provider.provideImage();
      loadOk = true;
    } catch (err) {
      this.protogen.logger.error("StaticRenderableImage", "Failed to load image " + cyan(imageSource));
      console.error(err);
    }

    if (!loadOk) {
      // Use missing texture image if load fails or image hash is null
      const provider = new FileImageSourceProvider("assets/missing_texture.png");
      this._image = await provider.provideImage();
    }

    if (this._image != null) {
      this._imageFlipped = await flipCanvasImage(this._image);
    }
  }

  public draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, mode: DrawMode, _time: number): void {
    const image = mode == DrawMode.Normal ? this._image : this._imageFlipped;
    if (image == null) {
      ctx.fillStyle = "#FF00FF";
      ctx.fillRect(x, y, width, height);
    } else {
      ctx.drawImage(image, x, y, width, height);
    }
  }

}