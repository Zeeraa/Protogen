import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { RendererType } from "../../RendererType";
import { VisorRenderer } from "../../VisorRenderer";
import { ProtogenVisor } from "../../../ProtogenVisor";
import { KV_Clock24HourFormat, KV_ClockDateColor, KV_ClockShowDate, KV_ClockShowSeconds, KV_ClockTimeColor } from "../../../../utils/KVDataStorageKeys";
import { ProtoColors, rgbToHex } from "../../../../utils/ProtoColors";
import { decodeRGB } from "../../../../utils/Utils";

export const ClockRendererId = "ClockRenderer";

export class ClockRenderer extends VisorRenderer {
  private readonly clockCanvas: Canvas;
  private _previewImage: string | null = null;
  private _interval: NodeJS.Timeout | null = null;
  private _timeColor = "#FFFFFF";
  private _dateColor = "#FFFFFF";
  private _showSeconds = true;
  private _showDate = true;
  private _is24HourFormat = true;

  constructor(visor: ProtogenVisor) {
    super(visor, ClockRendererId, "Clock");
    const { width, height } = this.protogen.config.ledMatrix;
    const panelWidth = width / 2;
    this.clockCanvas = createCanvas(panelWidth, height);
  }

  public async onInit() {
    await this.protogen.database.initMissingData(KV_Clock24HourFormat, "true");
    await this.protogen.database.initMissingData(KV_ClockShowSeconds, "true");
    await this.protogen.database.initMissingData(KV_ClockShowDate, "true");
    await this.protogen.database.initMissingData(KV_ClockTimeColor, String(ProtoColors.white));
    await this.protogen.database.initMissingData(KV_ClockDateColor, String(ProtoColors.white));

    await this.loadSettings();
    this.updateClockCanvas();
  }

  public async loadSettings() {
    const kv24h = await this.protogen.database.getData(KV_Clock24HourFormat);
    const kvShowSeconds = await this.protogen.database.getData(KV_ClockShowSeconds);
    const kvShowDate = await this.protogen.database.getData(KV_ClockShowDate);
    const kvTimeColor = await this.protogen.database.getData(KV_ClockTimeColor);
    const kvDateColor = await this.protogen.database.getData(KV_ClockDateColor);

    try {
      this._is24HourFormat = kv24h === "true";
      this._showSeconds = kvShowSeconds === "true";
      this._showDate = kvShowDate === "true";
      this._timeColor = kvTimeColor ? rgbToHex(decodeRGB(Number(kvTimeColor))) : "#FFFFFF";
      this._dateColor = kvDateColor ? rgbToHex(decodeRGB(Number(kvDateColor))) : "#FFFFFF";
    } catch (err) {
      console.error("ClockRenderer", "Error loading settings: ", err);
      this.protogen.logger.error("ClockRenderer", "Error loading settings");
    }
  }

  private updateClockCanvas() {
    const ctx = this.clockCanvas.getContext("2d");
    const { width, height } = this.clockCanvas;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    const now = new Date();
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !this._is24HourFormat
    };

    if (this._showSeconds) {
      timeOptions.second = '2-digit';
    }

    const timeString = now.toLocaleTimeString([], timeOptions);
    const dateString = now.toISOString().split('T')[0];

    const timeFontSize = Math.floor(height * 0.4);
    const dateFontSize = Math.floor(height * 0.3);

    ctx.fillStyle = this._timeColor;
    ctx.font = `${timeFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = this._showDate ? "top" : "middle";
    ctx.fillText(timeString, width / 2, this._showDate ? 0 : height / 2);

    if (this._showDate) {
      ctx.fillStyle = this._dateColor;
      ctx.font = `${dateFontSize}px Arial`;
      ctx.textBaseline = "bottom";
      ctx.fillText(dateString, width / 2, height);
    }

    this._previewImage = this.clockCanvas.toDataURL();
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const panelWidth = width / 2;
    ctx.drawImage(this.clockCanvas, 0, 0, panelWidth, height);
    ctx.drawImage(this.clockCanvas, panelWidth, 0, panelWidth, height);
  }

  public getPreviewImage(): string | null {
    if (this._interval == null) {
      this.updateClockCanvas();
    }
    return this._previewImage;
  }

  public get metadata(): any {
    return {};
  }

  public get type(): RendererType {
    return RendererType.Other;
  }


  onActivate(): void {
    this.protogen.logger.info("ClockRenderer", "Activating ClockRenderer");
    if (this._interval != null) {
      clearInterval(this._interval);
    }
    this._interval = setInterval(() => {
      this.updateClockCanvas();
    }, 1000);
  }

  onDeactivate(): void {
    this.protogen.logger.info("ClockRenderer", "Deactivating ClockRenderer");
    if (this._interval != null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}
