import { z } from "zod";
import { getCPUUsage, getOSVersion, getRAMUsage, getTemperature, shutdown } from "../../../utils/SystemUtils";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { FlaschenTaschenWriteConfigParams } from "../../../visor/flaschen-taschen/FlaschenTaschen";
import { existsSync, readFileSync } from "fs";
import { KV_EnableSwagger } from "../../../utils/KVDataStorageKeys";

export class SystemRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/system");

    this.router.get("/logs", async (req, res) => {
      /*
      #swagger.path = '/system/logs'
      #swagger.tags = ['System'],
      #swagger.description = "Get all logs"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const file = this.protogen.logger.sessionLogFile;
        if (existsSync(file)) {
          const content = readFileSync(file).toString();
          res.send(content);
        } else {
          res.send("");
        }
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/session-id", async (_, res) => {
      /*
      #swagger.path = '/system/session-id'
      #swagger.tags = ['System'],
      #swagger.description = "Get the session id"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      res.send({ sessionId: this.protogen.sessionId });
    });

    this.router.post("/stop", async (_, res) => {
      /*
      #swagger.path = '/system/stop'
      #swagger.tags = ['System'],
      #swagger.description = "Exits the service"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      setTimeout(() => {
        process.exit(0);
      }, 200);

      res.status(200).send({
        message: "Shutdown scheduled"
      });
    });

    this.router.get("/overview", async (req, res) => {
      /*
      #swagger.path = '/system/overview'
      #swagger.tags = ['System'],
      #swagger.description = "Get system overview"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const cpuTemperature = await getTemperature();
        const osVersion = await getOSVersion();
        const cpuUsage = await getCPUUsage();
        const ramUsage = await getRAMUsage();

        const swaggerEnabled = (await this.protogen.database.getData(KV_EnableSwagger)) == "true";

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
          hudEnabled: this.protogen.hudManager.enableHud,
          swaggerEnabled: swaggerEnabled,
          backendVersion: this.protogen.versionNumber,
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

    this.router.put("/swagger", async (req, res) => {
      /*
      #swagger.path = '/system/swagger'
      #swagger.tags = ['System'],
      #swagger.description = "Alter swagger settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response" }
      #swagger.responses[500] = { description: "An error occured while executing command" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Enable/Disable swagger',
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
        const parsed = SwaggerSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        await this.protogen.database.setData(KV_EnableSwagger, String(data.enabled));

        res.json({});
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });
  }
}

const FTSettingsSchema = z.object({
  ledLimitRefresh: z.coerce.number().int().safe().min(1).max(1000),
  ledSlowdownGpio: z.coerce.number().int().safe().min(0).max(4),
});

const SwaggerSettingsSchema = z.object({
  enabled: z.boolean(),
});
