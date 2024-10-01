import { createCanvas, loadImage } from "canvas";
import { Protogen } from "../Protogen";
import { cyan } from "colors";

export class ProtogenVisor {
  private _protogen;
  private _canvas;
  private _ctx;
  private _renderLocks: String[];

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    protogen.logger.info("Visor", "Setting up canvas with size " + cyan(this.config.width + "x" + this.config.height));
    this._canvas = createCanvas(this.config.width, this.config.height);
    this._ctx = this.canvas.getContext('2d');
    this._renderLocks = [];
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

  public init() {
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
    } catch (err) {
      this.protogen.logger.error("Visor", "An error occured while paining canvas. " + (err as any).message);
      console.error(err);
      return;
    }
    //#endregion

    try {
      await this.push();
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
}