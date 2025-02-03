import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class FaceRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/face");

    this.router.get("/expressions", async (req, res) => {
      /*
      #swagger.path = '/face/expressions'
      #swagger.tags = ['Face'],
      #swagger.description = "Get all available face expressions"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        const expressions = this.protogen.visor.faceRenderer.expressions.map(e => e.data);
        res.json(expressions);
      } catch (err) {
        this.handleError(err, req, res);
      }
    })
  }
}