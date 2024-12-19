import { createCanvas } from "canvas";
import { BootMessageColor, Protogen } from "../Protogen";
import { cyan, yellow } from "colors";
import { VisorRenderer } from "./rendering/VisorRenderer";
import { FaceRendererId, VisorFaceRenderer } from "./rendering/renderers/VisorFaceRenderLayer";
import { BSODRenderer } from "./rendering/renderers/special/BSODRenderer";
import { ProtogenEvents } from "../utils/ProtogenEvents";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { KV_ActiveRendererKey } from "../utils/KVDataStorageKeys";
import { PixelFont } from "../font/PixelFont";
import sharp from "sharp";
import { CustomImageRenderer } from "./rendering/renderers/customimage/CustomImageRenderer";
import { URLImageSourceProvider } from "./image/URLImageSourceProvider";
import { StaticPictureRenderer } from "./rendering/renderers/StaticPictureRenderer";
import { CustomFace } from "../database/models/visor/CustomFace.model";
import { existsSync } from "fs";
import { FileImageSourceProvider } from "./image/FileImageSourceProvider";

export class ProtogenVisor {
  private _protogen;
  private _canvas;
  private _ctx;
  private _renderLocks: String[];
  private _activeRenderer: VisorRenderer | null;
  private _availableRenderers: VisorRenderer[];
  private _lastFrame: Buffer;
  private _initCalled = false;
  private _faceRenderer: VisorFaceRenderer;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    protogen.logger.info("Visor", "Setting up canvas with size " + cyan(this.config.width + "x" + this.config.height));
    this._canvas = createCanvas(this.config.width, this.config.height);
    this._ctx = this.canvas.getContext('2d');
    this._lastFrame = this.canvas.toBuffer();
    this._renderLocks = [];
    this._activeRenderer = null;
    this._availableRenderers = [];

    this.protogen.eventEmitter.on(ProtogenEvents.Booped, (state: boolean) => {
      this.handleBoopState(state);
    });

    // ========== Init renderers ==========
    // Animated face
    this._faceRenderer = new VisorFaceRenderer(this);
    this._availableRenderers.push(this._faceRenderer);
    this._availableRenderers.push(new BSODRenderer(this));
    this._availableRenderers.push(new StaticPictureRenderer(this, "ProtoBlank", "Blank", new FileImageSourceProvider("assets/blank.png")));

    // Default to the face renderer
    this.activateRenderer(FaceRendererId, false);

