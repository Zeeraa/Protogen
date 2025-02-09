import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { Equal, Not } from "typeorm";
import { FaceExpressionData } from "../../../database/models/visor/FaceExpression.model";
import { FaceExpression } from "../../../visor/rendering/renderers/special/face/FaceExpression";
import { uuidv7 } from "uuidv7";

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
  }
}

export const AlterFaceSettingsModel = z.object({
  defaultExpressionId: z.string().uuid().nullable().optional(),
})


export const AlterFaceExpressionModel = z.object({
  name: z.string().max(255).trim().min(1),
  image: z.string().max(255).trim().min(1),
  mirrorImage: z.boolean(),
  flipRightSide: z.boolean(),
  flipLeftSide: z.boolean(),
  replaceColors: z.boolean(),
})
