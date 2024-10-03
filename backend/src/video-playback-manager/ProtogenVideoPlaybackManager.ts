import { cyan, green, red } from "colors";
import { Protogen } from "../Protogen";
import { VideoDownloadJob, VideoDownloadJobStatus } from "../remote-worker/RemoteWorker";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { ChildProcess, exec } from "child_process";
import { sleep } from "../utils/Utils";

const LockName = "ProtogenVideoPlaybackManager";

export class ProtogenVideoPlaybackManager {
  private _protogen;
  private _monitoredJob: VideoDownloadJob | null;
  private _canceled: boolean = false;
  private _nextCheck: number = 0;
  private _status: VideoDownloadJobStatus | null = null;
  private _videoDirectory;
  private _vlcProcess: ChildProcess | null = null;

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
            if (this._status != this._monitoredJob.status) {
              this.protogen.logger.info("VideoPlaybackManager", "Job with ID " + this._monitoredJob.jobId + " changed status from " + this._status + " to " + this._monitoredJob.status);
              this._status = this._monitoredJob.status;
            }

            //console.debug("Status: " + this._monitoredJob.status);
            if (this._monitoredJob.status == VideoDownloadJobStatus.DONE) {
              this.protogen.logger.info("VideoPlaybackManager", "Job with ID " + this._monitoredJob.jobId + " is done. Attempting to download it and start playback");
              const hash = this._monitoredJob.outputHash;
              this._monitoredJob = null;
              if (hash == null) {
                throw new Error("Video hash was null after success");
              }
              await this.downloadAndStartPlayback(hash);
            } else if (this._monitoredJob.status == VideoDownloadJobStatus.FAILED) {
              this.protogen.logger.error("VideoPlaybackManager", "Job with ID " + this._monitoredJob.jobId + " failed with message " + this._monitoredJob.errorMessage);
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
    const output = this._videoDirectory + "/" + hash + ".mp4";
    if (existsSync(output)) {
      this.protogen.logger.info("VideoPlaybackManager", "Video already in cache. Skipping download");
    } else {
      try {
        this.protogen.remoteWorker.downloadVideo(hash, output);
      } catch (err) {
        this.protogen.logger.error("VideoPlaybackManager", "An error occured while downloading video. " + (err as any).message);
        console.log(err);
      }
    }

    await this.killAndAwait();
    this.startPlayback(resolve(output));
    return true;
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

  public kill() {
    if (this._vlcProcess != null) {
      this._vlcProcess.kill();
      return true;
    }
    return false;
  }

  public async streamVideo(url: string) {
    await this.killAndAwait();
    this.startPlayback(url);
  }

  public async playVideo(url: string, mirror: boolean = false) {
    this._canceled = false;
    this.protogen.logger.info("VideoPlaybackManager", "Requesting job for video " + cyan(url) + ". Mirror: " + (mirror ? green("true") : red("false")));
    const job = await this.protogen.remoteWorker.createJob(url, mirror);
    this.protogen.logger.info("VideoPlaybackManager", "Job ID is " + job.jobId);
    if (!this._canceled) {
      this._monitoredJob = job;
      this._nextCheck = 0;
    }
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
}