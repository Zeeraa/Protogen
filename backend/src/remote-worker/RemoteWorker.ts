import axios, { isAxiosError } from "axios";
import { Protogen } from "../Protogen";
import { createWriteStream } from "fs";

export class ProtogenRemoteWorker {
  private _protogen;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  private get headers(): any {
    const headers: any = {};

    if (this.protogen.config.remoteWorker.key != null) {
      headers["Authorization"] = this.protogen.config.remoteWorker.key;
    }

    return headers;
  }

  public async createJob(url: string, mirror: boolean, flip: boolean): Promise<VideoDownloadJob> {
    const result = await axios.post(this.config.url + "/video_downloader/job", {
      url: url,
      mirrorVideo: mirror,
      flipVideo: flip,
    }, { headers: this.headers });
    return result.data as VideoDownloadJob;
  }

  public async getJob(jobId: string): Promise<VideoDownloadJob | null> {
    try {
      const result = await axios.get(this.config.url + "/video_downloader/job/" + jobId, { headers: this.headers });
      return result.data as VideoDownloadJob;
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.status == 404) {
          return null;
        }
      }
      throw err;
    }
  }

  public async downloadVideo(hash: string, path: string) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const writer = createWriteStream(path);

        const response = await axios({
          url: this.config.url + "/video_downloader/download/" + hash,
          method: 'GET',
          responseType: 'stream',
          headers: this.headers,
        });

        response.data.pipe(writer);

        writer.on('finish', () => resolve());
        writer.on('error', (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  private get config() {
    return this.protogen.config.remoteWorker;
  }

  public get protogen() {
    return this._protogen;
  }
}

export interface VideoDownloadJob {
  jobId: string;
  videoUrl: string;
  mirrorVideo: boolean;
  outputHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  status: VideoDownloadJobStatus;
}

export enum VideoDownloadJobStatus {
  CREATED = "CREATED",
  DOWNLOADING = "DOWNLOADING",
  ENCODING_1 = "ENCODING_1",
  ENCODING_2 = "ENCODING_2",
  FAILED = "FAILED",
  DONE = "DONE",
}