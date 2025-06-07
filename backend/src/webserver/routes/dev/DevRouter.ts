import { EmulatedHardwareImplementation, EmulatedHardwareState } from "../../../hardware/emulated/EmulatedHardwareImplementation";
import { HardwareType } from "../../../hardware/HardwareType";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class DevRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/dev");

    this.router.get("/hw-emulation", async (_, res) => {
      /*
      #swagger.path = '/dev/hw-emulation'
      #swagger.tags = ['Development'],
      #swagger.description = "Get details about hardware emulation"
      #swagger.responses[200] = { description: "Ok" }
      */
      const emulationEnabled = this.protogen.hardwareAbstractionLayer.hardwareType == HardwareType.EMULATED;
      let emulatedHardwareState: EmulatedHardwareState | null = null;

      if (emulationEnabled) {
        const hal = this.protogen.hardwareAbstractionLayer as EmulatedHardwareImplementation;
        emulatedHardwareState = hal.getEmulatedState();
      }

      res.json({
        hwEmulationEnabled: emulationEnabled,
        state: emulatedHardwareState,
      });
    });
  }
}
