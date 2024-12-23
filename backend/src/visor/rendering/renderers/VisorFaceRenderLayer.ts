import { CanvasRenderingContext2D, Image } from "canvas";
import { ProtogenVisor } from "../../ProtogenVisor";
import { VisorRenderer } from "../VisorRenderer";
import { RendererType } from "../RendererType";
import { FileImageSourceProvider } from "../../image/FileImageSourceProvider";

export const FaceRendererId = "PROTO_FACE";

export class VisorFaceRenderer extends VisorRenderer {
  constructor(visor: ProtogenVisor) {
    super(visor, FaceRendererId, "Protogen Face");
  }

  private _image: Image | null = null;

  public async onInit() {
    try {
      const provider = new FileImageSourceProvider("assets/proto_face.png");
      this._image = await provider.provideImage();
    } catch (err) {
      console.error(err);
    }
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this._image == null) {
      ctx.fillStyle = "#ff00dc";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.drawImage(this._image, 0, 0, width, height);
    }
  }

  public getPreviewImage(): string | null {
    return null;
  }

  public get metadata(): any {
    return {};
  }

  public get type(): RendererType {
    return RendererType.Face;
  }
}