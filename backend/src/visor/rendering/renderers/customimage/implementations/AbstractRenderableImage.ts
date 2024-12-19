import { Protogen } from "../../../../../Protogen";
import { CanvasRenderingContext2D } from "canvas";

export abstract class AbstractRenderableImage {
  private _protogen;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  protected get protogen() {
    return this._protogen;
  }

  public abstract get type(): Type;

  public abstract loadImage(imageSource: string): Promise<void>;

  public abstract draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, mode: DrawMode, time: number): void;
}

export enum DrawMode {
  Normal,
  Inverted,
}

export enum Type {
  Static = "Static",
  Animated = "Animated",
}