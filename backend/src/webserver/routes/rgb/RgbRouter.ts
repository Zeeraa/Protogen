import { z } from "zod";
import { RgbScene } from "../../../rgb/scenes/RgbScene";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { constructRgbEffect, RgbEffects } from "../../../rgb/effects/RgbEffects";

export class RgbRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/rgb");

    this.router.get("/effects", async (req, res) => {
      /*
      #swagger.path = '/rgb/effects'
      #swagger.tags = ['RGB'],
      #swagger.description = "Get a list of all effects"
      #swagger.responses[200] = { description: "Ok" }
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

    this.router.delete("/scenes/:id", async (req, res) => {
      /*
      #swagger.path = '/rgb/scenes/{id}'
      #swagger.tags = ['RGB'],
      #swagger.description = "Delete a scene"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Scene not found" }
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
        description: 'Create a new scene',
        schema: {
          displayName: "Effect display name"
        }
      }
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

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Set a propertys',
        schema: {
          value: "New value"
        }
      }
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

        const saveResult = await this.protogen.rgb.saveScene(scene);

        res.json(saveResult);
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
        restriction: property.restrictions,
        value: property.value,
      });
    });

    effects.push({
      id: effect.id,
      name: effect.name,
      properties: properties,
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
}

interface PropertyData {
  type: string;
  name: string;
  value: any;
  restriction: any;
}