import { z } from "zod";
import { Request, Response } from "express";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { WifiError } from "../../../network-manager/WifiError";

export class WifiRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/wifi");

    // Require admin / super-user permissions for all Wi-Fi endpoints in this router
    this.router.use((req, res, next) => {
      if (!req.auth || !req.auth.isSuperUser) {
        res.status(403).json({ message: "Admin permission required for Wi-Fi management" });
        return;
      }
      next();
    });

    /**
     * Get all saved Wi-Fi connections
     */
    this.router.get("/networks", async (req, res) => {
      /*
      #swagger.path = '/wifi/networks'
      #swagger.tags = ['Wifi']
      #swagger.description = "List all saved Wi-Fi connection profiles"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const networks = await this.protogen.networkManager.wifiProvider.getSavedNetworks();
        res.json(networks);
      } catch (err) {
        this.handleWifiError(err, req, res);
      }
    });

    /**
     * Add a new Wi-Fi network profile
     */
    this.router.post("/networks", async (req, res) => {
      /*
      #swagger.path = '/wifi/networks'
      #swagger.tags = ['Wifi']
      #swagger.description = "Add a new Wi-Fi connection profile"
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Wi-Fi connection credentials',
        required: true,
        schema: { $ref: '#/definitions/WifiCredentials' }
      }
      #swagger.responses[200] = { description: "Wi-Fi network created" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = WifiCredentialsModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
          return;
        }

        const data = parsed.data;
        const uuid = await this.protogen.networkManager.wifiProvider.addNetwork(
          data.name,
          data.ssid,
          data.security,
          data.password,
          data.autoconnect,
          data.autoconnectPriority
        );

        res.json({ message: "Wi-Fi network created", uuid });
      } catch (err) {
        this.handleWifiError(err, req, res);
      }
    });

    /**
     * Edit an existing Wi-Fi network profile
     */
    this.router.put("/networks/:uuid", async (req, res) => {
      /*
      #swagger.path = '/wifi/networks/{uuid}'
      #swagger.tags = ['Wifi']
      #swagger.description = "Edit an existing Wi-Fi connection profile"
      #swagger.parameters['uuid'] = { description: "UUID of the profile", type: "string" }
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Wi-Fi connection updates',
        required: true,
        schema: { $ref: '#/definitions/WifiCredentials' }
      }
      #swagger.responses[200] = { description: "Wi-Fi network updated" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const uuid = req.params.uuid;
        const parsed = WifiCredentialsModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
          return;
        }

        const data = parsed.data;
        await this.protogen.networkManager.wifiProvider.editNetwork(
          uuid,
          data.name,
          data.ssid,
          data.security,
          data.password,
          data.autoconnect,
          data.autoconnectPriority
        );

        res.json({ message: "Wi-Fi network updated", uuid });
      } catch (err) {
        this.handleWifiError(err, req, res);
      }
    });

    /**
     * Delete a Wi-Fi connection profile
     */
    this.router.delete("/networks/:uuid", async (req, res) => {
      /*
      #swagger.path = '/wifi/networks/{uuid}'
      #swagger.tags = ['Wifi']
      #swagger.description = "Delete a Wi-Fi connection profile by UUID"
      #swagger.parameters['uuid'] = { description: "UUID of the connection profile", type: "string" }
      #swagger.responses[200] = { description: "Wi-Fi profile deleted" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const uuid = req.params.uuid;
        await this.protogen.networkManager.wifiProvider.deleteNetwork(uuid);
        res.json({ message: "Wi-Fi profile deleted", uuid });
      } catch (err) {
        this.handleWifiError(err, req, res);
      }
    });

    /**
     * Connect to a Wi-Fi network profile (activate connection)
     */
    this.router.post("/networks/:uuid/connect", async (req, res) => {
      /*
      #swagger.path = '/wifi/networks/{uuid}/connect'
      #swagger.tags = ['Wifi']
      #swagger.description = "Activate/connect a Wi-Fi connection profile"
      #swagger.parameters['uuid'] = { description: "UUID of the profile", type: "string" }
      #swagger.responses[200] = { description: "Wi-Fi connection requested" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const uuid = req.params.uuid;
        await this.protogen.networkManager.wifiProvider.connectNetwork(uuid);
        res.json({ message: "Wi-Fi connection activated", uuid });
      } catch (err) {
        this.handleWifiError(err, req, res);
      }
    });

    /**
     * Disconnect from a Wi-Fi network profile (deactivate connection)
     */
    this.router.post("/networks/:uuid/disconnect", async (req, res) => {
      /*
      #swagger.path = '/wifi/networks/{uuid}/disconnect'
      #swagger.tags = ['Wifi']
      #swagger.description = "Deactivate/disconnect a Wi-Fi connection profile"
      #swagger.parameters['uuid'] = { description: "UUID of the profile", type: "string" }
      #swagger.responses[200] = { description: "Wi-Fi disconnection requested" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const uuid = req.params.uuid;
        await this.protogen.networkManager.wifiProvider.disconnectNetwork(uuid);
        res.json({ message: "Wi-Fi connection deactivated", uuid });
      } catch (err) {
        this.handleWifiError(err, req, res);
      }
    });
  }

  private handleWifiError(err: any, req: Request, res: Response) {
    if (err instanceof WifiError) {
      this.protogen.logger.error("WifiRouter", err.message);
      if (!res.headersSent) {
        res.status(err.statusCode).send({ message: err.message });
      }
      return;
    }
    this.handleError(err, req, res);
  }
}

const WifiCredentialsModel = z.object({
  name: z.string().min(1),
  ssid: z.string().min(1),
  security: z.enum(["wpa-psk", "open"]),
  password: z.string().optional(),
  autoconnect: z.boolean().optional().default(true),
  autoconnectPriority: z.number().int().optional().default(0)
});
