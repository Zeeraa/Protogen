import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class FaceRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/face");

    this.router.get("/data", async (req, res) => {
      /*
      #swagger.path = '/face/expressions'
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


      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

export const AlterFaceSettingsModel = z.object({
  defaultExpressionId: z.string().uuid().nullable().optional(),
})