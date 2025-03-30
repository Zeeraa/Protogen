import { cyan, green, red } from "colors";
import { Protogen } from "../Protogen";
import { VideoDownloadJob, VideoDownloadJobStatus } from "../remote-worker/RemoteWorker";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { ChildProcess, exec } from "child_process";
import { sleep } from "../utils/Utils";
import { VideoCache } from "../database/models/video-player/VideoCache.model";
import { generateSHA256 } from "../utils/Hashing";
import { Equal } from "typeorm";

const LockName = "ProtogenVideoPlaybackManager";

export class ProtogenVideoPlaybackManager {
  private _protogen;
  private _monitoredJob: VideoDownloadJob | null;
  private _canceled: boolean = false;
  private _nextCheck: number = 0;
  private _status: VideoDownloadJobStatus | null = null;
  private _videoDirectory;
  private _vlcProcess: ChildProcess | null = null;
  private _isDownloading = false;

  constructor(protogen: Protogen, videoDirectory: string) {
    this._protogen = protogen;
    this._videoDirectory = videoDirectory;
    if (!existsSync(videoDirectory)) {
      mkdirSync(videoDirectory);
    }
    this.tick();
  }

  private get ftConfig() {
    return this.protogen.config.flaschenTaschen;
  }

  private get ledConfig() {
    return this.protogen.config.ledMatrix;
  }

  public get protogen() {
    return this._protogen;
  }

  public get isDownloading() {
    return this._isDownloading;
  }

  get isPlaying() {
    if (this.vlcProcess != null) {
      return this.vlcProcess.exitCode == null;
    }
    return false;
  }

