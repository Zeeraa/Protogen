import { enable } from "colors";
import { GamepadType } from "../../../gamepadmanager/GamepadManager";
import { Protogen } from "../../../Protogen";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { z } from "zod";

export class GamepadRouter extends AbstractRouter {
  constructor(server: ProtogenWebServer) {
    super(server, "/gamepad");

    this.router.get("/state", async (req, res) => {
      /*
      #swagger.path = '/gamepad/state'
      #swagger.tags = ['Gamepad'],
      #swagger.description = "Get gamepad state"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json(this.protogen.gamepadManager.state);
      } catch (err) {
        this.handleError(err, req, res)
      }
    })

    this.router.get("/settings", async (req, res) => {
      /*
      #swagger.path = '/gamepad/settings'
      #swagger.tags = ['Gamepad'],
      #swagger.description = "Get gamepad settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json({
          type: this.protogen.gamepadManager.type,
          enablePreview: this.protogen.gamepadManager.enablePreview,
        });
      } catch (err) {
        this.handleError(err, req, res)
      }
    });

    this.router.post("/settings", async (req, res) => {
      /*
      #swagger.path = '/gamepad/settings'
      #swagger.tags = ['Gamepad'],
      #swagger.description = "Set gamepad settings"

      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = GamepadSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        await Promise.all([
          this.protogen.gamepadManager.setTypePersistently(data.type),
          this.protogen.gamepadManager.setEnablePreviewPersistently(data.enablePreview),
        ]);

        res.json({ type: data.type, enablePreview: data.enablePreview });
      } catch (err) {
        this.handleError(err, req, res)
      }
    });
  }
}

const GamepadSettingsSchema = z.object({
  type: z.nativeEnum(GamepadType),
  enablePreview: z.boolean(),
});