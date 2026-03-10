import { z } from "zod";
import { Request, Response } from "express";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { BluetoothError } from "../../../bluetooth/BluetoothError";

export class BluetoothRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/bluetooth");

    /**
     * List paired devices
     */
    this.router.get("/devices/paired", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices/paired'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "List all paired Bluetooth devices"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const devices = await this.protogen.bluetoothManager.getPairedDevices();
        res.json(devices);
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Get all discovered devices (from most recent scan)
     */
    this.router.get("/devices", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "List all discovered Bluetooth devices"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const devices = await this.protogen.bluetoothManager.getDiscoveredDevices();
        res.json(devices);
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Get info for a specific device
     */
    this.router.get("/devices/:mac", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices/{mac}'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Get info for a specific Bluetooth device by MAC address"
      #swagger.parameters['mac'] = { description: "MAC address of the device", type: "string" }
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Device not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const mac = req.params.mac;
        const device = await this.protogen.bluetoothManager.getDeviceInfo(mac);
        if (!device) {
          res.status(404).send({ message: "Device not found" });
          return;
        }
        res.json(device);
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Start scanning for nearby devices
     */
    this.router.post("/scan", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/scan'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Start scanning for nearby Bluetooth devices"
      #swagger.responses[200] = { description: "Scan started" }
      #swagger.responses[400] = { description: "Bad request: invalid request body" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = ScanRequestModel.safeParse(req.body);
        const duration = parsed.success ? parsed.data.duration : 10;

        // Start the scan in the background, don't await it
        this.protogen.bluetoothManager.startScan(duration);

        res.json({ message: "Scan started", duration });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Stop an in-progress scan
     */
    this.router.delete("/scan", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/scan'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Stop an in-progress Bluetooth scan"
      #swagger.responses[200] = { description: "Scan stopped" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        await this.protogen.bluetoothManager.stopScan();
        res.json({ message: "Scan stopped" });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Get scan status
     */
    this.router.get("/scan", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/scan'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Get the current scan status"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json({ scanning: this.protogen.bluetoothManager.isScanning });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Pair with a device
     */
    this.router.post("/devices/:mac/pair", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices/{mac}/pair'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Pair with a Bluetooth device by MAC address"
      #swagger.parameters['mac'] = { description: "MAC address of the device", type: "string" }
      #swagger.responses[200] = { description: "Device paired" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const mac = req.params.mac;
        await this.protogen.bluetoothManager.pairDevice(mac);
        res.json({ message: "Device paired", macAddress: mac });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Unpair (remove) a device
     */
    this.router.delete("/devices/:mac/pair", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices/{mac}/pair'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Unpair (remove) a Bluetooth device by MAC address"
      #swagger.parameters['mac'] = { description: "MAC address of the device", type: "string" }
      #swagger.responses[200] = { description: "Device unpaired" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const mac = req.params.mac;
        await this.protogen.bluetoothManager.unpairDevice(mac);
        res.json({ message: "Device unpaired", macAddress: mac });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Connect to a device
     */
    this.router.post("/devices/:mac/connect", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices/{mac}/connect'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Connect to a paired Bluetooth device"
      #swagger.parameters['mac'] = { description: "MAC address of the device", type: "string" }
      #swagger.responses[200] = { description: "Device connected" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const mac = req.params.mac;
        await this.protogen.bluetoothManager.connectDevice(mac);
        res.json({ message: "Device connected", macAddress: mac });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Check rfkill status for Bluetooth
     */
    this.router.get("/rfkill", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/rfkill'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Check whether rfkill is blocking Bluetooth"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const status = await this.protogen.bluetoothManager.getRfkillStatus();
        res.json(status);
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Unblock Bluetooth via rfkill (requires NOPASSWD sudoers entry)
     */
    this.router.post("/rfkill/unblock", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/rfkill/unblock'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Unblock Bluetooth via rfkill using sudo"
      #swagger.responses[200] = { description: "Unblocked" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        await this.protogen.bluetoothManager.unblockRfkill();
        res.json({ message: "Bluetooth unblocked" });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });

    /**
     * Disconnect from a device
     */
    this.router.delete("/devices/:mac/connect", async (req, res) => {
      /*
      #swagger.path = '/bluetooth/devices/{mac}/connect'
      #swagger.tags = ['Bluetooth']
      #swagger.description = "Disconnect from a Bluetooth device"
      #swagger.parameters['mac'] = { description: "MAC address of the device", type: "string" }
      #swagger.responses[200] = { description: "Device disconnected" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const mac = req.params.mac;
        await this.protogen.bluetoothManager.disconnectDevice(mac);
        res.json({ message: "Device disconnected", macAddress: mac });
      } catch (err) {
        this.handleBluetoothError(err, req, res);
      }
    });
  }

  /**
   * Handle errors from BluetoothManager — returns the appropriate HTTP status
   * code and message for known BluetoothError instances, falls back to the
   * generic 500 handler for anything else.
   */
  private handleBluetoothError(err: any, req: Request, res: Response) {
    if (err instanceof BluetoothError) {
      this.protogen.logger.error("BluetoothRouter", err.message);
      if (!res.headersSent) {
        res.status(err.statusCode).send({ message: err.message });
      }
      return;
    }
    this.handleError(err, req, res);
  }
}

const ScanRequestModel = z.object({
  duration: z.number().min(1).max(60).optional().default(10),
});