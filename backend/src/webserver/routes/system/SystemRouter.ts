import { z } from "zod";

import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { FlaschenTaschenWriteConfigParams } from "../../../visor/flaschen-taschen/FlaschenTaschen";
import { existsSync, readFileSync } from "fs";
import { KV_Clock24HourFormat, KV_ClockDateColor, KV_ClockShowDate, KV_ClockShowSeconds, KV_ClockTimeColor, KV_EnableSwagger } from "../../../utils/KVDataStorageKeys";
import { decodeRGB, encodeRGB, encodeRGBObject } from "../../../utils/Utils";
import { encode } from "punycode";
import { ClockRenderer, ClockRendererId } from "../../../visor/rendering/renderers/special/ClockRenderer";

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
        const cpuTemperature = await this.protogen.hardwareAbstractionLayer.getCPUTemperature();
        const osVersion = await this.protogen.hardwareAbstractionLayer.getOSVersion();
        const cpuUsage = await this.protogen.hardwareAbstractionLayer.getCPUUsage();
        const ramUsage = await this.protogen.hardwareAbstractionLayer.getRAMUsage();

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
        await this.protogen.hardwareAbstractionLayer.shutdown();
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

    this.router.get("/clock-settings", async (req, res) => {
      /*
      #swagger.path = '/system/clock-settings'
      #swagger.tags = ['System'],
      #swagger.description = "Get clock renderer settings"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const is24HourFormat = await this.protogen.database.getData(KV_Clock24HourFormat);
        const showSeconds = await this.protogen.database.getData(KV_ClockShowSeconds);
        const showDate = await this.protogen.database.getData(KV_ClockShowDate);
        const timeColor = await this.protogen.database.getData(KV_ClockTimeColor);
        const dateColor = await this.protogen.database.getData(KV_ClockDateColor);

        const data = {
          is24HourFormat: is24HourFormat === "true",
          showSeconds: showSeconds === "true",
          showDate: showDate === "true",
          timeColor: timeColor ? decodeRGB(Number(timeColor)) : null,
          dateColor: dateColor ? decodeRGB(Number(dateColor)) : null,
        };

        res.json(data);
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.put("/clock-settings", async (req, res) => {
      /*
      #swagger.path = '/system/clock-settings'
      #swagger.tags = ['System'],
      #swagger.description = "Update clock renderer settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response" }
      #swagger.responses[500] = { description: "An error occured while executing command" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Update clock renderer settings',
        schema: {
          is24HourFormat: true,
          showSeconds: true,
          showDate: true,
          timeColor: { r: 255, g: 255, b: 255 },
          dateColor: { r: 255, g: 255, b: 255 },
        }
      }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = ClockSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;
        const timeColor = encodeRGBObject(data.timeColor);
        const dateColor = encodeRGBObject(data.dateColor);

        await this.protogen.database.setData(KV_Clock24HourFormat, String(data.is24HourFormat));
        await this.protogen.database.setData(KV_ClockShowSeconds, String(data.showSeconds));
        await this.protogen.database.setData(KV_ClockShowDate, String(data.showDate));
        await this.protogen.database.setData(KV_ClockTimeColor, String(timeColor));
        await this.protogen.database.setData(KV_ClockDateColor, String(dateColor));

        const renderer = this.protogen.visor.getRenderer(ClockRendererId) as ClockRenderer | null;
        if (renderer) {
          await renderer.loadSettings();
        }

        res.json(data);
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });
  }
}

const ColorSchema = z.object({
  r: z.coerce.number().int().min(0).max(255),
  g: z.coerce.number().int().min(0).max(255),
  b: z.coerce.number().int().min(0).max(255),
});

const ClockSettingsSchema = z.object({
  is24HourFormat: z.boolean(),
  showSeconds: z.boolean(),
  showDate: z.boolean(),
  timeColor: ColorSchema,
  dateColor: ColorSchema,
});

const FTSettingsSchema = z.object({
  ledLimitRefresh: z.coerce.number().int().safe().min(1).max(1000),
  ledSlowdownGpio: z.coerce.number().int().safe().min(0).max(4),
});

const SwaggerSettingsSchema = z.object({
  enabled: z.boolean(),
});
