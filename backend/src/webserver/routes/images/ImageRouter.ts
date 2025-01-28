import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import fileUpload from "express-fileupload";
import sharp from "sharp";
import { createHash } from "crypto";
import { red } from "colors";
import axios from "axios";
import { Request, Response } from "express";

export class ImageRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/images");

    this.router.post("/", [
      this.authMiddleware,
      fileUpload({
        useTempFiles: true,
        tempFileDir: this.protogen.tempDirectory,
      })
    ], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/images'
      #swagger.tags = ['Images'],
      #swagger.description = "Upload image"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      #swagger.parameters['externalGifProcessing'] = {
        in: 'query',
        description: 'Use external worker to process gifs for less load on the integrated cpu',
        type: 'boolean',
        required: false   
      }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (!req.files?.file) {
          res.status(400).send({ message: "No faile named \"file\" was uploaded" });
          return;
        }
        const file = req.files.file as fileUpload.UploadedFile;

        const dataBuffer = readFileSync(file.tempFilePath);

        const response: any = {};

        if (file.mimetype == "image/gif") {
          const digest = createHash('sha256');
          digest.update(dataBuffer);
          const hash = digest.digest('hex');

          const name = hash + ".gif";
          const parent = this.protogen.imageDirectory + "/" + hash.substring(0, 2);
          const path = parent + "/" + name;

          if (!existsSync(path)) {
            if (!existsSync(parent)) {
              mkdirSync(parent);
            }

            writeFileSync(path, dataBuffer);
          }

          if (String(req.query.externalGifProcessing).toLowerCase() == "true") {
            const size = this.protogen.visor.scale;

            const animationCacheFolder = this.protogen.config.dataDirectory + "/animcache/" + hash.substring(0, 2);
            const cacheFile = animationCacheFolder + "/" + hash + "_" + size.width + "x" + size.height + ".json";

            if (!existsSync(cacheFile)) {
              response["alreadyCached"] = false;
              try {
                this.protogen.logger.info("Image", "Begin remote image processing");
                const cached = await this.protogen.remoteWorker.processGifAsync(path, size.width, size.height);
                this.protogen.logger.info("Image", "Remote image processing done");
                if (!existsSync(animationCacheFolder)) {
                  mkdirSync(animationCacheFolder);
                }
                writeFileSync(cacheFile, JSON.stringify(cached));

                response["externalProcessingOk"] = true;
              } catch (err: any) {
                this.protogen.logger.error("Image", "Processing gif externally failed with error " + red(String(err.message)));
                console.error(err);
                response["externalProcessingOk"] = false;
              }
            } else {
              response["externalProcessingOk"] = true;
              response["alreadyCached"] = true;
            }
          }

          response["resource"] = name;
        } else {
          const outputBuffer = await sharp(dataBuffer).png().toBuffer();

          const digest = createHash('sha256');
          digest.update(outputBuffer);
          const hash = digest.digest('hex');

          const name = hash + ".png";
          const parent = this.protogen.imageDirectory + "/" + hash.substring(0, 2);
          const path = parent + "/" + name;

          if (!existsSync(path)) {
            if (!existsSync(parent)) {
              mkdirSync(parent);
            }

            writeFileSync(path, outputBuffer);
          }

          response["resource"] = name;
        }
        res.send(response);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/get/:hash", async (req, res) => {
      /*
      #swagger.path = '/images/get/{hash}'
      #swagger.tags = ['Images'],
      #swagger.description = "Get an image by its hash"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      */
      try {
        const hash = req.params.hash;
        if (hash.length == 0) {
          res.status(400).send({ message: "Invalid hash length" });
          return;
        }
        const prefix = hash.substring(0, 2)

        const pathNoExt = this.protogen.imageDirectory + "/" + prefix + "/" + hash;

        if (existsSync(pathNoExt + ".png")) {
          res.sendFile(pathNoExt + ".png");
        } else if (existsSync(pathNoExt + ".gif")) {
          res.sendFile(pathNoExt + ".gif");
        } else {
          res.status(404).send({ message: "Faile not found" });
        }
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}