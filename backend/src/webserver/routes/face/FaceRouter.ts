import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { Equal, Not } from "typeorm";
import { FaceExpressionData } from "../../../database/models/visor/FaceExpression.model";
import { FaceExpression } from "../../../visor/rendering/renderers/special/face/FaceExpression";
import { uuidv7 } from "uuidv7";
import { constructVisorColorEffect, VisorColorEffects } from "../../../visor/rendering/renderers/special/face/colormod/VisorColorEffects";
import { AbstractVisorColorEffect } from "../../../visor/rendering/renderers/special/face/colormod/AbstractVisorColorEffect";
import { RgbPropertyData } from "../rgb/RgbRouter";
import { FaceColorEffect } from "../../../database/models/visor/FaceColorEffect";
import { FaceColorEffectProperty } from "../../../database/models/visor/FaceColorEffectProperty";

export class FaceRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/face");

    this.router.get("/data", async (req, res) => {
      /*
      #swagger.path = '/face/data'
      #swagger.tags = ['Face'],
      #swagger.description = "Get all available face expressions and settings"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const expressions = this.protogen.visor.faceRenderer.expressions.map(e => {
          return {
            data: e.data,
            preview: e.preview,
          }
        });
        res.json({
          expressions,
          defaultExpression: this.protogen.visor.faceRenderer.defaultExpression,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/settings", async (req, res) => {
      /*
      #swagger.path = '/face/settings'
      #swagger.tags = ['Face'],
      #swagger.description = "Get face settings"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json({
          defaultExpressionId: this.protogen.visor.faceRenderer.defaultExpression,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    })

    this.router.put("/settings", async (req, res) => {
      /*
      #swagger.path = '/face/settings'
      #swagger.tags = ['Face'],
      #swagger.description = "Update face settings"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = AlterFaceSettingsModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        if (data.defaultExpressionId !== undefined) {
          this.protogen.visor.faceRenderer.defaultExpression = data.defaultExpressionId;
        }

        res.json({
          defaultExpressionId: this.protogen.visor.faceRenderer.defaultExpression,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/expressions", async (req, res) => {
      /*
      #swagger.path = '/face/expressions'
      #swagger.tags = ['Face'],
      #swagger.description = "Get all available face expressions"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const expressions = this.protogen.visor.faceRenderer.expressions.map(e => {
          return {
            data: e.data,
            preview: e.preview,
          }
        });
        res.json(expressions);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/expressions", async (req, res) => {
      /*
      #swagger.path = '/face/expressions'
      #swagger.tags = ['Face'],
      #swagger.description = "Create face expression"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[409] = { description: "Expression name already in use" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const repo = this.protogen.database.dataSource.getRepository(FaceExpressionData);

        const parsed = AlterFaceExpressionModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const conflict = await repo.findOne({
          where: {
            name: Equal(data.name),
          },
        });

        if (conflict != null) {
          res.status(409).send({ message: "Expression with this name already exists" });
          return;
        }

        const expressionData = new FaceExpressionData();
        expressionData.uuid = uuidv7();
        expressionData.name = data.name;
        expressionData.image = data.image;
        expressionData.mirrorImage = data.mirrorImage;
        expressionData.flipRightSide = data.flipRightSide;
        expressionData.flipLeftSide = data.flipLeftSide;
        expressionData.replaceColors = data.replaceColors;

        const newData = await repo.save(expressionData);

        const expression = new FaceExpression(this.protogen.visor.faceRenderer, newData);
        this.protogen.visor.faceRenderer.expressions.push(expression);
        await expression.loadImage();

        res.json({
          data: expression.data,
          preview: expression.preview,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/expressions/:id", async (req, res) => {
      /*
      #swagger.path = '/face/expressions/{id}'
      #swagger.tags = ['Face'],
      #swagger.description = "Create face expression"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Expression not found" }
      #swagger.responses[409] = { description: "Expression name already in use" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const repo = this.protogen.database.dataSource.getRepository(FaceExpressionData);

        const parsed = AlterFaceExpressionModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == req.params.id);
        if (expression == null) {
          res.status(404).send({ message: "Expression not found" });
          return;
        }

        const conflict = await repo.findOne({
          where: {
            uuid: Not(Equal(expression.data.uuid)),
            name: Equal(data.name),
          },
        });

        if (conflict != null) {
          res.status(409).send({ message: "Expression with this name already exists" });
          return;
        }

        expression.data.name = data.name;
        expression.data.image = data.image;
        expression.data.mirrorImage = data.mirrorImage;
        expression.data.flipRightSide = data.flipRightSide;
        expression.data.flipLeftSide = data.flipLeftSide;
        expression.data.replaceColors = data.replaceColors;

        await expression.saveDataChanges();

        await expression.loadImage();
        expression.generatePreview();

        res.json({
          data: expression.data,
          preview: expression.preview,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/expressions/:id/activate", async (req, res) => {
      /*
      #swagger.path = '/face/expressions/{id}/activate'
      #swagger.tags = ['Face'],
      #swagger.description = "Activate expression"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Expression not found" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == req.params.id);
        if (expression == null) {
          res.status(404).send({ message: "Expression not found" });
          return;
        }

        this.protogen.visor.faceRenderer.setActiveExpression(expression);

        res.json({
          data: expression.data,
          preview: expression.preview,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/expressions/:id", async (req, res) => {
      /*
      #swagger.path = '/face/expressions/{id}'
      #swagger.tags = ['Face'],
      #swagger.description = "Delete face expression"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Expression not found" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const repo = this.protogen.database.dataSource.getRepository(FaceExpressionData);

        const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == req.params.id);
        if (expression == null) {
          res.status(404).send({ message: "Expression not found" });
          return;
        }

        await repo.delete(expression.data.uuid);
        this.protogen.visor.faceRenderer.removeRenderer(expression.data.uuid);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/color-effects", async (req, res) => {
      /*
      #swagger.path = '/face/color-effects'
      #swagger.tags = ['Face'],
      #swagger.description = "Get all color effects"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      res.json(this.protogen.visor.faceRenderer.availableColorEffects.map(effectToDTO));
    });

    this.router.get("/color-effects/types", async (req, res) => {
      /*
      #swagger.path = '/face/color-effects/types'
      #swagger.tags = ['Face'],
      #swagger.description = "Get all available color effect types"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      res.json(VisorColorEffects.map(e => {
        return {
          name: e.name,
          description: e.description,
        }
      }));
    });

    this.router.get("/color-effects/:effectId", async (req, res) => {
      /*
      #swagger.path = '/face/color-effects/{effectId}'
      #swagger.tags = ['Face'],
      #swagger.description = "Get effect by id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Effect not found" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      const effect = this.protogen.visor.faceRenderer.availableColorEffects.find(e => e.id == req.params.effectId);
      if (effect == null) {
        res.status(404).send({ message: "Effect not found" });
        return;
      }

      res.json(effectToDTO(effect));
    });

    this.router.post("/color-effects/new", async (req, res) => {
      /*
      #swagger.path = '/face/color-effects/{effectId}'
      #swagger.tags = ['Face'],
      #swagger.description = "Update effect by id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = {description: "Effect type not found"}
      #swagger.responses[409] = { description: "Name already in use" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = NewEffectModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const repo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
        const data = parsed.data;

        const conflict = repo.findOne({
          where: {
            name: Equal(data.name),
          }
        });

        if (conflict != null) {
          res.status(409).send({ message: "Name already in use" });
          return;
        }

        const effect = constructVisorColorEffect(data.effect, uuidv7(), data.name);

        if (effect == null) {
          res.status(404).send({ message: "Effect type not found" });
          return;
        }

        await this.protogen.visor.faceRenderer.saveColorEffect(effect);
        this.protogen.visor.faceRenderer.availableColorEffects.push(effect);

        res.json(effectToDTO(effect));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/color-effects/:effectId", async (req, res) => {
      /*
      #swagger.path = '/face/color-effects/{effectId}'
      #swagger.tags = ['Face'],
      #swagger.description = "Update effect by id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Effect not found" }
      #swagger.responses[409] = { description: "Name already in use" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const effect = this.protogen.visor.faceRenderer.availableColorEffects.find(e => e.id == req.params.effectId);
        if (effect == null) {
          res.status(404).send({ message: "Effect not found" });
          return;
        }

        const parsed = AlterEffectModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const repo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
        const data = parsed.data;

        const conflict = await repo.findOne({
          where: {
            name: Equal(data.name),
            uuid: Not(Equal(effect.id)),
          }
        });

        if (conflict != null) {
          res.status(409).send({ message: "Name already in use" });
          return;
        }

        effect.displayName = data.name;

        res.json(effectToDTO(effect));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/color-effects/:effectId/properties/:property", async (req, res) => {
      /*
      #swagger.path = '/face/color-effects/{effectId}/properties/{property}'
      #swagger.tags = ['Face'],
      #swagger.description = "Update effect property"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Effect or property not found" }

      #swagger.parameters['fullSave'] = {
        in: 'query',
        description: 'True to do a full save of the object',
        type: 'boolean',
        required: 'false'
      }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = SetPropertyModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const effect = this.protogen.visor.faceRenderer.availableColorEffects.find(e => e.id == req.params.effectId);
        if (effect == null) {
          res.status(404).send({ message: "Effect not found" });
          return;
        }

        if (!Object.keys(effect.propertyMap).includes(req.params.property)) {
          res.status(404).send({ message: "Property key not found" });
          return;
        }

        const dataString = String(data.value);

        const result = effect.setProperty(req.params.property, dataString);

        if (!result.success) {
          res.status(400).send({ message: "Failed to set property", error: result.error });
          return;
        }

        if (String(req.query.fullSave).toLowerCase() == "true") {
          await this.protogen.visor.faceRenderer.saveColorEffect(effect);
        } else {
          const repo = this.protogen.database.dataSource.getRepository(FaceColorEffectProperty);
          const prop = await repo.findOne({
            where: {
              effect: Equal(effect.id),
              key: Equal(req.params.property),
            }
          });

          if (prop != null) {
            prop.value = result.property.stringifyValue();

            await repo.save(prop);
          } else {
            this.protogen.logger.warn("VisorRouter", "Failed to fetch property " + req.params.property + " for saving");
          }
        }

        res.json(effectToDTO(effect));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

function effectToDTO(effect: AbstractVisorColorEffect) {
  const properties: RgbPropertyData[] = [];

  Object.values(effect.propertyMap).forEach(property => {
    properties.push({
      name: property.name,
      type: property.type,
      restrictions: property.restrictions,
      metadata: property.metadata,
      value: property.value,
    });
  });

  return {
    id: effect.id,
    type: effect.effectName,
    name: effect.displayName,
    properties: properties,
  }
}

export const NewEffectModel = z.object({
  name: z.string().max(255).trim().min(1),
  effect: z.string(),
})

export const AlterEffectModel = z.object({
  name: z.string().max(255).trim().min(1),
});

export const AlterFaceSettingsModel = z.object({
  defaultExpressionId: z.string().uuid().nullable().optional(),
});

const SetPropertyModel = z.object({
  value: z.any(),
});


export const AlterFaceExpressionModel = z.object({
  name: z.string().max(255).trim().min(1),
  image: z.string().max(255).trim().min(1),
  mirrorImage: z.boolean(),
  flipRightSide: z.boolean(),
  flipLeftSide: z.boolean(),
  replaceColors: z.boolean(),
})
