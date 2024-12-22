import { Request, Response } from "express";
import { Server } from "../../Server";
import { RouterBase } from "../RouterBase";
import { VideoDownloadJobModel } from "../../dto/comment/VideoDownloadJob";
import { existsSync } from "fs";
import { resolve } from "path";

export class VideoDownloaderRouter extends RouterBase {
  constructor(server: Server) {
    super(server, "/video_downloader");

    this.router.get("/download/:hash", async (req: Request, res: Response) => {
      /*
      #swagger.path = '/video_downloader/download/{Hash}'
      #swagger.tags = ['Video downloader'],
      #swagger.description = "Download the output of a video download job"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Invalid file hash provided" }
      #swagger.responses[403] = { description: "Auth failed" }
      #swagger.responses[404] = { description: "File not found" }
      #swagger.responses[500] = { description: "Internal server error occured. See backend console for more info" }
      */

      try {
        const hash = String(req.params.hash).split(".")[0].toLowerCase(); // Dont care about file type

        if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
          return res.status(400).send({ message: "Hash is not valid" });
        }

        const path = resolve(server.videoDownloadManager.storageFolder + "/" + hash.substring(0, 2) + "/" + hash + "." + server.videoDownloadManager.videoFileExtension);

        if (!existsSync(path)) {
          return res.status(404).send({ message: "Video file not found" });
        }

        res.sendFile(path);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/job/:jobId", async (req: Request, res: Response) => {
      /*
      #swagger.path = '/video_downloader/job/{JobID}'
      #swagger.tags = ['Video downloader'],
      #swagger.description = "Get all comments"
      #swagger.responses[200] = { description: "Job status sent" }
      #swagger.responses[403] = { description: "Auth failed" }
      #swagger.responses[404] = { description: "Job not found" }
      #swagger.responses[500] = { description: "Internal server error occured. See backend console for more info" }
      */
      try {
        const id = req.params.jobId;

        const job = await server.videoDownloadManager.getJobById(id);

        if (job == null) {
          return res.status(404).send({ message: "Job with id " + id + " not found" });
        }

        res.json(job);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/job", async (req: Request, res: Response) => {
      /*
      #swagger.path = '/video_downloader/job'
      #swagger.tags = ['Video downloader'],
      #swagger.parameters['body'] = {
          in: 'body',
          description: 'Create a comment',
          schema: { $ref: '#/definitions/VideoDownloaderJobDTO' }
      }
      #swagger.description = "Begins a new download job"
      #swagger.responses[200] = { description: "Download job started" }
      #swagger.responses[400] = { description: "Invalid post body sent to the server. Check response for details" }
      #swagger.responses[403] = { description: "Auth failed" }
      #swagger.responses[500] = { description: "Internal server error occured. See backend console for more info" }
      */

      try {
        const parsed = VideoDownloadJobModel.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
        }
        const data = parsed.data;

        const existingJob = await server.videoDownloadManager.findExistingJob(data);

        if (existingJob != null) {
          return res.json(existingJob);
        }

        const job = await server.videoDownloadManager.createJob(data);

        res.json(job);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}