  private async tick() {
    if (this._nextCheck <= 0) {
      this._nextCheck = 20;
      try {
        if (!this._canceled) {
          if (this._monitoredJob != null) {
            const job = await this.protogen.remoteWorker.getJob(this._monitoredJob.jobId);
            if (job == null) {
              this.protogen.logger.error("VideoPlaybackManager", "Job with ID " + this._monitoredJob.jobId + " was not found");
            } else {
              this._monitoredJob = job;
            }
            if (this._status != this._monitoredJob!.status) {
              this.protogen.logger.info("VideoPlaybackManager", "Job with ID " + this._monitoredJob!.jobId + " changed status from " + this._status + " to " + this._monitoredJob!.status);
              this._status = this._monitoredJob!.status;
            }

            //console.debug("Status: " + this._monitoredJob.status);
            if (this._monitoredJob!.status == VideoDownloadJobStatus.DONE) {
              this.protogen.logger.info("VideoPlaybackManager", "Job with ID " + this._monitoredJob!.jobId + " is done. Attempting to download it and start playback");
              const hash = this._monitoredJob!.outputHash;
              const urlHash = generateSHA256(this._monitoredJob!.videoUrl);
              const jobId = this._monitoredJob!.jobId;

              const settingsHash = this.generateSettingsHash(this._monitoredJob!.mirrorVideo, this._monitoredJob!.flipVideo);
              this._monitoredJob = null;
              if (hash == null) {
                throw new Error("Video hash was null after success");
              }

              const repo = this.protogen.database.dataSource.getRepository(VideoCache);
              // Check if a cache entry already exists
              const existingEntry = await repo.findOne({
                where: {
                  hash: Equal(hash),
                  urlHash: Equal(urlHash),
                  settingsHash: Equal(settingsHash),
                },
              });

              if (existingEntry == null) {
                const entry = new VideoCache();
                entry.hash = hash;
                entry.urlHash = urlHash;
                entry.settingsHash = settingsHash;
                entry.jobId = jobId;
                await repo.save(entry);
              }

              await this.downloadAndStartPlayback(hash);
            } else if (this._monitoredJob!.status == VideoDownloadJobStatus.FAILED) {
              this.protogen.logger.error("VideoPlaybackManager", "Job with ID " + this._monitoredJob!.jobId + " failed with message " + this._monitoredJob!.errorMessage);
              this._monitoredJob = null;
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      this._nextCheck--;
    }

    setTimeout(() => {
      this.tick();
    }, 100);
  }

  private async downloadAndStartPlayback(hash: string): Promise<boolean> {
    const targetDirectory = this._videoDirectory + "/" + hash.substring(0, 2);
    if (!existsSync(targetDirectory)) {
      mkdirSync(targetDirectory, { recursive: true });
    }

    const output = targetDirectory + "/" + hash + ".mp4";
    if (existsSync(output)) {
      this.protogen.logger.info("VideoPlaybackManager", "Video already in cache. Skipping download");
    } else {
      try {
        this._isDownloading = true;
        await this.protogen.remoteWorker.downloadVideo(hash, output);
        this._isDownloading = false;
      } catch (err) {
        this.protogen.logger.error("VideoPlaybackManager", "An error occured while downloading video. " + (err as any).message);
        this._isDownloading = false;
        console.log(err);
      }
    }

    await this.killAndAwait();
    this.startPlayback(resolve(output));
    return true;
  }

  async playVideoCached(url: string, mirror: boolean, flip: boolean): Promise<VideoDownloadJob> {
    const urlHash = generateSHA256(url);
    const settingsHash = this.generateSettingsHash(mirror, flip);
    const repo = this.protogen.database.dataSource.getRepository(VideoCache);
    const entry = await repo.findOne({
      where: {
        urlHash: Equal(urlHash),
        settingsHash: Equal(settingsHash),
      },
    });

    if (entry != null) {
      this.protogen.logger.info("VideoPlaybackManager", "Starting download/playback from local cache");
      await this.downloadAndStartPlayback(entry.hash);
      return {
        jobId: entry.jobId,
        videoUrl: url,
        mirrorVideo: mirror,
        flipVideo: flip,
        outputHash: entry.hash,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        status: VideoDownloadJobStatus.DONE,
      }
    } else {
      return await this.playVideo(url, mirror, flip);
    }
  }

  async removeDeletedCache() {
    this.protogen.logger.info("VideoPlaybackManager", "Cheching video cache for deleted files...");
    const repo = this.protogen.database.dataSource.getRepository(VideoCache);
    const entries = await repo.find();
    for (const entry of entries) {
      const targetDirectory = this._videoDirectory + "/" + entry.hash.substring(0, 2);
      const output = targetDirectory + "/" + entry.hash + ".mp4";
      if (!existsSync(output)) {
        this.protogen.logger.info("VideoPlaybackManager", "Deleting video cache entry " + cyan(entry.hash) + " becuse the video file was no longer found locally");
        await repo.delete(entry.id);
      }
    }
  }

  private async killAndAwait() {
    // Kill existing before starting new playback
    if (this.kill()) {
      let didExit = false;
      for (let i = 0; i < 50; i++) {
        if (this.vlcProcess == null) {
          didExit = true;
          break;
        }
        await sleep(100);
      }

      if (!didExit) {
        // Failed to close VLC. Try to taskkill it and wait 1 second
        this.protogen.logger.warn("VideoPlaybackManager", "Vlc process did not exit after kill attempt");
        try {
          exec("killall vlc");
        } catch (err) {
          console.error(err);
        }
        this._vlcProcess = null;
        await sleep(1000);
      }
    }
  }

  private startPlayback(source: string) {
    const vlcPath = "vlc";
    const ftHost = this.ftConfig.host;

    try {
      this.protogen.visor.appendRenderLock(LockName);

      const commandline = vlcPath + " --play-and-exit --vout flaschen --flaschen-display=" + ftHost + " --flaschen-width=" + this.ledConfig.width + " --flaschen-height=" + this.ledConfig.height + " " + source;
      console.debug(commandline);

      this._vlcProcess = exec(commandline);
      this._vlcProcess.on('exit', (code) => {
        this.protogen.logger.info("VideoPlaybackManager", `VLC exited with code: ${code}`);
        this._vlcProcess = null;
        this.protogen.visor.removeRenderLock(LockName);
      });
    } catch (err) {
      this.protogen.visor.removeRenderLock(LockName);
      console.error(err);
      this.protogen.logger.error("VideoPlaybackManager", "An error occured when starting vlc playback. " + (err as any).message);
    }
  }

  public kill(stopTrackingJob = true) {
    let didStopTracking = false;
    if (this._monitoredJob != null && stopTrackingJob) {
      this._monitoredJob = null;
      didStopTracking = true;
    }

    if (this._vlcProcess != null) {
      this._vlcProcess.kill();
      return true;
    }
    return didStopTracking;
  }

  public async streamVideo(url: string) {
    await this.killAndAwait();
    this.startPlayback(url);
  }

  public async playVideo(url: string, mirror: boolean = false, flip: boolean = false): Promise<VideoDownloadJob> {
    this._canceled = false;

    this.protogen.logger.info("VideoPlaybackManager", "Requesting job for video " + cyan(url) + ". Mirror: " + (mirror ? green("true") : red("false")));
    const job = await this.protogen.remoteWorker.createJob(url, mirror, flip);
    this.protogen.logger.info("VideoPlaybackManager", "Job ID is " + job.jobId);
    if (!this._canceled) {
      this._monitoredJob = job;
      this._nextCheck = 0;
    }
    return job;
  }

  generateSettingsHash(mirror: boolean, flip: boolean): string {
    const settingsString = "mirror=" + String(mirror) + ",flip=" + String(flip);
    return generateSHA256(settingsString);
  }

  public get status() {
    return this._status;
  }

  public get monitoredJob() {
    return this._monitoredJob;
  }

  public get vlcProcess() {
    return this._vlcProcess;
  }

  public get videoDirectory() {
    return this._videoDirectory;
  }
}
