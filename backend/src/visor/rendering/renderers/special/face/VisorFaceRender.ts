import { CanvasRenderingContext2D, Canvas, createCanvas } from "canvas";
import { ProtogenVisor } from "../../../../ProtogenVisor";
import { VisorRenderer } from "../../../VisorRenderer";
import { RendererType } from "../../../RendererType";
import { FaceExpression } from "./FaceExpression";
import { FaceExpressionData } from "../../../../../database/models/visor/FaceExpression.model";
import { cyan, red } from "colors";
import { KV_ActiveVisorColorEffect, KV_DefaultExpression } from "../../../../../utils/KVDataStorageKeys";
import { typeAssert } from "../../../../../utils/Utils";
import { FaceColorEffect } from "../../../../../database/models/visor/FaceColorEffect";
import { constructVisorColorEffect } from "./colormod/VisorColorEffects";
import { AbstractVisorColorEffect } from "./colormod/AbstractVisorColorEffect";
import { Equal } from "typeorm";
import { FaceColorEffectProperty } from "../../../../../database/models/visor/FaceColorEffectProperty";

export const FaceRendererId = "PROTOGEN_FACE";

export class VisorFaceRenderer extends VisorRenderer {
  private _expressions: FaceExpression[];
  private _activeExpression: FaceExpression | null;
  private _defaultExpression: string | null;
  private _colorAdjustmentCanvas: Canvas | null;
  private _colorAdjustmentCanvasDimensions: { width: number, height: number };
  private _activeColorEffect: AbstractVisorColorEffect | null;
  private _forcedColorEffect: AbstractVisorColorEffect | null;
  private _availableColorEffects: AbstractVisorColorEffect[];

  constructor(visor: ProtogenVisor) {
    super(visor, FaceRendererId, "Protogen Face");
    this._expressions = [];
    this._activeExpression = null;
    this._colorAdjustmentCanvas = null;
    this._colorAdjustmentCanvasDimensions = { width: 0, height: 0 };
    this._activeColorEffect = null;
    this._availableColorEffects = [];
  }

  get availableColorEffects() {
    return this._availableColorEffects;
  }

  get activeColorEffect() {
    return this._activeColorEffect;
  }

  set activeColorEffect(effect: AbstractVisorColorEffect | null) {
    this._activeColorEffect = effect;
    this.protogen.database.setData(KV_ActiveVisorColorEffect, effect?.id || null).then().catch(err => {
      this.protogen.logger.error("VisorFaceRenderer", "Failed to save active color effect");
      console.error(err);
    });
  }

