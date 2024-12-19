import { CanvasRenderingContext2D, createCanvas, Image } from "canvas";
import { ProtogenVisor } from "../../ProtogenVisor";
import { VisorRenderer } from "../VisorRenderer";
import { SourceProvider } from "../../image/SourceProvider";
import { RendererType } from "../RendererType";

export class StaticPictureRenderer extends VisorRenderer {
  private _image: Image | null;
  private _source;
  private _preview: string | null = null;

  constructor(visor: ProtogenVisor, id: string, name: string, imageSource: SourceProvider) {
    super(visor, id, name)
    this._image = null;
    this._source = imageSource;
  }

  public async onInit() {
    this.image = await this._source.provideImage();
    this.generatePreview();
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this._image == null) {
      ctx.fillStyle = "#ff00dc";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.drawImage(this._image, 0, 0, width, height);
    }
  }

  private generatePreview() {
    const scale = this.protogen.visor.scale;
    const canvas = createCanvas(scale.width, scale.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.onRender(ctx, scale.width, scale.height);
    this._preview = canvas.toDataURL();
  }

  public get image(): Image | null {
    return this._image;
  }

  protected set image(image: Image) {
    this._image = image;
  }

  public getPreviewImage(): string | null {
    return this._preview;
  }

  public get metadata(): any {
    return {};
  }

  public get type(): RendererType {
    return RendererType.StaticImage;
  }
}