import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class OverviewRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/overview");

    this.router.get("/", async (req, res) => {
      /*
      #swagger.path = '/overview'
      #swagger.tags = ['Overview'],
      #swagger.description = "Get system overview"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json(this.webServer.getOverview());
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}