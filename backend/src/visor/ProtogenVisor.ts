import { createCanvas } from "canvas";
import { Protogen } from "../Protogen";
import { cyan } from "colors";
import { VisorRenderer } from "./rendering/VisorRenderer";
import { FaceRendererId, VisorFaceRenderer } from "./rendering/renderers/VisorFaceRenderLayer";
import { BSODRenderer } from "./rendering/renderers/special/BSODRenderer";
import { ProtogenEvents } from "../utils/ProtogenEvents";
import { boolean } from "zod";

export const KV_ActiveRendererKey = "ActiveVisorRenderer";

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

    // Default to the face renderer
    this.activateRenderer(FaceRendererId, false);
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

    for (let i = 0; i < this.availableRenderers.length; i++) {
      const renderer = this.availableRenderers[i];
      try {
        await renderer.init();
      } catch (err) {
        console.error(err);
        this.protogen.logger.error("Visor", "An error occured while calling init on renderer with id " + cyan(renderer.id) + " (" + cyan(renderer.name) + ")");
      }
    }

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