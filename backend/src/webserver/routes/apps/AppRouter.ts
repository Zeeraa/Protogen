import { AbstractApp } from "../../../apps/AbstractApp";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class AppRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/apps");

    this.router.get("/", async (req, res) => {
      /*
      #swagger.path = '/apps'
      #swagger.tags = ['Apps'],
      #swagger.description = "Get all apps and info about the active app"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const active = this.protogen.appManager.activeApp;
        res.json({
          activeApp: active == null ? null : appToDTO(active),
          apps: this.protogen.appManager.apps.map((app) => appToDTO(app)),
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/active", async (req, res) => {
      /*
      #swagger.path = '/apps/active'
      #swagger.tags = ['Apps'],
      #swagger.description = "Get active app"
      #swagger.responses[200] = { description: "Details about activated app" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const app = this.protogen.appManager.activeApp;

        res.json({
          activeApp: app == null ? null : appToDTO(app)
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/active", async (req, res) => {
      /*
      #swagger.path = '/apps/active'
      #swagger.tags = ['Apps'],
      #swagger.description = "Deactivate active app"
      #swagger.responses[200] = { description: "App deactivated" }
      #swagger.responses[404] = { description: "No active app found" }
      #swagger.responses[500] = { description: "Failed to deactivate app" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const app = this.protogen.appManager.activeApp;
        if (!app) {
          res.status(404).json({ message: "No active app" });
          return;
        }

        const result = await this.protogen.appManager.deactivateApp();
        if (!result) {
          res.status(500).json({ message: "Failed to deactivate app" });
          return;
        }

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/:name", async (req, res) => {
      /*
      #swagger.path = '/apps/{name}'
      #swagger.tags = ['Apps'],
      #swagger.description = "Get app by name"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "App not found" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const app = this.protogen.appManager.getAppByName(req.params.name);
        if (!app) {
          res.status(404).json({ message: "App not found" });
          return;
        }

        res.json(appToDTO(app));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/:name/activate", async (req, res) => {
      /*
      #swagger.path = '/apps/{name}/activate'
      #swagger.tags = ['Apps'],
      #swagger.description = "Get app by name"
      #swagger.responses[200] = { description: "App activated" }
      #swagger.responses[404] = { description: "App not found" }
      #swagger.responses[500] = { description: "Failed to activate app" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const app = this.protogen.appManager.getAppByName(req.params.name);
        if (!app) {
          res.status(404).json({ message: "App not found" });
          return;
        }

        const result = await this.protogen.appManager.activateApp(app.name);
        if (!result) {
          res.status(500).json({ message: "Failed to activate app" });
          return;
        }

        res.json(appToDTO(app));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

function appToDTO(app: AbstractApp) {
  return {
    name: app.name,
    displayName: app.displayName,
    options: app.options,
  }
}
