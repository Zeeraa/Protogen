import { getCPUUsage, getOSVersion, getRAMUsage, getTemperature, restartFlaschenTaschen, shutdown } from "../../../utils/SystemUtils";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

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

    this.router.post("/restart-flaschen-taschen", async (req, res) => {
      /*
      #swagger.path = '/system/restart-flaschen-taschen'
      #swagger.tags = ['System'],
      #swagger.description = "Restart the flaschen-taschen service"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while executing command" }
      */
      try {
        await restartFlaschenTaschen();
        res.json({});
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });
  }
}