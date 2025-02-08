import { CanvasRenderingContext2D } from "canvas";
import { ProtogenVisor } from "../ProtogenVisor";
import { cyan } from "colors";
import { RendererType } from "./RendererType";

export abstract class VisorRenderer {
  private _visor;
  private _id: string;
  protected _name: string;
  private _initCalled = false;

  constructor(visor: ProtogenVisor, id: string, name: string) {
    this._visor = visor;
    this._id = id;
    this._name = name;
  }

  public get visor() {
    return this._visor;
  }

  public get protogen() {
    return this.visor.protogen;
  }

  public get id() {
    return this._id;
  }

  public get name() {
    return this._name;
  }

  protected set name(name: string) {
    this._name = name;
  }

  public async init() {
    if (this._initCalled) {
      return;
    }
    this.visor.protogen.logger.info("VisorRenderer", "Calling VisorRenderer::init() on renderer with id " + cyan(this.id) + " (" + cyan(this.name) + ")");
    this._initCalled = true;
    await this.onInit();
  }

  onActivate() { }

  public activate() {
    this.protogen.logger.info("Visor", "Activating renderer " + cyan(this.name));
    return this.visor.activateRenderer(this.id);
  }

  public abstract onInit(): Promise<void>;

  public abstract onRender(ctx: CanvasRenderingContext2D, width: number, height: number): void;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public handleBoopState(boopState: boolean) { }

  public abstract getPreviewImage(): string | null;

  public abstract get metadata(): any;

  public abstract get type(): RendererType;
}
