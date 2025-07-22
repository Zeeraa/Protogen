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

/**
 * Renderer ID for VisorFaceRenderer
 */
export const FaceRendererId = "PROTOGEN_FACE";

/**
 * Renderer that renders images to use as a face for the visor.
 * It supports expressions, color effects, and temporary expressions.
 */
export class VisorFaceRenderer extends VisorRenderer {
  private _expressions: FaceExpression[];
  private _activeExpression: FaceExpression | null;
  private _defaultExpression: string | null;
  private _colorAdjustmentCanvas: Canvas | null;
  private _colorAdjustmentCanvasDimensions: { width: number, height: number };
  private _activeColorEffect: AbstractVisorColorEffect | null;
  private _forcedColorEffect: AbstractVisorColorEffect | null;
  private _availableColorEffects: AbstractVisorColorEffect[];
  private _temporaryExpressionExpiresAt: number | null = null;
  private _temporaryExpressionResetTo: string | null = null;

  constructor(visor: ProtogenVisor) {
    super(visor, FaceRendererId, "Protogen Face");
    this._expressions = [];
    this._activeExpression = null;
    this._colorAdjustmentCanvas = null;
    this._colorAdjustmentCanvasDimensions = { width: 0, height: 0 };
    this._activeColorEffect = null;
    this._availableColorEffects = [];

    setInterval(() => {
      this.tick();
    }, 100);
  }

  /**
   * Get all available color effects for the face renderer.
   */
  public get availableColorEffects() {
    return this._availableColorEffects;
  }

  /**
   * Get the currently active color effect for the face renderer.
   */
  public get activeColorEffect() {
    return this._activeColorEffect;
  }

  /**
   * Set the active color effect for the face renderer.
   * This will also persist the effect to the database.
   * @param effect The color effect to set as active. If null, it will clear the active color effect.
   */
  public set activeColorEffect(effect: AbstractVisorColorEffect | null) {
    this._activeColorEffect = effect;
    this.protogen.database.setData(KV_ActiveVisorColorEffect, effect?.id || null).then().catch(err => {
      this.protogen.logger.error("VisorFaceRenderer", "Failed to save active color effect");
      console.error(err);
    });
  }

  public get forcedColorEffect() {
    return this._forcedColorEffect;
  }

  /**
   * Get all expressions available in the face renderer.
   */
  public get expressions() {
    return this._expressions;
  }

