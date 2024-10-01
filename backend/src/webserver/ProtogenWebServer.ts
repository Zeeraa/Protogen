import { Protogen } from "../Protogen";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { cyan } from "colors";
import { z } from "zod";

export class ProtogenWebServer {
  private _protogen;
  private _express;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._express = express();
    this.express.use(cors())
    this.express.use(bodyParser.json());

    this._express.post("/play_video", async (req, res) => {
      const parsed = VideoDownloadJobModel.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
        return;
      }

      const data = parsed.data;

      this.protogen.videoPlaybackManager.playVideo(data.url, data.mirrorVideo);

      res.json({});
    });

    this._express.post("/kill_video", async (req, res) => {
      this.protogen.videoPlaybackManager.kill();
      res.json({});
    })
  }

  public init() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.express.listen(this.config.port, () => {
          this.protogen.logger.info("WebServer", "Listening on port " + cyan(String(this.config.port)));
        });
        resolve();
      } catch (err) {
        this.protogen.logger.error("WebServer", "Failed to start express");
        reject(err);
      }
    });
  }

  private get config() {
    return this.protogen.config.web;
  }

  public get express() {
    return this._express;
  }

  public get protogen() {
    return this._protogen;
  }
}

export const VideoDownloadJobModel = z.object({
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean()
});

export type VideoDownloadJobDTO = z.infer<typeof VideoDownloadJobModel>;