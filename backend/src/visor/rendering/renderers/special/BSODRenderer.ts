import { FileImageSourceProvider } from "../../../image/FileImageSourceProvider";
import { ProtogenVisor } from "../../../ProtogenVisor";
import { StaticPictureRenderer } from "../StaticPictureRenderer";
import { FaceRendererId } from "./face/VisorFaceRender";

export const BSODRendererId = "PROTO_BSOD";

export class BSODRenderer extends StaticPictureRenderer {
  constructor(visor: ProtogenVisor) {
    super(visor, BSODRendererId, "Bluescreen Of Death", new FileImageSourceProvider("./assets/builtin/bsod.png"));
  }

  public handleBoopState(boopState: boolean): void {
    if (boopState == true) {
      this.visor.activateRenderer(FaceRendererId);
    }
  }
}