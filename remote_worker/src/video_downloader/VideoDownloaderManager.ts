import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "fs";
import { Server } from "../Server";
import { rimrafSync } from "rimraf";
import { DataSource, Equal, In, IsNull, Not } from "typeorm";
import { VideoDownloaderJob } from "./VideoDownloaderJob";
import { VideoDownloaderJobStatus } from "../enum/VideoDownloaderJobStatus";
import { cyan, green, red } from "colors";
import youtubeDl from "youtube-dl-exec";
import { VideoDownloadJobDTO } from "../dto/comment/VideoDownloadJob";
import { uuidv7 } from "uuidv7";
import { sleep } from "../utils/Sleep";
import { resolve } from "path";
import { executeCommand } from "../utils/ExecuteCommand";
import { calculateSHA256 } from "../utils/Hashing";

export class VideoDownloadManager {
    private _dataDirectory: string;
    private _storageFolder: string;
    private _tempFolder: string;
    private _dbFile: string;
    private _dataSource: DataSource;
    private _ffmpegCommand: string;
    private _ffmpegPreset: string;
    private _videoFileExtension: string;

    constructor(server: Server) {
        this._dataDirectory = server.dataDirectory + "/video_downloader";
        this._storageFolder = this._dataDirectory + "/storage";
        this._tempFolder = this._dataDirectory + "/temp";

        this._ffmpegCommand = "ffmpeg";
        this._ffmpegPreset = "fast";
        this._videoFileExtension = "mp4";

        this._dbFile = this._dataDirectory + "/db.sqlite";
        this._dataSource = new DataSource({
            type: "sqlite",
            database: this._dbFile,
            entities: [
                VideoDownloaderJob
            ],
            synchronize: true,
        });

        if (!existsSync(this._dataDirectory)) {
            mkdirSync(this._dataDirectory);
        }

        if (!existsSync(this._storageFolder)) {
            mkdirSync(this._storageFolder);
        }

        if (existsSync(this._tempFolder)) {
            rimrafSync(this._tempFolder);
        }
        mkdirSync(this._tempFolder);
    }

    async init() {
        if (!existsSync(this._dbFile)) {
            console.log("Creating initial database for video downloader");
        }
        await this._dataSource.initialize();

        // Find and mark non colplete jobs as failed since the server probably died during the job
        const deadJobs = await this._dataSource.getRepository(VideoDownloaderJob).find({
            where: [
                {
                    status: Not(In([
                        VideoDownloaderJobStatus.DONE,
                        VideoDownloaderJobStatus.FAILED
                    ]))
                },
                { videoUrl: IsNull() }
            ]
        });
        deadJobs.forEach(job => {
            job.status = VideoDownloaderJobStatus.FAILED;
            console.log("Marking video download job with id " + cyan(job.jobId) + " as " + red("failed") + " since its in a non finished state during startup");
        });

        await this._dataSource.getRepository(VideoDownloaderJob).save(deadJobs);
    }

    public async getJobById(id: string) {
        return await this._dataSource.getRepository(VideoDownloaderJob).findOne({
            where: {
                jobId: Equal(id)
            }
        });
    }

    public async findExistingJob(options: VideoDownloadJobDTO) {
        return await this._dataSource.getRepository(VideoDownloaderJob).findOne({
            where: {
                mirrorVideo: Equal(options.mirrorVideo),
                videoUrl: Equal(options.url),
                status: Not(Equal(VideoDownloaderJobStatus.FAILED))
            }
        });
    }

    public async createJob(options: VideoDownloadJobDTO) {
        console.log("Creating new video download job for url " + cyan(options.url) + ". Mirror: " + (options.mirrorVideo ? green("yes") : red("no")));
        const newJob = new VideoDownloaderJob();
        newJob.jobId = uuidv7();
        newJob.videoUrl = options.url;
        newJob.mirrorVideo = options.mirrorVideo;
        newJob.flipVideo = options.flipVideo;

        const job = await this._dataSource.getRepository(VideoDownloaderJob).save(newJob);
        this.processJob(job).catch(err => {
            console.error(red("Video download job " + job.jobId + " failed with exception"), err);
        });
        return job;
    }

