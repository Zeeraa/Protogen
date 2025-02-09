import { CanvasRenderingContext2D, createCanvas } from "canvas";
import { FaceExpressionData } from "../../../../../database/models/visor/FaceExpression.model";
import { AbstractRenderableImage, DrawMode, Type } from "../../../images/AbstractRenderableImage";
import { AnimatedRenderableImage } from "../../../images/AnimatedRenderableImage";
import { StaticRenderableImage } from "../../../images/StaticRenderableImage";
import { VisorFaceRenderer } from "./VisorFaceRender";
import { resolve } from "path";
import { existsSync } from "fs";
import { cyan } from "colors";

export class FaceExpression {
  private _faceRenderer;
  private _data: FaceExpressionData;
  private _renderableImage: AbstractRenderableImage | null;
  private _preview: string | null = null;

  constructor(faceRenderer: VisorFaceRenderer, data: FaceExpressionData) {
    this._faceRenderer = faceRenderer;
    this._data = data;
    this._renderableImage = null;
  }

  public async saveDataChanges() {
    const repo = this.faceRenderer.protogen.database.dataSource.getRepository(FaceExpressionData);
    this._data = await repo.save(this.data);
  }

  get renderableImage() {
    return this._renderableImage;
  }

  get faceRenderer() {
    return this._faceRenderer;
  }

  get data() {
    return this._data;
  }

  get preview() {
    return this._preview;
  }

  public async loadImage() {
    if (this.data.image.startsWith("asset://")) {
      const assetName = this.data.image.split("asset://")[1];
      const asset = this.faceRenderer.protogen.builtInAssets.find(a => a.name === assetName);
      let imagePath = resolve("assets/missing_texture.png");
      if (asset != null) {
        const assetPath = resolve(asset.path);
        if (existsSync(assetPath)) {
          imagePath = assetPath;
        } else {
          this.faceRenderer.protogen.logger.error("FaceExpression", "Failed to find image file for asset: " + cyan(assetName));
        }
      }

      if (this._renderableImage?.type !== Type.Static) {
        this._renderableImage = new StaticRenderableImage(this.faceRenderer.protogen);
      }

      await this._renderableImage.loadImage(imagePath);
      this.generatePreview();
    } else {
      if (this.data.image != null) {
        if (this.data.image.toLowerCase().endsWith(".gif")) {
          if (this._renderableImage?.type !== Type.Animated) {
            this._renderableImage = new AnimatedRenderableImage(this.faceRenderer.protogen);
          }
        } else {
          if (this._renderableImage?.type !== Type.Static) {
            this._renderableImage = new StaticRenderableImage(this.faceRenderer.protogen);
          }
        }

        const image = this.data.image;
        const fullImagePath = this.faceRenderer.protogen.imageDirectory + "/" + image.substring(0, 2) + "/" + image;

        console.debug("Load face expression " + this.data.uuid + ". Path: " + fullImagePath);
        await this._renderableImage?.loadImage(fullImagePath);
        this.generatePreview();
      }
    }
  }

  public generatePreview() {
    const scale = this.faceRenderer.protogen.visor.scale;
    const canvas = createCanvas(scale.width, scale.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.renderExpression(ctx, scale.width, scale.height, new Date().getTime());
    this._preview = canvas.toDataURL();
  }

  public renderExpression(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
    const halfW = Math.ceil(width / 2);

    if (this.renderableImage == null) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (this.data.mirrorImage) {
      this.renderableImage.draw(ctx, 0, 0, halfW, height, this.data.flipLeftSide ? DrawMode.Inverted : DrawMode.Normal, time);
      this.renderableImage.draw(ctx, halfW + 1, 0, halfW, height, this.data.flipRightSide ? DrawMode.Inverted : DrawMode.Normal, time);
    } else {
      this.renderableImage.draw(ctx, 0, 0, width, height, DrawMode.Normal, time);
    }
  }
}
