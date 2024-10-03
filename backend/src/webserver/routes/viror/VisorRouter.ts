import { VisorRenderer } from "../../../visor/rendering/VisorRenderer";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class VisorRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/visor");

    this.router.get("/status", async (req, res) => {
      /*
      #swagger.path = '/visor/status'
      #swagger.tags = ['Visor'],
      #swagger.description = "Get the visor service status"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        const activeRenderer = this.protogen.visor.activeRenderer == null ? null : rendererToInfo(this.protogen.visor.activeRenderer);

        res.json({
          activeRenderer: activeRenderer,
          hasRenderLock: this.protogen.visor.hasRenderLock,
        });
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.get("/preview", async (req, res) => {
      /*
      #swagger.path = '/visor/preview'
      #swagger.tags = ['Visor'],
      #swagger.description = "Get the last rendered frame of the visor"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        const fameBuffer = this.protogen.visor.lastFrame;
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', fameBuffer.length);
        res.send(fameBuffer);
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.get("/renderers", async (req, res) => {
      /*
      #swagger.path = '/visor/renderers'
      #swagger.tags = ['Visor'],
      #swagger.description = "Get all renderers"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        const renderers = this.protogen.visor.availableRenderers.map(r => rendererToInfo(r));
        res.json(renderers);
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.post("/renderers/:id/activate", async (req, res) => {
      /*
      #swagger.path = '/visor/renderers/{id}/activate'
      #swagger.tags = ['Visor'],
      #swagger.description = "Activate a renderer by its id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Renderer not found" }
      */
      try {
        const renderer = this.protogen.visor.availableRenderers.find(r => r.id == req.params.id);
        if (renderer == null) {
          res.status(404).send({ message: "Not found" });
          return;
        }

        renderer.activate();

        res.json(rendererToInfo(renderer));
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });
  }
}

function rendererToInfo(renderer: VisorRenderer) {
  return {
    name: renderer.name,
    id: renderer.id
  }
}