    private async processJob(job: VideoDownloaderJob) {
        console.log("Processing video download job " + cyan(job.jobId));
        const repo = this._dataSource.getRepository(VideoDownloaderJob);
        try {
            job.status = VideoDownloaderJobStatus.DOWNLOADING;
            await repo.save(job);
            await youtubeDl(job.videoUrl, {
                noWarnings: true,
                output: this._tempFolder + "/" + job.jobId,
            });
            await sleep(100);
            const downloadedFileName = readdirSync(this._tempFolder).find(name => name.startsWith(job.jobId));
            if (downloadedFileName == null) {
                job.status = VideoDownloaderJobStatus.FAILED;
                job.errorMessage = "YoutubeDL failed to download video. Check the url and try again later";
                console.error(red("Download job " + job.jobId + " failed. YoutubeDL did not output a video"));
                await repo.save(job);
                return;
            }
            const downloadedFile = this._tempFolder + "/" + downloadedFileName;
            console.log("Download " + green("successful") + " for job " + cyan(job.jobId) + ". Starting processing");
            job.status = VideoDownloaderJobStatus.ENCODING_1;
            await repo.save(job);

            let filter = "";
            if (job.mirrorVideo) {
                //filter = "-vf \"scale='min(64,iw)':'min(32,ih)'\"";
                filter = "-vf \"scale=w=if(gt(iw\\,ih)\\,min(64\\,iw)\\,-2):h=if(gt(iw\\,ih)\\,-2\\,min(32\\,ih))\""
            } else {
                //filter = "-vf \"scale='min(128,iw)':'min(32,ih)'\"";
                filter = "-vf \"scale=w=if(gt(iw\\,ih)\\,min(128\\,iw)\\,-2):h=if(gt(iw\\,ih)\\,-2\\,min(32\\,ih))\""
            }

            console.log("Starting encoding for job " + cyan(job.jobId));
            const stage1Out = resolve(this._tempFolder + "/" + job.jobId + "_stage1." + this.videoFileExtension);
            const cmd = `${this._ffmpegCommand} -i "${this.escapeDoubleQuotes(resolve(downloadedFile))}" ${filter} -preset ${this._ffmpegPreset} "${this.escapeDoubleQuotes(stage1Out)}"`;
            const stage1CommandOutput = await executeCommand(cmd);
            if (stage1CommandOutput != 0) {
                job.status = VideoDownloaderJobStatus.FAILED;
                job.errorMessage = "FFMPEG (Stage 1) exited with non 0 exit code " + stage1CommandOutput;
                console.error(red("Download job " + job.jobId + " failed. FFMPEG (Stage 1) exited with code " + stage1CommandOutput));
                await repo.save(job);
                return;
            }
            rmSync(downloadedFile);
            console.log("Video resized for job " + cyan(job.jobId));
            let resultFile = stage1Out;

            if (job.mirrorVideo) {
                console.log("Mirroring video for job " + cyan(job.jobId));
                job.status = VideoDownloaderJobStatus.ENCODING_2;
                await repo.save(job);
                const stage2Out = resolve(this._tempFolder + "/" + job.jobId + "_stage2." + this.videoFileExtension);

                let complexFilter = "[0:v]split=2[v1][v2];[0:a]asplit=2[a1][a2];[v1][v2]hstack=inputs=2[v];[a1][a2]amerge=inputs=2[a]";
                if (job.flipVideo) {
                    complexFilter = "[0:v]split=2[v1][v2];[v2]hflip[mirrored];[0:a]asplit=2[a1][a2];[v1][mirrored]hstack=inputs=2[v];[a1][a2]amerge=inputs=2[a]";
                }

                const cmd = `${this._ffmpegCommand} -i "${this.escapeDoubleQuotes(resolve(stage1Out))}" -filter_complex "${complexFilter}" -map "[v]" -map "[a]" -preset ${this._ffmpegPreset} "${this.escapeDoubleQuotes(stage2Out)}"`;
                const stage2CommandOutput = await executeCommand(cmd);
                if (stage2CommandOutput != 0) {
                    job.status = VideoDownloaderJobStatus.FAILED;
                    job.errorMessage = "FFMPEG (Stage 2) exited with non 0 exit code " + stage2CommandOutput;
                    console.error(red("Download job " + job.jobId + " failed. FFMPEG (Stage 2) exited with code " + stage2CommandOutput));
                    await repo.save(job);
                    return;
                }
                console.log("Video mirrored for job " + cyan(job.jobId));
                resultFile = stage2Out;
                rmSync(stage1Out);
            }

            const sha256 = await calculateSHA256(resultFile);
            console.log("Video download job " + cyan(job.jobId) + " finished. Output hash: " + cyan(sha256));

            const outputFolder = this._storageFolder + "/" + sha256.substring(0, 2);
            if (!existsSync(outputFolder)) {
                mkdirSync(outputFolder);
            }

            const outputFile = outputFolder + "/" + sha256 + "." + this.videoFileExtension;

            renameSync(resultFile, outputFile);
            job.status = VideoDownloaderJobStatus.DONE;
            job.outputHash = sha256;
            await repo.save(job);
        } catch (err: any) {
            job.status = VideoDownloaderJobStatus.FAILED;
            job.errorMessage = "An exception occured while processing job. " + err.message;
            await repo.save(job);
            throw err;
        }
    }

    private escapeDoubleQuotes(str: string) {
        return str.replace(/(["\\])/g, '\\$1');
    }

    get storageFolder() {
        return this._storageFolder;
    }

    get videoFileExtension() {
        return this._videoFileExtension;
    }
}
