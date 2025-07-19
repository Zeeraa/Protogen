import { uuidv7 } from "uuidv7";
import { FaceExpressionData } from "../database/models/visor/FaceExpression.model";
import { Protogen } from "../Protogen";
import { KV_ActiveRendererKey, KV_ActiveVisorColorEffect, KV_DefaultExpression, KV_DidRunInitialSetup } from "../utils/KVDataStorageKeys";
import { cyan } from "colors";
import { FaceRendererId } from "../visor/rendering/renderers/special/face/VisorFaceRender";
import { FaceColorEffect } from "../database/models/visor/FaceColorEffect";
import { StaticFaceColorEffectName } from "../visor/rendering/renderers/special/face/colormod/VisorColorEffects";
import { FaceColorEffectProperty } from "../database/models/visor/FaceColorEffectProperty";

export class InitialSetup {
  private protogen;

  constructor(protogen: Protogen) {
    this.protogen = protogen;
  }

  public async checkInitialSetup() {
    if (process.env["NO_INITIAL_SETUP"] === "true") {
      return;
    }

    const didRun = await this.protogen.database.getData(KV_DidRunInitialSetup) == "true";
    if (didRun) {
      return;
    }
    this.protogen.logger.info("InitialSetup", "Running initial setup...");

    // Create default expressions
    for (const expression of DefaultExpressions) {
      const id = uuidv7();
      this.protogen.logger.info("InitialSetup", `Creating default expression: ${cyan(expression.name)}`);
      const expressionData = new FaceExpressionData();
      expressionData.uuid = id;
      expressionData.name = expression.name;
      expressionData.image = expression.image;
      expressionData.mirrorImage = false;
      expressionData.flipRightSide = false;
      expressionData.flipLeftSide = false;
      expressionData.replaceColors = expression.replaceColors;

      // If its the default set the default expression key in database
      if (expression.isDefault) {
        this.protogen.database.setData(KV_DefaultExpression, id);
      }

      await this.protogen.database.dataSource.getRepository(FaceExpressionData).save(expressionData);
    }

    // Set default visor renderer
    this.protogen.database.setData(KV_ActiveRendererKey, FaceRendererId)

    // Create color effects
    // Static
    {
      const colorEffect = new FaceColorEffect();
      colorEffect.uuid = uuidv7();
      colorEffect.name = "Default color";
      colorEffect.effect = StaticFaceColorEffectName;
      colorEffect.properties = [];

      const colorProp = new FaceColorEffectProperty();
      colorProp.key = "Color";
      colorProp.value = "44799";

      colorEffect.properties.push(colorProp);

      this.protogen.logger.info("InitialSetup", `Creating default color effect: ${cyan(colorEffect.name)}`);
      await this.protogen.database.dataSource.getRepository(FaceColorEffect).save(colorEffect);

      // Set it as active
      await this.protogen.database.setData(KV_ActiveVisorColorEffect, colorEffect.uuid);
    }

    // RGB
    {
      const colorEffect = new FaceColorEffect();
      colorEffect.uuid = uuidv7();
      colorEffect.name = "RGB";
      colorEffect.effect = "ColorCycle";
      colorEffect.properties = [];

      const propSpeed = new FaceColorEffectProperty();
      propSpeed.key = "Speed";
      propSpeed.value = "30";
      colorEffect.properties.push(propSpeed);

      const propOffset = new FaceColorEffectProperty();
      propOffset.key = "Offset";
      propOffset.value = "0";
      colorEffect.properties.push(propOffset);

      const PropReverse = new FaceColorEffectProperty();
      PropReverse.key = "Reverse";
      PropReverse.value = "false";
      colorEffect.properties.push(PropReverse);

      this.protogen.logger.info("InitialSetup", `Creating default color effect: ${cyan(colorEffect.name)}`);
      await this.protogen.database.dataSource.getRepository(FaceColorEffect).save(colorEffect);
    }

    this.protogen.logger.info("InitialSetup", "Initial setup completed.");
    await this.protogen.database.setData(KV_DidRunInitialSetup, "true");
  }
}

const DefaultExpressions: { name: string, image: string, replaceColors: boolean, isDefault: boolean }[] = [
  { name: "Neutral", image: "asset://proto_face_neutral", replaceColors: true, isDefault: true },
  { name: "Happy", image: "asset://proto_face_happy", replaceColors: true, isDefault: false },
  { name: "Sad", image: "asset://proto_face_sad", replaceColors: true, isDefault: false },
  { name: "Angry", image: "asset://proto_face_angry", replaceColors: true, isDefault: false },
];
