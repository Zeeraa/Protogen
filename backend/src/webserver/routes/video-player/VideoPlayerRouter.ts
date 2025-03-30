import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { SavedVideo } from "../../../database/models/video-player/SavedVideos.model";
import { Equal } from "typeorm";
import { VideoDownloadJob } from "../../../remote-worker/RemoteWorker";
import { readdirSync, statSync, unlinkSync } from "fs";
import { extname, join } from "path";
import { SavedVideoGroup } from "../../../database/models/video-player/SavedVideoGroup.model";
import { cyan } from "colors";
import { typeAssert } from "../../../utils/Utils";

export class VideoPlayerRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/video_player");

    const savedVideoRepo = this.protogen.database.dataSource.getRepository(SavedVideo);
    const groupRepo = this.protogen.database.dataSource.getRepository(SavedVideoGroup);

    //#region Playback management
    this.router.get("/status", async (req, res) => {
      /*
      #swagger.path = '/video_player/status'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Get the status of the video playback manager"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = PlayVideoModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const result = this.playbackManager.playVideoCached(data.url, data.mirrorVideo, data.flipVideo);

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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const result = this.playbackManager.kill();
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const result = await savedVideoRepo.find({
          order: {
            sortingNumber: "ASC",
            id: "ASC",
          },
          relations: ["group"]
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
      #swagger.responses[400] = { description: "Group not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Save video',
        schema: {
          sortingNumber: 1,
          name: "Test",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mirrorVideo: false,
          isStream: false,
          hideUrl: false,
          groupId: null,
        }
      }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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
        savedVideo.flipVideo = data.flipVideo;

        if (data.groupId == null) {
          savedVideo.group = null;
        } else {
          const group = await groupRepo.findOne({
            where: {
              id: Equal(data.groupId),
            }
          });
          savedVideo.group = group;
        }

        const result = await savedVideoRepo.save(savedVideo);

        this.preProcessJob(result);

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
          sortingNumber: 1,
          name: "Test",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mirrorVideo: false,
          isStream: false,
          hideUrl: false
        }
      }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

        if (data.flipVideo != undefined) {
          savedVideo.flipVideo = data.flipVideo;
        }

        if (data.groupId !== undefined) {
          if (data.groupId === null) {
            savedVideo.group = null;
          } else {
            const group = await groupRepo.findOne({
              where: {
                id: Equal(data.groupId),
              }
            });
            savedVideo.group = group;
          }
        }

        const result = await savedVideoRepo.save(savedVideo);

        this.preProcessJob(result);

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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
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
          downloadJob = await this.protogen.videoPlaybackManager.playVideoCached(savedVideo.url, savedVideo.mirrorVideo, savedVideo.flipVideo);
        }

        res.json({
          ...savedVideo,
          downloadJob: downloadJob,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
    //#endregion

    //#region Groups
    this.router.get("/groups", async (req, res) => {
      /*
      #swagger.path = '/video_player/groups'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Get all video groups"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const result = await groupRepo.find({});
        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/groups", async (req, res) => {
      /*
      #swagger.path = '/video_player/groups'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Greate a group"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Create/Modify a group',
        schema: {
          name: "Test"
        }
      }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = AlterGroupModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const group = new SavedVideoGroup();
        group.name = data.name;

        const result = await groupRepo.save(group);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/groups/:id", async (req, res) => {
      /*
      #swagger.path = '/video_player/groups/{id}'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Edit a group"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[404] = { description: "Group not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Create/Modify a group',
        schema: {
          name: "Test"
        }
      }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Bad request: Id is not a valid number" });
          return;
        }

        const parsed = AlterGroupModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const group = await groupRepo.findOne({
          where: {
            id: Equal(id),
          }
        });

        if (group == null) {
          res.status(400).send({ message: "Group not found" });
          return;
        }

        group.name = data.name;

        const result = await groupRepo.save(group);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/groups/:id", async (req, res) => {
      /*
      #swagger.path = '/video_player/groups/{id}'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Delete a group"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[404] = { description: "Group not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Bad request: Id is not a valid number" });
          return;
        }

        const group = await groupRepo.findOne({
          where: {
            id: Equal(id),
          }
        });

        if (group == null) {
          res.status(400).send({ message: "Group not found" });
          return;
        }

        await groupRepo.remove(group);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
    //#endregion

    //#region Cache
    this.router.delete("/cache", async (req, res) => {
      /*
      #swagger.path = '/video_player/cache'
      #swagger.tags = ['Video Player'],
      #swagger.description = "Clear downloaded video cache"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "Failed to delete files" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const directory = this.protogen.videoPlaybackManager.videoDirectory;

        const files = readdirSync(directory);
        let deletedCount = 0;

        files.forEach(file => {
          const filePath = join(directory, file);
          const stat = statSync(filePath);

          if (stat.isFile() && extname(file).toLowerCase() === '.mp4') {
            unlinkSync(filePath);
            deletedCount++;
          }
        });

        res.json({
          deletedCount: deletedCount,
        });
      } catch (error) {
        console.error('Error while deleting mp4 files:', error);
        this.protogen.logger.error("VideoRouter", "Failed to delete mp4 files. " + typeAssert<any>(error).message);
        throw error;
      }
    });
    //#endregion
  }

  private get playbackManager() {
    return this.protogen.videoPlaybackManager;
  }

  private preProcessJob(video: SavedVideo) {
    this.protogen.remoteWorker.createJob(video.url, video.mirrorVideo, video.flipVideo).then((job) => {
      this.protogen.logger.info("VideoPlayer", "Pre-processing saved video. Job id: " + cyan(job.jobId));
    }).catch(err => {
      console.error(err);
      this.protogen.logger.error("VideoPlayer", "Could not start video pre-processing job");
    })
  }
}

const SavedVideoModel = z.object({
  sortingNumber: z.number().optional(),
  name: z.string().trim().min(1).max(255),
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean(),
  flipVideo: z.boolean(),
  isStream: z.boolean(),
  hideUrl: z.boolean().optional(),
  groupId: z.number().int().safe().nullable(),
});

const UpdateSavedVideoModel = z.object({
  sortingNumber: z.number().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean(),
  flipVideo: z.boolean(),
  isStream: z.boolean().optional(),
  hideUrl: z.boolean().optional(),
  groupId: z.number().int().safe().optional().nullable(),
});

const PlayVideoModel = z.object({
  url: z.string().url().max(1024),
  mirrorVideo: z.boolean(),
  flipVideo: z.boolean(),
});

const StreamVideoModel = z.object({
  url: z.string().url().max(1024),
});

const AlterGroupModel = z.object({
  name: z.string().min(1).max(255),
});
