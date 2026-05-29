import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import fileUpload from "express-fileupload";
import sharp from "sharp";
import { createHash } from "crypto";
import { Request, Response } from "express";
import { resolve } from "path";

export class ImageRouter extends AbstractRouter {
  private faviconCache: Buffer | null = null;

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
        let hash = req.params.hash;
        if (hash.length == 0) {
          res.status(400).send({ message: "Invalid hash length" });
          return;
        }

        if (hash.endsWith(".png") || hash.endsWith(".gif")) {
          hash = hash.split(".")[0];
        }

        const prefix = hash.substring(0, 2)

        const pathNoExt = resolve(this.protogen.imageDirectory + "/" + prefix + "/" + hash);

        if (existsSync(pathNoExt + ".png")) {
          res.sendFile(pathNoExt + ".png");
        } else if (existsSync(pathNoExt + ".gif")) {
          res.sendFile(pathNoExt + ".gif");
        } else {
          res.status(404).send({ message: "File not found" });
        }
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/icon", [
      this.authMiddleware,
      fileUpload({
        useTempFiles: true,
        tempFileDir: this.protogen.tempDirectory,
      })
    ], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/images/icon'
      #swagger.tags = ['Images'],
      #swagger.description = "Upload a custom application icon (png, jpg, webp, gif, avif, bmp, tiff, heic, etc.). Transparency is preserved where supported. Image is scaled to 256x256."
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (!req.files?.file) {
          res.status(400).send({ message: "No file named \"file\" was uploaded" });
          return;
        }
        const file = req.files.file as fileUpload.UploadedFile;

        const allowedMimeTypes = [
          "image/png", "image/jpeg", "image/webp", "image/gif",
          "image/bmp", "image/tiff", "image/avif", "image/svg+xml",
          "image/heic", "image/heif",
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          res.status(400).send({ message: "Unsupported image format" });
          return;
        }

        const dataBuffer = readFileSync(file.tempFilePath);
        const outputBuffer = await sharp(dataBuffer)
          .resize(256, 256)
          .png()
          .toBuffer();

        const iconPath = resolve(this.protogen.imageDirectory + "/custom_icon.png");
        writeFileSync(iconPath, outputBuffer);

        this.faviconCache = null;
        res.send({ message: "Icon updated" });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/icon", this.authMiddleware, async (req: Request, res: Response) => {
      /*
      #swagger.path = '/images/icon'
      #swagger.tags = ['Images'],
      #swagger.description = "Clear the custom application icon, reverting to the default"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "No custom icon set" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const iconPath = resolve(this.protogen.imageDirectory + "/custom_icon.png");
        if (!existsSync(iconPath)) {
          res.status(404).send({ message: "No custom icon is set" });
          return;
        }
        unlinkSync(iconPath);
        this.faviconCache = null;
        res.send({ message: "Icon cleared" });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/icon/icon.png", async (req, res) => {
      /*
      #swagger.path = '/images/icon/icon.png'
      #swagger.tags = ['Images'],
      #swagger.description = "Get the icon of the application"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      */
      try {
        res.sendFile(this.iconFilePath);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });


    this.router.get("/icon/favicon.ico", async (req, res) => {
      /*
      #swagger.path = '/images/icon/favicon.ico'
      #swagger.tags = ['Images'],
      #swagger.description = "Get the favicon of the application"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      */
      try {
        if (!this.faviconCache) {
          this.faviconCache = await this.generateFavicon();
        }
        res.setHeader("Content-Type", "image/x-icon");
        res.send(this.faviconCache);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }

  private async generateFavicon(): Promise<Buffer> {
    const sizes = [16, 32, 48, 64, 128, 256];

    const images = await Promise.all(
      sizes.map(size => sharp(this.iconFilePath).resize(size, size).png().toBuffer())
    );

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);

    const directorySize = images.length * 16;
    const directory = Buffer.alloc(directorySize);
    let currentOffset = 6 + directorySize;

    images.forEach((img, i) => {
      const size = sizes[i];
      const base = i * 16;
      directory.writeUInt8(size === 256 ? 0 : size, base + 0);
      directory.writeUInt8(size === 256 ? 0 : size, base + 1);
      directory.writeUInt8(0, base + 2);
      directory.writeUInt8(0, base + 3);
      directory.writeUInt16LE(1, base + 4);
      directory.writeUInt16LE(32, base + 6);
      directory.writeUInt32LE(img.length, base + 8);
      directory.writeUInt32LE(currentOffset, base + 12);
      currentOffset += img.length;
    });

    return Buffer.concat([header, directory, ...images]);
  }

  private get iconFilePath() {
    let icon = resolve(this.protogen.imageDirectory + "/custom_icon.png");
    if (!existsSync(icon)) {
      icon = resolve("./assets/icon.png");
    }
    return icon;
  }
}
