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
      #swagger.responses[500] = { description: "An internal error occured" }
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

    this.router.post("/", async (req, res) => {
      /*
      #swagger.path = '/api-keys'
      #swagger.tags = ['API Keys'],
      #swagger.description = "Create a new api key"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[409] = { description: "Name already in use" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        if (!req.auth.isSuperUser) {
          res.status(403).send({ message: "Access denied" });
          return;
        }

        const parsed = CreateApiKeyModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const key = await this.protogen.apiKeyManager.createApiKey(data.name, data.superUser);

        if (key == null) {
          res.status(409).send({ message: "Name already in use" });
          return;
        }

        res.json(key);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/:key", async (req, res) => {
      /*
      #swagger.path = '/api-keys/{key}'
      #swagger.tags = ['API Keys'],
      #swagger.description = "Delete api key"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Api key not found" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        if (!req.auth.isSuperUser) {
          res.status(403).send({ message: "Access denied" });
          return;
        }

        const result = await this.protogen.apiKeyManager.deleteKey(req.params.key);
        if (!result) {
          res.status(404).send({ message: "Key not found" });
          return;
        }

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const CreateApiKeyModel = z.object({
  name: z.string().trim().min(1).max(64),
  superUser: z.boolean(),
});