    setInterval(() => {
      this.sendVisorPreview();
    }, this.protogen.config.misc.visorPreviewInterval);
  }

  public get scale() {
    return {
      width: this.config.width,
      height: this.config.height
    }
  }

  public sendVisorPreview() {
    let base64: string | undefined; // Do not set until we know a client is trying to view the visor
    this.protogen.webServer.socketSessions.filter(s => s.enableVisorPreview).forEach(socket => {
      if (base64 == undefined) {
        base64 = this._lastFrame.toString('base64')
      }
      socket.sendMessage(SocketMessageType.S2C_VisorPreview, {
        base64: base64,
      });
    });
  }

  public async tryRenderTextFrame(text: string, color: string = "#FFFFFF") {
    try {
      await this.renderTextFrame(text, color);
      return true;
    } catch (err) {
      console.error("ProtogenVisor::tryRenderTextFrame() failed.", err);
    }
    return false;
  }

  public async renderTextFrame(text: string, color: string = "#FFFFFF") {
    const panelW = this.config.width / 2;
    const tmpCanvas = createCanvas(panelW, this.config.height);
    const tmpCtx = tmpCanvas.getContext('2d');

    tmpCtx.fillStyle = "#000000";
    tmpCtx.fillRect(0, 0, panelW, this.config.height);

    text = text.toUpperCase();

    let drawX = 0;
    let drawY = 0;

    for (let i = 0; i < text.length; i++) {
      if (drawX > panelW) {
        continue;
      }

      const char = text[i];
      if (char === '\n') {
        drawX = 0;
        drawY += 7;
      } else {
        const font = PixelFont[String(char)];
        if (font == undefined) {
          continue;
        }

        for (let cY = 0; cY < font.length; cY++) {
          for (let cX = 0; cX < font[cY].length; cX++) {
            const val = font[cY][cX];
            tmpCtx.fillStyle = val == 1 ? color : "#000000";
            tmpCtx.fillRect(drawX + cX, drawY + cY, 1, 1);
          }
        }

        const width = font[0].length;
        drawX += width + 1;
      }
    }

    const frameBuffer = tmpCanvas.toBuffer('image/png');
    const frameMetadata = await sharp(frameBuffer).metadata();

    const fullVisorFrameBuffer = await sharp({
      create: {
        width: panelW * 2,
        height: this.config.height,
        channels: frameMetadata.channels!,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).composite([
      { input: frameBuffer, left: 0, top: 0 },
      { input: frameBuffer, left: frameMetadata.width, top: 0 }
    ]).png().toBuffer();

    await this.protogen.flaschenTaschen.sendImageBuffer(fullVisorFrameBuffer, panelW * 2, this.config.height);
  }

  private handleBoopState(boopState: boolean) {
    this._activeRenderer?.handleBoopState(boopState);
  }

  public get faceRenderer() {
    return this._faceRenderer;
  }

  private get config() {
    return this._protogen.config.ledMatrix;
  }

  private get canvas() {
    return this._canvas;
  }

  private get ctx() {
    return this._ctx;
  }

  public async init() {
    if (this._initCalled) {
      this.protogen.logger.error("Visor", "ProtogenVisor::init() called twice");
      return;
    }
    this._initCalled = true;

    const customFacesRepo = this.protogen.database.dataSource.getRepository(CustomFace);
    const customFaces = await customFacesRepo.find();
    customFaces.forEach(face => {
      let imageFull = face.image == null ? null : this.protogen.imageDirectory + "/" + face.image.substring(0, 2) + "/" + face.image;
      if (imageFull != null) {
        if (!existsSync(imageFull)) {
          this.protogen.logger.warn("Visor", "Cant find image " + cyan(imageFull) + " for renderer " + cyan(face.uuid) + " with name " + cyan(face.name) + ". Setting image to " + yellow("null"));
          imageFull = null;
        }
      }
      const renderer = new CustomImageRenderer(this, face.uuid, face.name, imageFull, face.mirrorImage, face.flipRightSide, face.flipLeftSide);
      this.protogen.logger.info("Visor", "Adding custom renderer " + cyan(face.uuid) + " with name " + cyan(face.name));
      this._availableRenderers.push(renderer);
    })

    for (let i = 0; i < this.availableRenderers.length; i++) {
      const renderer = this.availableRenderers[i];
      try {
        await this.tryRenderTextFrame("BOOTING...\nLoad face\n" + (i + 1) + " / " + this.availableRenderers.length, BootMessageColor);
        await renderer.init();
      } catch (err) {
        console.error(err);
        this.protogen.logger.error("Visor", "An error occured while calling init on renderer with id " + cyan(renderer.id) + " (" + cyan(renderer.name) + ")");
      }
    }
  }

  public removeRenderer(id: string) {
    this._availableRenderers = this.availableRenderers.filter(r => r.id != id);
  }

  public beginMainLoop() {
    setInterval(() => {
      this.render();
    }, 1000 / 60)
  }

  public async render() {
    if (this.hasRenderLock) {
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;

    //#region Draw
    try {
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, w, h);

      if (this.activeRenderer != null) {
        this.activeRenderer.onRender(this.ctx, w, h);
      }
    } catch (err) {
      this.protogen.logger.error("Visor", "An error occured while paining canvas. " + (err as any).message);
      console.error(err);
      return;
    }
    //#endregion

    try {
      await this.push();
      this._lastFrame = this.canvas.toBuffer();
    } catch (err) {
      this.protogen.logger.error("Visor", "An error occured while pushing canvas to flaschen taschen. " + (err as any).message);
      console.error(err);
    }
  }

  public appendRenderLock(lockName: string) {
    if (!this.renderLocks.includes(lockName)) {
      this.renderLocks.push(lockName);
      return true;
    }
    return false;
  }

  public removeRenderLock(lockName: string): boolean {
    const initial = this.renderLocks.length;
    this._renderLocks = this.renderLocks.filter(l => l != lockName);
    const after = this.renderLocks.length;
    return initial != after;
  }

  get renderLocks() {
    return this._renderLocks;
  }

  get hasRenderLock() {
    return this.renderLocks.length > 0;
  }

  public async push() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.protogen.flaschenTaschen.sendImageBuffer(this.canvas.toBuffer(), w, h);
  }

  public get protogen() {
    return this._protogen;
  }

  public get activeRenderer() {
    return this._activeRenderer;
  }

  public get availableRenderers() {
    return this._availableRenderers;
  }

  public async loadActiveRendererFromDatabase() {
    this.protogen.logger.info("Visor", "Reading last active renderer from database");
    try {
      const value = await this.protogen.database.getData(KV_ActiveRendererKey);
      if (value != null) {
        const renderer = this._availableRenderers.find(r => r.id == value);
        if (renderer != null) {
          this.activateRenderer(renderer.id, false);
          this.protogen.logger.info("Visor", "Activating last used renderer " + renderer.name);
        } else {
          this.protogen.logger.warn("Visor", "Last used renderer was no longer found");
        }
      } else {
        this.protogen.logger.info("Visor", "No value for last used renderer");
      }
      return true;
    } catch (err) {
      this.protogen.logger.error("Visor", "Failed to load active renderer from database");
      console.error(err);
    }
    return false;
  }

  public async saveActiveRenderer() {
    try {
      const value = this._activeRenderer == null ? null : this._activeRenderer.id;
      await this.protogen.database.setData(KV_ActiveRendererKey, value);
      return true;
    } catch (err) {
      this.protogen.logger.error("Visor", "Failed to set active renderer");
      console.error(err);
    }
    return false;
  }

  public activateRenderer(id: string, updateDatabase = true): boolean {
    const renderer = this.availableRenderers.find(r => r.id == id);
    if (renderer != null) {
      renderer.onActivate();
      this._activeRenderer = renderer;
      if (updateDatabase) {
        this.saveActiveRenderer();
      }
    } else {
      this.protogen.logger.error("Visor", "Attempted to activate non existing renderer with id " + id);
    }
    return false;
  }

  public get lastFrame() {
    return this._lastFrame;
  }
}