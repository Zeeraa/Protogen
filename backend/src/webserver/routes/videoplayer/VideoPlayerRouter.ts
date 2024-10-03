import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { SavedVideo } from "../../../database/models/videoplayer/SavedVideos.model";
import { Equal } from "typeorm";
import { VideoDownloadJob } from "../../../remote-worker/RemoteWorker";

export class VideoPlayerRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/video_player");

    const savedVideoRepo = this.protogen.database.dataSource.getRepository(SavedVideo);

    //#region Playback management
    this.router.get("/status", async (req, res) => {
      /*
      #swagger.path = '/video_player/status'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Get the status of the video playback manager"
      #swagger.responses[200] = { description: "Ok" }
      */
      try {
        res.json({
          hasDownloadJob: this.playbackManager.monitoredJob != null,
          downloadJobStatus: this.playbackManager.status,
          isPlaying: this.playbackManager.vlcProcess != null,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/play", async (req, res) => {
      /*
      #swagger.path = '/video_player/play'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Download and play a video"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Begin video playback',
        schema: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mirrorVideo: false,
        }
      }
      */
      try {
        const parsed = PlayVideoModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const result = this.playbackManager.playVideo(data.url, data.mirrorVideo);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/stream", async (req, res) => {
      /*
      #swagger.path = '/video_player/stream'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Stream video from a url"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Stream video from url',
        schema: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      }
      */
      try {
        const parsed = StreamVideoModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        this.playbackManager.streamVideo(data.url);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/stop", async (req, res) => {
      /*
      #swagger.path = '/video_player/stop'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Stop the active video playback"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        let result = this.playbackManager.kill();
        res.json({
          didStop: result,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
    //#endregion

    //#region Saved videos
    this.router.get("/saved", async (req, res) => {
      /*
      #swagger.path = '/video_player/saved'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Get all saved videos"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const result = await savedVideoRepo.find({
          order: {
            sortingNumber: "ASC",
            id: "ASC",
          }
        });
        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/saved", async (req, res) => {
      /*
      #swagger.path = '/video_player/saved'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Save a video"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Save video',
        schema: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mirrorVideo: false,
        }
      }
      */
      try {
        const parsed = SavedVideoModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const savedVideo = new SavedVideo();
        savedVideo.sortingNumber = data.sortingNumber || 0;
        savedVideo.name = data.name;
        savedVideo.url = data.url;
        savedVideo.mirrorVideo = data.mirrorVideo;
        savedVideo.isStream = data.isStream;
        savedVideo.hideUrl = data.hideUrl || false;

        const result = await savedVideoRepo.save(savedVideo);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/saved/:id", async (req, res) => {
      /*
      #swagger.path = '/video_player/saved/{id}'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Save a video"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Video not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Update a saved video',
        schema: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mirrorVideo: false,
        }
      }
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Bad request: invalid id provided" });
          return;
        }

        const parsed = UpdateSavedVideoModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const savedVideo = await savedVideoRepo.findOne({
          where: {
            id: Equal(id)
          }
        });

        if (savedVideo == null) {
          res.status(404).send({ message: "Not found" });
          return;
        }

        if (data.sortingNumber != undefined) {
          savedVideo.sortingNumber = data.sortingNumber;
        }

        if (data.name != undefined) {
          savedVideo.name = data.name;
        }

        if (data.url != undefined) {
          savedVideo.url = data.url;
        }

        if (data.mirrorVideo != undefined) {
          savedVideo.mirrorVideo = data.mirrorVideo;
        }

        if (data.isStream != undefined) {
          savedVideo.isStream = data.isStream;
        }

        if (data.hideUrl != undefined) {
          savedVideo.hideUrl = data.hideUrl;
        }

        const result = await savedVideoRepo.save(savedVideo);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/saved/:id", async (req, res) => {
      /*
      #swagger.path = '/video_player/saved/{id}'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Delete a saved video"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Video not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Begin video playback',
        schema: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mirrorVideo: false,
        }
      }
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Bad request: invalid id provided" });
          return;
        }

        const savedVideo = await savedVideoRepo.findOne({
          where: {
            id: Equal(id)
          }
        });

        if (savedVideo == null) {
          res.status(404).send({ message: "Not found" });
          return;
        }

        await savedVideoRepo.delete(savedVideo.id);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/saved/:id/play", async (req, res) => {
      /*
      #swagger.path = '/video_player/saved/{id}/play'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Play a saved video"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[404] = { description: "Video not found" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Bad request: invalid id provided" });
          return;
        }

        const savedVideo = await savedVideoRepo.findOne({
          where: {
            id: Equal(id)
          }
        });

        if (savedVideo == null) {
          res.status(404).send({ message: "Not found" });
          return;
        }

        const isStream = savedVideo.isStream;
        let downloadJob: VideoDownloadJob | null = null;

        if (isStream) {
          await this.protogen.videoPlaybackManager.streamVideo(savedVideo.url);
        } else {
          downloadJob = await this.protogen.videoPlaybackManager.playVideo(savedVideo.url, savedVideo.mirrorVideo);
        }

        res.json({
          isStream: isStream,
          downloadJob: downloadJob,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
    //#endregion
  }

  private get playbackManager() {
    return this.protogen.videoPlaybackManager;
  }
}

const SavedVideoModel = z.object({
  sortingNumber: z.number().optional(),
  name: z.string().trim().min(1).max(255),
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean(),
  isStream: z.boolean(),
  hideUrl: z.boolean().optional(),
});

const UpdateSavedVideoModel = z.object({
  sortingNumber: z.number().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  url: z.string().url().max(1024).optional(),
  mirrorVideo: z.boolean().optional(),
  isStream: z.boolean().optional(),
  hideUrl: z.boolean().optional(),
});

const PlayVideoModel = z.object({
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean(),
});

const StreamVideoModel = z.object({
  url: z.string().url().max(1024),
});