  get forcedColorEffect() {
    return this._forcedColorEffect;
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

  async deleteColorEffect(effect: AbstractVisorColorEffect) {
    const repo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
    await repo.delete(effect.id);

    this._availableColorEffects = this.availableColorEffects.filter(e => e.id != effect.id);
    if (this.activeColorEffect?.id == effect.id) {
      this.activeColorEffect = null;
    }
    this.reloadForcedRgbEffect();
  }

  setActiveExpression(expression: FaceExpression | null) {
    this._activeExpression = expression;
    this.reloadForcedRgbEffect();
  }

  get activeExpression() {
    return this._activeExpression;
  }

  get defaultExpression() {
    return this._defaultExpression;
  }

  set defaultExpression(value: string | null) {
    this._defaultExpression = value;
    this.protogen.database.setData(KV_DefaultExpression, value).then().catch(err => {
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

  async saveColorEffect(effect: AbstractVisorColorEffect) {
    const repo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
    let dbEffect = await repo.findOne({
      where: {
        uuid: Equal(effect.id),
      },
      relations: ["properties"]
    });

    if (dbEffect == null) {
      dbEffect = new FaceColorEffect();
      dbEffect.properties = [];
      dbEffect.effect = effect.effectName;
      dbEffect.uuid = effect.id;
    }

    dbEffect.name = effect.displayName;

    // Remove any unused properties
    dbEffect.properties = dbEffect.properties.filter(p => effect.getProperty(p.key) != null);

    // Update or add property from effect
    Object.values(effect.propertyMap).forEach(prop => {
      let dbProp = dbEffect.properties.find(p => p.key == prop.name);
      if (dbProp == null) {
        dbProp = new FaceColorEffectProperty();
        dbProp.key = prop.name;
        dbEffect.properties.push(dbProp);
      }
      dbProp.value = prop.stringifyValue();
    });

    return await repo.save(dbEffect);

    this.reloadForcedRgbEffect();
  }

  async loadColorEffects() {
    const repo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
    this._availableColorEffects = [];

    const effects = await repo.find({
      relations: ["properties"],
    });


    for (const effectData of effects) {
      const effect = constructVisorColorEffect(effectData.effect, effectData.uuid, effectData.name);
      if (effect == null) {
        this.protogen.logger.error("VisorFaceRenderer", "Failed to construct color effect " + cyan(effectData.name) + " (" + cyan(effectData.uuid) + ")");
        continue;
      }

      effectData.properties.forEach(prop => {
        const result = effect.setProperty(prop.key, prop.value);
        if (!result.success) {
          this.protogen.logger.warn("VisorFaceRenderer", "Tried to set property " + cyan(prop.key) + " of effect " + cyan(effectData.effect) + " to " + cyan(prop.value) + " but got error " + red(result.error));
        }
      });

      this._availableColorEffects.push(effect);
    }

    const activeColorEffectId = await this.protogen.database.getData(KV_ActiveVisorColorEffect);
    if (activeColorEffectId != null) {
      const activeEffect = this._availableColorEffects.find(e => e.id == activeColorEffectId);
      if (activeEffect != null) {
        this.activeColorEffect = activeEffect;
      } else {
        this.protogen.logger.error("VisorFaceRenderer", "Failed to find active color effect with id " + cyan(activeColorEffectId));
        this.activeColorEffect = null;
      }
    }
  }

  reloadForcedRgbEffect() {
    this._forcedColorEffect = null;
    const linkedEffect = this.activeExpression?.data.linkedColorEffect;
    if (linkedEffect != null) {
      const effect = this.availableColorEffects.find(e => e.id == linkedEffect.uuid);
      if (effect != null) {
        this._forcedColorEffect = effect;
      }
    }
  }

  get colorEffectToUse() {
    return this.forcedColorEffect || this.activeColorEffect || null;
  }

  public async onInit() {
    const repo = this.protogen.database.dataSource.getRepository(FaceExpressionData);
    const expressions = await repo.find({
      relations: {
        linkedColorEffect: true,
      },
    });

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

    this._defaultExpression = await this.protogen.database.getData(KV_DefaultExpression);
    this.activateDefaultExpression();

    await this.loadColorEffects();

    setInterval(() => {
      this.activeColorEffect?.onFixedTickRate();
    }, 1000 / 20);
  }

  public onRender(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const time = new Date().getTime();

    if (this.activeExpression == null) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    } else {
      const colorEffect = this.colorEffectToUse;
      if (this.activeExpression.data.replaceColors && colorEffect != null) {
        // Color replacement rendering

        if (this._colorAdjustmentCanvas == null || this._colorAdjustmentCanvasDimensions.width != width || this._colorAdjustmentCanvasDimensions.height != height) {
          this._colorAdjustmentCanvas = createCanvas(width, height);
          this._colorAdjustmentCanvasDimensions = { width, height };
        }
        const colorCtx = this._colorAdjustmentCanvas.getContext('2d');

        // Render image
        colorCtx.fillStyle = '#000000';
        colorCtx.fillRect(0, 0, width, height);
        this.activeExpression.renderExpression(colorCtx, width, height, time);

        // Extract image and modify data
        const image = colorCtx.getImageData(0, 0, width, height);
        colorEffect.apply(typeAssert<number[]>(image.data), width, height, time);

        ctx.putImageData(image, 0, 0);
      } else {
        // Normal rendering
        this.activeExpression.renderExpression(ctx, width, height, time);
      }
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
