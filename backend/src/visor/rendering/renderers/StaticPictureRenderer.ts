import { CanvasRenderingContext2D, Image, loadImage } from "canvas";
import { ProtogenVisor } from "../../ProtogenVisor";
import { VisorRenderer } from "../VisorRenderer";
import axios from "axios";

export class StaticPictureRenderer extends VisorRenderer {
  private _image: Image | null;
  private _source;

  constructor(visor: ProtogenVisor, id: string, name: string, imageSource: SourceProvider) {
    super(visor, id, name)
    this._image = null;
    this._source = imageSource;
  }

  public async onInit() {
    this.image = await this._source.provideImage();
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this._image == null) {
      ctx.fillStyle = "#ff00dc";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.drawImage(this._image, 0, 0, width, height);
    }
  }

  public get image(): Image | null {
    return this._image;
  }

  protected set image(image: Image) {
    this._image = image;
  }
}

abstract class SourceProvider {
  abstract provideImage(): Promise<Image>;
}

export class URLImageSourceProvider extends SourceProvider {
  private _url;

  constructor(url: string) {
    super();
    this._url = url;
  }

  async provideImage() {
    const response = await axios.get(this._url, { responseType: 'arraybuffer' });
    return await loadImage(response.data);
  }
}

export class FileImageSourceProvider extends SourceProvider {
  private _path;

  constructor(path: string) {
    super();
    this._path = path;
  }

  async provideImage() {
    return await loadImage(this._path);
  }
}

export class ExistingImageSourceProvider extends SourceProvider {
  private _image;

  constructor(image: Image) {
    super();
    this._image = image;
  }

  async provideImage() {
    return this._image;
  }
}