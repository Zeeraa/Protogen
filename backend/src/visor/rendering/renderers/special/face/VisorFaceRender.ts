import { CanvasRenderingContext2D } from "canvas";
import { ProtogenVisor } from "../../../../ProtogenVisor";
import { VisorRenderer } from "../../../VisorRenderer";
import { RendererType } from "../../../RendererType";
import { FaceExpression } from "./FaceExpression";
import { FaceExpressionData } from "../../../../../database/models/visor/FaceExpression.model";
import { cyan } from "colors";
import { KF_DefaultExpression } from "../../../../../utils/KVDataStorageKeys";

export const FaceRendererId = "PROTOGEN_FACE";

export class VisorFaceRenderer extends VisorRenderer {
  private _expressions: FaceExpression[];
  private _activeExpression: FaceExpression | null;
  private _defaultExpression: string | null;

  constructor(visor: ProtogenVisor) {
    super(visor, FaceRendererId, "Protogen Face");
    this._expressions = [];
    this._activeExpression = null;
  }

  get expressions() {
    return this._expressions;
  }

  removeRenderer(uuid: string) {
    const index = this.expressions.findIndex(e => e.data.uuid == uuid);
    if (index != -1) {
      this.expressions.splice(index, 1);
    }

    if (this.defaultExpression == uuid) {
      this.defaultExpression = null;
    }

    if (this.activeExpression?.data.uuid == uuid) {
      if (this.defaultExpression != null) {
        this.activateDefaultExpression();
      } else {
        this.setActiveExpression(null);
      }
    }
  }

  setActiveExpression(expression: FaceExpression | null) {
    this._activeExpression = expression;
  }

  get activeExpression() {
    return this._activeExpression;
  }

  get defaultExpression() {
    return this._defaultExpression;
  }

  set defaultExpression(value: string | null) {
    this._defaultExpression = value;
    this.protogen.database.setData(KF_DefaultExpression, value).then().catch(err => {
      this.protogen.logger.error("VisorFaceRenderer", "Failed to save default expression");
      console.error(err);
    });
  }

  activateDefaultExpression() {
    this._activeExpression = null;
    const defaultExpression = this.expressions.find(e => e.data.uuid == this.defaultExpression);
    if (defaultExpression != null) {
      this.setActiveExpression(defaultExpression);
    }
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

    this._defaultExpression = await this.protogen.database.getData(KF_DefaultExpression);
    this.activateDefaultExpression();
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

  onActivate(): void {
    console.debug("VisorFace::onActivate()");
    this.activateDefaultExpression();
  }
}
