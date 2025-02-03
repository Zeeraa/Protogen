import { CanvasRenderingContext2D, createCanvas } from "canvas";
import { VisorRenderer } from "../../VisorRenderer";
import { ProtogenVisor } from "../../../ProtogenVisor";
import { AbstractRenderableImage, DrawMode, Type } from "../../images/AbstractRenderableImage";
import { StaticRenderableImage } from "../../images/StaticRenderableImage";
import { AnimatedRenderableImage } from "../../images/AnimatedRenderableImage";
import { RendererType } from "../../RendererType";

export class CustomImageRenderer extends VisorRenderer {
  private _renderer: AbstractRenderableImage | null = null;
  private _image: string | null = null;
  private _mirrorImage: boolean;
  private _flipRightSide: boolean;
  private _flipLeftSide: boolean;
  private _preview: string | null = null;

  constructor(
    visor: ProtogenVisor,
    id: string,
    name: string,
    image: string | null,
    mirrorImage: boolean,
    flipRightSide: boolean,
    flipLeftSide: boolean
  ) {
    super(visor, id, name);
    this._image = image;
    this._mirrorImage = mirrorImage;
    this._flipRightSide = flipRightSide;
    this._flipLeftSide = flipLeftSide;
  }

  public rename(name: string) {
    this._name = name;
  }

  public get mirrorImage() {
    return this._mirrorImage;
  }

  public set mirrorImage(value: boolean) {
    this._mirrorImage = value;
    this.generatePreview();
  }

  public get flipRightSide() {
    return this._flipRightSide;
  }

  public set flipRightSide(value: boolean) {
    this._flipRightSide = value;
    this.generatePreview();
  }

  public get flipLeftSide() {
    return this._flipLeftSide;
  }

  public set flipLeftSide(value: boolean) {
    this._flipLeftSide = value;
    this.generatePreview();
  }

  public get image(): string | null {
    return this._image;
  }

  public async setImageAsync(image: string | null) {
    this._image = image;
    this.loadImage();
  }

  private generatePreview() {
    const scale = this.protogen.visor.scale;
    const canvas = createCanvas(scale.width, scale.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.onRender(ctx, scale.width, scale.height);
    this._preview = canvas.toDataURL();
  }

  public async loadImage() {
    if (this.image != null) {
      if (this.image.toLowerCase().endsWith(".gif")) {
        if (this._renderer?.type !== Type.Animated) {
          this._renderer = new AnimatedRenderableImage(this.protogen);
        }
      } else {
        if (this._renderer?.type !== Type.Static) {
          this._renderer = new StaticRenderableImage(this.protogen);
        }
      }
      await this._renderer.loadImage(this.image);
      this.generatePreview();
    }
  }

  public async onInit() {
    await this.loadImage();
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this._renderer == null) {
      return;
    }

    const time = new Date().getTime();
    const halfW = Math.ceil(width / 2);

    if (this.mirrorImage) {
      this._renderer.draw(ctx, 0, 0, halfW, height, this.flipLeftSide ? DrawMode.Inverted : DrawMode.Normal, time);
      this._renderer.draw(ctx, halfW + 1, 0, halfW, height, this.flipRightSide ? DrawMode.Inverted : DrawMode.Normal, time);
    } else {
      this._renderer.draw(ctx, 0, 0, width, height, DrawMode.Normal, time);
    }
  }

  public getPreviewImage(): string | null {
    return this._preview;
  }

  public get metadata(): any {
    const data: CustomImageRendererData = {
      image: this.image,
      mirrorImage: this.mirrorImage,
      flipRightSide: this.flipRightSide,
      flipLeftSide: this.flipLeftSide,
    }

    return {
      type: this._renderer?.type || null,
      data: data,
    }
  }

  public get type(): RendererType {
    return RendererType.CustomisableImage;
  }
}

interface CustomImageRendererData {
  image: string | null;
  mirrorImage: boolean;
  flipRightSide: boolean;
  flipLeftSide: boolean;
}