  /**
   * Remove a face renderer by its UUID.
   * @param uuid The UUID of the face renderer to remove.
   */
  public removeRenderer(uuid: string) {
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

  /**
   * Delete a color effect from the database and remove it from the available effects.
   * @param effect The color effect to delete.
   */
  public async deleteColorEffect(effect: AbstractVisorColorEffect) {
    const repo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
    await repo.delete(effect.id);

    this._availableColorEffects = this.availableColorEffects.filter(e => e.id != effect.id);
    if (this.activeColorEffect?.id == effect.id) {
      this.activeColorEffect = null;
    }
    this.reloadForcedRgbEffect();
  }

  /**
   * Activate a temporary expression for a duration.
   * After the duration, it will reset to the previous active expression.
   * If no previous expression was active, it will reset to the default expression.
   *
   * @param expression The expression to activate temporarily.
   * @param duration Duration in seconds for how long the expression should be active.
   */
  public activateTemporaryExpression(expression: FaceExpression, duration: number) {
    this._temporaryExpressionExpiresAt = new Date().getTime() + duration * 1000;

    // Only update reset to expression if we are not already on a temporary one
    if (this._temporaryExpressionResetTo == null) {
      this._temporaryExpressionResetTo = this.activeExpression?.data.uuid || null;
    }
    this.setActiveExpression(expression, false);
  }

  /**
   * Called on a 100ms interval to perform scheduled actions
   */
  private tick() {
    if (this._temporaryExpressionExpiresAt != null && this._temporaryExpressionResetTo != null) {
      const now = new Date().getTime();
      if (now >= this._temporaryExpressionExpiresAt) {
        const resetTo = this.expressions.find(e => e.data.uuid == this._temporaryExpressionResetTo);
        if (resetTo != null) {
          this.setActiveExpression(resetTo);
        } else {
          this.protogen.logger.warn("VisorFaceRenderer", "Failed to find expression to reset to after temporary expression");
          this.activateDefaultExpression();
        }
        this._temporaryExpressionExpiresAt = null;
        this._temporaryExpressionResetTo = null;
      }
    }
  }

  /**
   * Set the active expression for the face renderer.
   * This will also clear any temporary expression state.
   * @param expression The expression to set as active. If null, it will clear the active expression.
   * @param clearTemporary If true, it will clear any temporary expression state. by default true.
   */
  public setActiveExpression(expression: FaceExpression | null, clearTemporary = true) {
    this._activeExpression = expression;
    if (clearTemporary) {
      this._temporaryExpressionExpiresAt = null;
      this._temporaryExpressionResetTo = null;
    }
    this.reloadForcedRgbEffect();
  }

  /**
   * Get the currently active expression for the face renderer.
   */
  public get activeExpression() {
    return this._activeExpression;
  }

  /**
   * Get the default expression for the face renderer.
   */
  public get defaultExpression() {
    return this._defaultExpression;
  }

  /**
   * Set the default expression for the face renderer.
   * This will also persist the default expression to the database.
   */
  public set defaultExpression(value: string | null) {
    this._defaultExpression = value;
    this.protogen.database.setData(KV_DefaultExpression, value).then().catch(err => {
      this.protogen.logger.error("VisorFaceRenderer", "Failed to save default expression");
      console.error(err);
    });
  }

  /**
   * Activate the default expression for the face renderer.
   */
  public activateDefaultExpression() {
    this._activeExpression = null;
    const defaultExpression = this.expressions.find(e => e.data.uuid == this.defaultExpression);
    if (defaultExpression != null) {
      this.setActiveExpression(defaultExpression);
    }
  }

  /**
   * Save a color effect to the database.
   * If the effect already exists, it will update it.
   * If it does not exist, it will create a new one.
   * @param effect The color effect to save.
   * @returns The saved color effect.
   */
  public async saveColorEffect(effect: AbstractVisorColorEffect) {
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

    this.reloadForcedRgbEffect();

    return await repo.save(dbEffect);
  }

  /**
   * Load all color effects from the database and set them as available.
   * It will also activate the last used color effect if it exists.
   * If the last used effect does not exist, it will set the active color effect to null.
   */
  public async loadColorEffects() {
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

  public reloadForcedRgbEffect() {
    this._forcedColorEffect = null;
    const linkedEffect = this.activeExpression?.data.linkedColorEffect;
    if (linkedEffect != null) {
      const effect = this.availableColorEffects.find(e => e.id == linkedEffect.uuid);
      if (effect != null) {
        this._forcedColorEffect = effect;
      }
    }
  }

  /**
   * Get the color effect to use for rendering.
   */
  public get colorEffectToUse() {
    return this.forcedColorEffect || this.activeColorEffect || null;
  }

  /**
   * Initialize the face renderer.
   */
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

  /**
   * Called by the VisorRenderer to render the face.
   * It will render the active expression or a black background if no expression is active.
   * If a color effect is active and it has color mod enabled, it will apply the color adjustments to the image data.
   */
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

  /**
   * Get the preview image to use in the web ui
   */
  public getPreviewImage(): string | null {
    // TODO: Render preview
    return null;
  }

  /**
   * Get the metadate. This renderer does not have any metadata so it returns an empty object.
   * @returns An empty object.
   */
  public get metadata(): any {
    return {};
  }

  public get type(): RendererType {
    return RendererType.Face;
  }

  /**
   * Called when the renderer is activated.
   */
  public onActivate(): void {
    console.debug("VisorFace::onActivate()");
    this.activateDefaultExpression();
  }
}
