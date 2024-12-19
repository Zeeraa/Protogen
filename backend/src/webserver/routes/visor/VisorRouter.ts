import { Equal } from "typeorm";
import { CustomFace } from "../../../database/models/visor/CustomFace.model";
import { VisorRenderer } from "../../../visor/rendering/VisorRenderer";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { z } from "zod";
import { CustomImageRenderer } from "../../../visor/rendering/renderers/customimage/CustomImageRenderer";
import { existsSync } from "fs";
import { uuidv7 } from "uuidv7";
import { cyan } from "colors";

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
        const renderLocks = this.protogen.visor.renderLocks;

        res.json({
          activeRenderer: activeRenderer,
          hasRenderLock: renderLocks.length > 0,
          renderLocks: renderLocks,
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

    this.router.get("/renderers/:id", async (req, res) => {
      /*
      #swagger.path = '/visor/renderers/{id}'
      #swagger.tags = ['Visor'],
      #swagger.description = "Get renderer by id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Renderer not found" }
      */
      try {
        const renderer = this.protogen.visor.availableRenderers.find(r => r.id == req.params.id);
        if (renderer == null) {
          res.status(404).send({ message: "Not found" });
          return;
        }

        res.json(rendererToInfo(renderer));
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

    this.router.put("/renderers/:id/customisable-image-renderer-data", async (req, res) => {
      /*
      #swagger.path = '/visor/renderers/{id}/customisable-image-renderer-data'
      #swagger.tags = ['Visor'],
      #swagger.description = "Alter customisable image renderer. Gives an error if renderer is of the incorrect type"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request: see response for details" }
      #swagger.responses[404] = { description: "Renderer not found" }
      */
      try {
        const id = req.params.id;

        const parsed = SaveImageRendererModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const repo = await this.protogen.database.dataSource.getRepository(CustomFace);
        const face = await repo.findOne({
          where: {
            uuid: Equal(id),
          },
        });

        if (face == null) {
          res.status(404).send({ message: "Renderer not found or the id is of another renderer type" });
          return;
        }

        const imageFull = data.image == null ? null : this.protogen.imageDirectory + "/" + data.image.substring(0, 2) + "/" + data.image;
        if (imageFull != null) {
          if (!existsSync(imageFull)) {
            res.status(404).send({ message: "Image not found" });
            return;
          }
        }

        const renderer = this.protogen.visor.availableRenderers.find(r => r.id == id) as CustomImageRenderer | null;
        if (renderer != null) {
          renderer.rename(data.name);
          renderer.mirrorImage = data.mirrorImage;
          renderer.flipRightSide = data.flipRightSide;
          renderer.flipLeftSide = data.flipLeftSide;

          await renderer.setImageAsync(imageFull);
        }

        face.name = data.name;
        face.image = data.image!;
        face.mirrorImage = data.mirrorImage;
        face.flipRightSide = data.flipRightSide;
        face.flipLeftSide = data.flipLeftSide;

        const result = await repo.save(face);

        res.json(result);
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.delete("/renderers/:id/customisable-image-renderer-data", async (req, res) => {
      /*
      #swagger.path = '/visor/renderers/{id}/customisable-image-renderer-data'
      #swagger.tags = ['Visor'],
      #swagger.description = "Delete custom image renderer"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request: see response for details" }
      #swagger.responses[404] = { description: "Renderer not found" }
      */
      try {
        const id = req.params.id;

        const repo = await this.protogen.database.dataSource.getRepository(CustomFace);
        const face = await repo.findOne({
          where: {
            uuid: Equal(id),
          },
        });

        if (face == null) {
          res.status(404).send({ message: "Renderer not found or the id is of another renderer type" });
          return;
        }


        const renderer = this.protogen.visor.availableRenderers.find(r => r.id == id) as CustomImageRenderer | null;
        if (renderer != null) {
          const other = this.protogen.visor.availableRenderers.find(r => r.id != id);
          other?.activate();
          this.protogen.visor.removeRenderer(renderer.id);
        }

        await repo.delete(face.uuid);
        res.json({});
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });

    this.router.post("/renderers/new-image-renderer", async (req, res) => {
      /*
      #swagger.path = '/visor/renderers/new-image-renderer'
      #swagger.tags = ['Visor'],
      #swagger.description = "Create empty custom image renderer"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        const repo = await this.protogen.database.dataSource.getRepository(CustomFace);
        const face = new CustomFace();
        face.uuid = uuidv7();
        face.name = "New image";
        const result = await repo.save(face);

        this.protogen.visor.activeRenderer

        const renderer = new CustomImageRenderer(this.protogen.visor, face.uuid, face.name, null, face.mirrorImage, face.flipRightSide, face.flipLeftSide);
        this.protogen.logger.info("Visor", "Adding blank image renderer " + cyan(face.uuid));
        this.protogen.visor.availableRenderers.push(renderer);

        res.json({ id: result.uuid });
      } catch (err) {
        return this.handleError(err, req, res);
      }
    });
  }
}

function rendererToInfo(renderer: VisorRenderer) {
  return {
    name: renderer.name,
    id: renderer.id,
    preview: renderer.getPreviewImage(),
    type: renderer.type,
    metadata: renderer.metadata,
  }
}

const SaveImageRendererModel = z.object({
  name: z.string().trim().min(1).max(255),
  image: z.string().trim().min(1).max(255).regex(
    /^[a-fA-F0-9]{64}\.(png|gif)$/,
    "File name must be a SHA-256 hash with a .png or .gif extension."
  ).nullable(),
  mirrorImage: z.boolean(),
  flipRightSide: z.boolean(),
  flipLeftSide: z.boolean(),
})