import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class ApiKeyRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/api-keys");

    this.router.get("/", async (req, res) => {
      /*
      #swagger.path = '/api-keys'
      #swagger.tags = ['API Keys'],
      #swagger.description = "Get all api keys"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[403] = { description: "Access denied" }
      */
      try {
        if (!req.auth.isSuperUser) {
          res.status(403).send({ message: "Access denied" });
          return;
        }

        res.json(webServer.protogen.apiKeyManager.keys);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

export const AuthModel = z.object({
  username: z.string(),
  password: z.string(),
})