import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class HudRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/hud");

    this.router.post("/set-enabled", async (req, res) => {
      /*
      #swagger.path = '/hud/set-enabled'
      #swagger.tags = ['HUD'],
      #swagger.description = "Enable/Disable hud"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Enable/Disable hud',
        schema: {
          enabled: true
        }
      }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = HudStatusModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        await this.protogen.serial.setPersistentHUDState(data.enabled);

        res.json({
          enabled: data.enabled
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const HudStatusModel = z.object({
  enabled: z.boolean(),
});