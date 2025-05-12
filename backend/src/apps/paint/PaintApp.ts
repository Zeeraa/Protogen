import { z } from "zod";
import { RGBColor } from "../../utils/ProtoColors";
import { AppSocketPacket } from "../../webserver/socket/AppUserSocketSession";
import { AbstractApp } from "../AbstractApp";
import { AppManager } from "../AppManager";

/**
 * An app where you can invite users to draw on your screen
 */
export class PaintApp extends AbstractApp {
  constructor(appManager: AppManager) {
    super(appManager, "paint", "Paint", { useRenderer: true, webPath: "/apps/paint" });
  }

  async onInit() {
    this.clearCanvas();
  }

  async onActivated() {
    this.clearCanvas();
    this.regenerateInteractionKey();
  }

  clearCanvas() {
    this.appCanvasCtx.fillStyle = "black";
    this.appCanvasCtx.fillRect(0, 0, this.appCanvas.width, this.appCanvas.height);

    //TODO: remove debug code
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * this.appCanvas.width);
      const y = Math.floor(Math.random() * this.appCanvas.height);
      const hue = Math.floor(Math.random() * 360);
      this.appCanvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      this.appCanvasCtx.fillRect(x, y, 1, 1);
    }
  }

  public getMetadata() {
    const imageB64 = this.appCanvas.toDataURL("image/png");

    return {
      canvas: {
        width: this.appCanvas.width,
        height: this.appCanvas.height,
      },
      image: imageB64,
    }
  }

  public async onAppMessage(data: AppSocketPacket<any>) {
    if (data.type == ProtogenPaintPackets.PaintPixel) {
      const result = PaintPixelModel.safeParse(data.data);
      if (!result.success) {
        this.protogen.logger.error("PaintApp", "Invalid PaintPixel packet" + result.error.toString());
        return;
      }

      const payload = result.data as PaintPixelPayload;

      this.appCanvasCtx.fillStyle = `rgb(${payload.color.r}, ${payload.color.g}, ${payload.color.b})`;
      this.appCanvasCtx.fillRect(payload.position.x, payload.position.y, 1, 1);

      const paintPacket: AppSocketPacket<PaintPixelPayload> = {
        type: ProtogenPaintPackets.PaintPixel,
        data: {
          sessionId: payload.sessionId,
          position: payload.position,
          color: payload.color,
        }
      }

      this.protogen.webServer.broadcastAppMessage(this, paintPacket)
    }
  }
}

interface Position {
  x: number;
  y: number;
}

interface PaintPixelPayload {
  sessionId: string;
  position: Position;
  color: RGBColor;
}

interface ClearPayload {
  sessionId: string;
}

enum ProtogenPaintPackets {
  PaintPixel = "PaintPixel",
  Clear = "Clear",
}

const PaintPixelModel = z.object({
  sessionId: z.string().uuid(),
  position: z.object({
    x: z.number().min(0).max(2048).int(),
    y: z.number().min(0).max(2048).int(),
  }),
  color: z.object({
    r: z.number().min(0).max(255).int(),
    g: z.number().min(0).max(255).int(),
    b: z.number().min(0).max(255).int(),
  }),
});
