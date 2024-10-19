import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";
import { VideoDownloaderJobStatus } from "../enum/VideoDownloaderJobStatus";

@Entity({ name: "video_downloader_jobs" })
export class VideoDownloaderJob {
    @PrimaryColumn({
        type: "varchar",
        length: 36,
        name: "job_id",
        unique: true,
    })
    jobId: string;

    @CreateDateColumn({
        name: "created_at",
    })
    createdAt: Date;

    @Column({
        type: "varchar",
        length: 11,
        default: VideoDownloaderJobStatus.CREATED,
    })
    @Index()
    status: VideoDownloaderJobStatus;

    @Column({
        type: "varchar",
        length: 1024,
        name: "video_url",
    })
    @Index()
    videoUrl: string;

    @Column({
        type: "boolean",
        name: "mirror_video",
    })
    @Index()
    mirrorVideo: boolean;

    @Column({
        type: "boolean",
        name: "flip_video",
    })
    @Index()
    flipVideo: boolean;

    @Column({
        type: "varchar",
        length: 64,
        name: "output_hash",
        nullable: true,
        default: null,
    })
    outputHash: string;

    @Column({
        type: "text",
        nullable: true,
        default: null,
        name: "error_message",
    })
    errorMessage: string;
}
