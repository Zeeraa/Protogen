import { Request, Response } from "express";
import { AbstractApp } from "../../../apps/AbstractApp";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class AppRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/apps");

    this.router.get("/", [this.authMiddleware], async (req: Request, res: Response) => {
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

    this.router.get("/active", [this.authMiddleware], async (req: Request, res: Response) => {
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

    this.router.delete("/active", [this.authMiddleware], async (req: Request, res: Response) => {
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

    this.router.get("/user-app-info", async (req, res) => {
      /*
      #swagger.path = '/apps/user-app-info'
      #swagger.tags = ['Apps'],
      #swagger.description = "Get add details using app token"
      #swagger.responses[200] = { description: "App info" }
      #swagger.responses[403] = { description: "Missing or expired token" }
      #swagger.responses[404] = { description: "Token belongs to an app that dies not exist" }
      #swagger.responses[500] = { description: "An error occured" }
      */
      try {
        if (req.headers["x-app-token"] == null) {
          res.status(403).json({ message: "No app token header found" });
          return;
        }

        let token = String(req.headers["x-app-token"]);

        if (token.startsWith("Bearer ")) {
          token = token.substring(7);
        }

        const auth = await this.protogen.appManager.validateJWTToken(token)

        if (auth == null) {
          res.status(403).json({ message: "Invalid or expired app token" });
          return;
        }

        const app = this.protogen.appManager.getAppByName(auth.targetApplicationName);
        if (app == null) {
          res.status(404).json({ message: "App not found" });
          return;
        }

        if (app.interactionKey != auth.interactionKey) {
          res.status(403).json({ message: "App token expired" });
          return;
        }

        res.json(appToDTO(app));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/:name", [this.authMiddleware], async (req: Request, res: Response) => {
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

    this.router.post("/:name/activate", [this.authMiddleware], async (req: Request, res: Response) => {
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

    this.router.get("/:name/get-token", [this.authMiddleware], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/apps/{name}/get-token'
      #swagger.tags = ['Apps'],
      #swagger.description = "Generate a JWT token for acessing the app"
      #swagger.responses[200] = { description: "App token" }
      #swagger.responses[404] = { description: "App not found" }
      #swagger.responses[500] = { description: "Failed to generate token" }

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

        if (req.auth.user == null) {
          res.status(403).json({ message: "User not authenticated" });
          return;
        }

        const token = await this.protogen.appManager.generateJwtToken(req.auth.user, app);

        res.json({
          app: appToDTO(app),
          token: token,
        });
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
    metadata: app.getMetadata(),
  }
}
