import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class VideoPlayerRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/video_player");

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

        this.playbackManager.playVideo(data.url, data.mirrorVideo);

        res.json({ status: "ok" });
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
        description: 'Begin video playback',
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

        res.json({ status: "ok" });
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
  }

  private get playbackManager() {
    return this.protogen.videoPlaybackManager;
  }
}

const PlayVideoModel = z.object({
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean(),
});

const StreamVideoModel = z.object({
  url: z.string().url().max(1024),
});