import { z } from "zod";
import { RgbScene } from "../../../rgb/scenes/RgbScene";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { constructRgbEffect, RgbEffects } from "../../../rgb/effects/RgbEffects";
import { RgbSceneEffectProperty } from "../../../database/models/rgb/RgbSceneEffectProperty.model";
import { Equal } from "typeorm";
import { RgbEditorPreviewElement } from "../../../database/models/rgb/RgbEditorConfig.model";
import { RgbPreviewElementType } from "../../../database/models/rgb/enum/RgbPreviewElementType";
import { uuidv7 } from "uuidv7";
import { KV_RbgPreviewWidth, KV_RgbPreviewFullSizeOnLargeViewports, KV_RgbPreviewHeigth } from "../../../utils/KVDataStorageKeys";

export class RgbRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/rgb");

    this.router.get("/preview/config", async (req, res) => {
      /*
      #swagger.path = '/rgb/preview/config'
      #swagger.tags = ['RGB'],
      #swagger.description = "Get the preview window configuration"
      #swagger.responses[200] = { description: "Ok" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const repo = this.protogen.database.dataSource.getRepository(RgbEditorPreviewElement);

        const w = parseInt(await this.protogen.database.getData(KV_RbgPreviewWidth) || "200");
        const h = parseInt(await this.protogen.database.getData(KV_RgbPreviewHeigth) || "200");

        const fullWidth = await this.protogen.database.getData(KV_RgbPreviewFullSizeOnLargeViewports) == "true";

        const elements = await repo.find({
          order: {
            startIndex: "ASC",
          }
        });

        const result: RgbPreviewConfiguration = {
          canvas: {
            width: w,
            height: h,
          },
          largeViewportFullSize: fullWidth,
          elements: elements,
        }

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/preview/config", async (req, res) => {
      /*
      #swagger.path = '/rgb/preview/config'
      #swagger.tags = ['RGB'],
      #swagger.description = "Save the configuration"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = RgbPreviewConfigModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        await this.protogen.database.dataSource.transaction(async (transaction) => {
          const elementRepo = transaction.getRepository(RgbEditorPreviewElement);

          const elements = await elementRepo.find({});

          for (let i = 0; i < elements.length; i++) {
            await elementRepo.delete(elements[i]);
          }

          await this.protogen.database.setData(KV_RbgPreviewWidth, String(data.canvas.width), transaction);
          await this.protogen.database.setData(KV_RgbPreviewHeigth, String(data.canvas.height), transaction);
          await this.protogen.database.setData(KV_RgbPreviewFullSizeOnLargeViewports, data.largeViewportFullSize ? "true" : "false", transaction);

          for (let i = 0; i < data.elements.length; i++) {
            const element = data.elements[i];

            const dbElement = new RgbEditorPreviewElement();
            dbElement.uuid = uuidv7();
            dbElement.length = element.length;
            dbElement.name = element.name;
            dbElement.startIndex = element.startIndex;
            dbElement.type = element.type;
            dbElement.x = element.x;
            dbElement.y = element.y;

            await elementRepo.save(dbElement);
          }
        });

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/effects", async (req, res) => {
      /*
      #swagger.path = '/rgb/effects'
      #swagger.tags = ['RGB'],
      #swagger.description = "Get a list of all effects"
      #swagger.responses[200] = { description: "Ok" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json(RgbEffects.map(e => {
          return {
            name: e.name,
            description: e.description,
          };
        }));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/scenes", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes'
      #swagger.tags = ['RGB'],
      #swagger.description = "Get all RGB scenes"
      #swagger.responses[200] = { description: "Ok" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const scenes = this.protogen.rgb.scenes;
        res.json(scenes.map(s => sceneToDTO(s)));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/scenes/active", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/active'
      #swagger.tags = ['RGB'],
      #swagger.description = "Clears the active scene"
      #swagger.responses[200] = { description: "Ok" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        this.protogen.rgb.setActiveScene(null);
        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/scenes/new", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/new'
      #swagger.tags = ['RGB'],
      #swagger.description = "Create a new RGB scene"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Create a new scene',
        schema: {
          name: "Scene name"
        }
      }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = CreateNewSceneModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const newScene = await this.protogen.rgb.createBlankScene(data.name);

        res.json(sceneToDTO(newScene));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/scenes/:id", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Update a RGB scene"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene not found" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Edit scene',
        schema: {
          name: "Scene name"
        }
      }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = UpdateSceneModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        scene.name = data.name;
        await this.protogen.rgb.saveScene(scene);

        res.json(sceneToDTO(scene));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/scenes/:id", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Delete a scene"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene not found" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        await this.protogen.rgb.deleteScene(scene);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });


    this.router.get("/scenes/:id", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Get scene by id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene not found" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        res.json(sceneToDTO(scene));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/scenes/:id/activate", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}/activate'
      #swagger.tags = ['RGB'],
      #swagger.description = "Activates a scene"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene not found" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        await this.protogen.rgb.setActiveScene(scene);

        res.json(scene);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/scenes/:id/effect", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}/effect'
      #swagger.tags = ['RGB'],
      #swagger.description = "Edd effect to scene"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene or effect not found" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Create a new scene',
        schema: {
          effect: "Effect name",
          displayName: "Effect display name"
        }
      }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = AddEffectModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        const effect = constructRgbEffect(data.effect, data.displayName);
        if (effect == null) {
          res.status(404).send({ message: "Effect not found" });
          return;
        }

        scene.addEffect(effect);
        scene.updateRenderOrder();
        const saveResult = await this.protogen.rgb.saveScene(scene);

        res.json(saveResult);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/scenes/:id/effect/:effectId", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}/effect/{effectId}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Update an effect"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene or effect not found" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Update an effect',
        schema: {
          displayName: "Effect display name"
        }
      }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = UpdateEffectModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        const effect = scene.effects.find(e => e.id == req.params.effectId);
        if (effect == null) {
          res.status(404).send({ message: "Effect not found" });
          return;
        }

        effect.displayName = data.displayName;

        const saveResult = await this.protogen.rgb.saveScene(scene);

        res.json(saveResult);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/scenes/:id/effect/:effectId", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}/effect/{effectId}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Remove an effect"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene or effect not found" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        const effect = scene.effects.find(e => e.id == req.params.effectId);
        if (effect == null) {
          res.status(404).send({ message: "Effect not found" });
          return;
        }

        scene.removeEffect(effect);
        scene.updateRenderOrder();

        const saveResult = await this.protogen.rgb.saveScene(scene);

        res.json(saveResult);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/scenes/:id/effect/:effectId/property/:property", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}/effect/{effectId}/property/{property}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Set the property of a rgb effect"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Scene, effect or property not found" }

      #swagger.parameters['fullSave'] = {
        in: 'query',
        description: 'True to do a full save of the object',
        type: 'boolean',
        required: 'false'
      }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Set a property',
        schema: {
          value: "New value"
        }
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

        const scene = this.protogen.rgb.scenes.find(s => s.id == req.params.id);
        if (scene == null) {
          res.status(404).send({ message: "Scene not found" });
          return;
        }

        const effect = scene.effects.find(e => e.id == req.params.effectId);
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

        scene.updateRenderOrder();

        if (String(req.query.fullSave).toLowerCase() == "true") {
          await this.protogen.rgb.saveScene(scene);
        } else {
          const repo = this.protogen.database.dataSource.getRepository(RgbSceneEffectProperty);

          const prop = await repo.findOne({
            where: {
              key: Equal(req.params.property),
              effect: {
                id: Equal(effect.id),
                scene: {
                  id: Equal(scene.id)
                }
              }
            }
          });

          if (prop != null) {
            prop.value = result.property.stringifyValue();

            await repo.save(prop);
          } else {
            this.protogen.logger.warn("RgbRouter", "Failed to fetch property " + req.params.property + " for saving");
          }
        }

        res.json(sceneToDTO(scene));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

function sceneToDTO(scene: RgbScene) {
  const effects: EffectData[] = [];

  scene.effects.forEach(effect => {
    const properties: PropertyData[] = [];

    Object.values(effect.propertyMap).forEach(property => {
      properties.push({
        name: property.name,
        type: property.type,
        restrictions: property.restrictions,
        metadata: property.metadata,
        value: property.value,
      });
    });

    effects.push({
      id: effect.id,
      name: effect.name,
      properties: properties,
      displayName: effect.displayName,
    })
  });

  return {
    id: scene.id,
    name: scene.name,
    effects: effects,
  }
}

const CreateNewSceneModel = z.object({
  name: z.string().min(1).max(255),
});

const UpdateSceneModel = z.object({
  name: z.string().min(1).max(255),
});


const SetPropertyModel = z.object({
  value: z.any(),
});

const UpdateEffectModel = z.object({
  displayName: z.string().trim().min(1).max(255),
});

const AddEffectModel = z.object({
  effect: z.string().trim().min(1).max(255),
  displayName: z.string().trim().min(1).max(255),
});

interface EffectData {
  id: string;
  name: string;
  properties: PropertyData[];
  displayName: string;
}

interface PropertyData {
  type: string;
  name: string;
  value: any;
  restrictions: any;
  metadata: any;
}

interface RgbPreviewConfiguration {
  canvas: RgbPreviewCanvas;
  largeViewportFullSize: boolean;
  elements: RgbEditorPreviewElement[];
}

interface RgbPreviewCanvas {
  width: number;
  height: number;
}

const RgbPreviewConfigModel = z.object({
  canvas: z.object({
    width: z.number().safe().int().min(1).max(3000),
    height: z.number().safe().int().min(1).max(3000),
  }),
  largeViewportFullSize: z.boolean(),
  elements: z.array(z.object({
    name: z.string().max(128),
    type: z.nativeEnum(RgbPreviewElementType),
    x: z.number().int().safe().max(100000).min(-100),
    y: z.number().int().safe().max(100000).min(-100),
    startIndex: z.number().int().safe().max(1024).nonnegative(),
    length: z.number().int().safe().max(1024).nonnegative(),
  }))
});