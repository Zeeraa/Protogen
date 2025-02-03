import { FaceExpressionData } from "../../../../../database/models/visor/FaceExpression.model";
import { VisorFaceRenderer } from "./VisorFaceRender";

export class FaceExpression {
  private _faceRenderer;
  private _data: FaceExpressionData;

  constructor(faceRenderer: VisorFaceRenderer, data: FaceExpressionData) {
    this._faceRenderer = faceRenderer;
    this._data = data;
  }

  get faceRenderer() {
    return this._faceRenderer;
  }

  get data() {
    return this._data;
  }
}