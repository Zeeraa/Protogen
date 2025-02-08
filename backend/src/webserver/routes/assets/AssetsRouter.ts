import { existsSync } from "fs";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { resolve } from "path";

export class AssetsRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/assets");

    this.router.get("/", async (_, res) => {
      /*
      #swagger.path = '/assets'
      #swagger.tags = ['Assets'],
      #swagger.description = "Get list of built in assets that can be picked by the user"
      #swagger.responses[200] = { description: "Ok" }
      */
      res.json(this.protogen.builtInAssets);
    });

    this.router.get("/:name", async (req, res) => {
      /*
      #swagger.path = '/assets/{name}'
      #swagger.tags = ['Assets'],
      #swagger.description = "Get an asset by its name"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Asset not found" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      */
      try {
        const name = req.params.name;
        const asset = this.protogen.builtInAssets.find(a => a.name == name);

        if (asset == null) {
          res.status(404).send({ message: "Asset not found" });
          return;
        }

        const fullPath = resolve(asset.path);

        if (!existsSync(fullPath)) {
          res.status(404).send({ message: "Failed to find file on disk" });
          return;
        }

        res.sendFile(fullPath);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}
