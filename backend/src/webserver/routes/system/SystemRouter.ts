import { z } from "zod";
import { getCPUUsage, getOSVersion, getRAMUsage, getTemperature, shutdown } from "../../../utils/SystemUtils";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { FlaschenTaschenWriteConfigParams } from "../../../visor/flaschen-taschen/FlaschenTaschen";

export class SystemRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/system");

    this.router.get("/overview", async (req, res) => {
      /*
      #swagger.path = '/system/overview'
      #swagger.tags = ['System'],
      #swagger.description = "Get system overview"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }
      */
      try {
        const cpuTemperature = await getTemperature();
        const osVersion = await getOSVersion();
        const cpuUsage = await getCPUUsage();
        const ramUsage = await getRAMUsage();

        res.json({
          cpuTemperature: cpuTemperature,
          osVersion: osVersion,
          cpuUsage: cpuUsage,
          ramUsage: ramUsage,
          network: {
            hasConnectivity: this.protogen.networkManager.hasConnectivity,
            ip: this.protogen.networkManager.ip,
            isp: this.protogen.networkManager.isp,
          },
          hudEnabled: this.protogen.serial.enableHud,
        });
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.post("/shutdown", async (req, res) => {
      /*
      #swagger.path = '/system/shutdown'
      #swagger.tags = ['System'],
      #swagger.description = "Shutdown the system"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while executing command" }
      */
      try {
        await shutdown();
        res.json({});
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.post("/flaschen-taschen/restart", async (req, res) => {
      /*
      #swagger.path = '/system/flaschen-taschen/restart'
      #swagger.tags = ['System'],
      #swagger.description = "Restart the flaschen-taschen service"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while executing command" }
      */
      try {
        await this.protogen.flaschenTaschen.restart();
        res.json({});
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.get("/flaschen-taschen/settings", async (req, res) => {
      /*
      #swagger.path = '/system/flaschen-taschen/settings'
      #swagger.tags = ['System'],
      #swagger.description = "Get the flaschen taschen settings"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        res.json(this.protogen.flaschenTaschen.settings);
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.put("/flaschen-taschen/settings", async (req, res) => {
      /*
      #swagger.path = '/system/flaschen-taschen/settings'
      #swagger.tags = ['System'],
      #swagger.description = "Update the flaschen taschen settings and restart the service"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response" }
      #swagger.responses[500] = { description: "An error occured while executing command" }
  
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Update flaschen taschen settings',
        schema: {
          ledLimitRefresh: "Max framerate",
          ledSlowdownGpio: "GPIO slowdown value"
        }
      }
      */
      try {
        const parsed = FTSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const config: FlaschenTaschenWriteConfigParams = {};

        if (data.ledLimitRefresh) {
          config.ledLimitRefresh = data.ledLimitRefresh;
        }

        if (data.ledSlowdownGpio) {
          config.ledSlowdownGpio = data.ledSlowdownGpio;
        }

        this.protogen.flaschenTaschen.writeConfiguration(config);
        await this.protogen.flaschenTaschen.restart();

        res.json({});
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });
  }
}

const FTSettingsSchema = z.object({
  ledLimitRefresh: z.coerce.number().int().safe().min(1).max(200),
  ledSlowdownGpio: z.coerce.number().int().safe().min(0).max(4),
});