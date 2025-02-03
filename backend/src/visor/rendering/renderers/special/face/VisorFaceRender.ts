import { CanvasRenderingContext2D, Image } from "canvas";
import { ProtogenVisor } from "../../../../ProtogenVisor";
import { VisorRenderer } from "../../../VisorRenderer";
import { RendererType } from "../../../RendererType";
import { FileImageSourceProvider } from "../../../../image/FileImageSourceProvider";
import { FaceExpression } from "./FaceExpression";
import { FaceExpressionData } from "../../../../../database/models/visor/FaceExpression.model";
import { cyan } from "colors";
import { KV_ActiveFaceExpressionKey } from "../../../../../utils/KVDataStorageKeys";

export const FaceRendererId = "PROTOGEN_FACE";

export class VisorFaceRenderer extends VisorRenderer {
  private _expressions: FaceExpression[];
  private _activeExpression: FaceExpression | null;

  constructor(visor: ProtogenVisor) {
    super(visor, FaceRendererId, "Protogen Face");
    this._expressions = [];
    this._activeExpression = null;
  }

  get expressions() {
    return this._expressions;
  }

  setActiveExpression(expression: FaceExpression | null, saveToDatabase = true) {
    this._activeExpression = expression;
    if (saveToDatabase) {
      this.saveActiveExpression();
    }
  }

  async saveActiveExpression() {
    try {
      const value = this.activeExpression == null ? null : this.activeExpression.data.uuid;
      await this.protogen.database.setData(KV_ActiveFaceExpressionKey, value);
      return true;
    } catch (err) {
      this.protogen.logger.error("VisorFaceRenderer", "Failed to save active expression id to database");
      console.error(err);
    }
    return false;
  }

  get activeExpression() {
    return this._activeExpression;
  }

  public async onInit() {
    const repo = this.protogen.database.dataSource.getRepository(FaceExpressionData);
    const expressions = await repo.find({});

    for (const expressionData of expressions) {
      this.protogen.logger.info("VisorFaceRenderer", "Load expression " + cyan(expressionData.name) + " (" + cyan(expressionData.uuid) + ")");
      const expression = new FaceExpression(this, expressionData);
      try {
        await expression.loadImage();
      } catch (err) {
        console.error(err);
        this.protogen.logger.error("VisorFaceRenderer", "Failed to load image for expression: " + cyan(expressionData.name) + " (" + cyan(expressionData.uuid) + ")");
      }
      this.expressions.push(expression);
    }

    const activeExpressionId = await this.protogen.database.getData(KV_ActiveFaceExpressionKey);
    if (activeExpressionId != null) {
      const activeExpression = this.expressions.find(e => e.data.uuid == activeExpressionId);
      if (activeExpression == null) {
        this.protogen.logger.error("VisorFaceRenderer", "Could not find last used expression with id " + cyan(activeExpressionId));
      } else {
        this.setActiveExpression(activeExpression, false);
      }
    }
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.activeExpression == null) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    } else {
      this.activeExpression.renderExpression(ctx, width, height);
    }
  }

  public getPreviewImage(): string | null {
    return null;
  }

  public get metadata(): any {
    return {};
  }

  public get type(): RendererType {
    return RendererType.Face;
  }
}