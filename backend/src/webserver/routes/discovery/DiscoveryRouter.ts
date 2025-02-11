import { networkInterfaces } from "os";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { Request, Response } from "express";

export class DiscoveryRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/discovery");

    this.router.get("/", async (_, res) => {
      /*
      #swagger.path = '/discovery'
      #swagger.tags = ['Discovery'],
      #swagger.description = "Get session id. Used to discover device on local network"
      #swagger.responses[200] = { description: "Ok" }
      */
      res.json({
        sessionId: this.protogen.sessionId,
      });
    });

    this.router.get("/remote-key", [this.authMiddleware], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/discovery/remote-key'
      #swagger.tags = ['Discovery'],
      #swagger.description = "Get key for remote socket communication"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        res.send({
          key: this.protogen.remoteManager.stateReportingKey,
        })
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/certificate", [this.authMiddleware], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/discovery/certificate'
      #swagger.tags = ['Discovery'],
      #swagger.description = "Download the self signed certificate for secure local network communication"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        res.sendFile(this.webServer.internalHttpsPublicKeyFile);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/interfaces", [this.authMiddleware], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/discovery/interfaces'
      #swagger.tags = ['Discovery'],
      #swagger.description = "Find potential ip addresses to use for direct communication"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const interfaces = networkInterfaces();
        const netWinterfaces: NetInterface[] = [];

        Object.keys(interfaces).forEach(name => {
          interfaces[name]?.forEach(netInterface => {
            if (netInterface.internal) {
              return;
            }

            if (netInterface.family == "IPv4") {
              netWinterfaces.push({
                name: name,
                address: netInterface.address,
                mac: netInterface.mac,
              });
            }
          })
        });

        res.json({
          httpsSupported: this.webServer.isLocalHttpsServerRunning,
          httpsPort: this.protogen.config.web.localHttpsPort || null,
          httpPort: this.protogen.config.web.port,
          interfaces: netWinterfaces,
          sessionId: this.protogen.sessionId,
        })
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

interface NetInterface {
  name: string;
  address: string;
  mac: string;
}
