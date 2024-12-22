import { Request, Response } from "express";
import { Server } from "../../Server";
import { RouterBase } from "../RouterBase";
import { existsSync, mkdirSync } from "fs";
import fileUpload from "express-fileupload";

export class GifProcessorRouter extends RouterBase {
  constructor(server: Server) {
    super(server, "/gif_processor");

    const tempDirectory = this.server.gifProcessor.dataDirectory + "/temp";

    if (!existsSync(tempDirectory)) {
      mkdirSync(tempDirectory);
    }

    this.router.post("/submit", fileUpload({
      useTempFiles: true,
      tempFileDir: tempDirectory,
    }), async (req: Request, res: Response) => {
      /*
      #swagger.path = '/gif_processor/submit'
      #swagger.tags = ['Gif processor'],
      #swagger.description = "Turn a gif into the json format in use to save on resources"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad reqauest. See response for details" }
      #swagger.responses[403] = { description: "Auth failed" }
      #swagger.responses[500] = { description: "Internal server error occured. See backend console for more info" }
      */
      try {
        if (!req.files?.file) {
          res.status(400).send({ message: "No faile named \"file\" was uploaded" });
          return;
        }
        const file = req.files.file as fileUpload.UploadedFile;

        if (file.mimetype != "image/gif") {
          res.status(400).send({ message: "Unexpected mime type" });
          return;
        }

        const width = parseInt(String(req.query.width));
        if (isNaN(width)) {
          res.status(400).send({ message: "Missing query or invalid parameter: width" });
          return;
        }

        const height = parseInt(String(req.query.height));
        if (isNaN(height)) {
          res.status(400).send({ message: "Missing query or invalid parameter: height" });
          return;
        }

        if (width <= 0 || width > 2048) {
          res.status(400).send({ message: "Width out of bounds" });
          return;
        }

        if (height <= 0 || height > 2048) {
          res.status(400).send({ message: "Height out of bounds" });
          return;
        }

        const result = await this.server.gifProcessor.handleGif(file.tempFilePath, width, height);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}
