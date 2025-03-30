import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "video_cache" })
export class VideoCache {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "url_hash",
    type: "varchar",
    length: 64,
  })
  urlHash: string;

  @Column({
    name: "settings_hash",
    type: "varchar",
    length: 64,
  })
  settingsHash: string;

  @Column({
    name: "hash",
    type: "varchar",
    length: 64,
  })
  hash: string;

  @Column({
    name: "job_id",
    type: "varchar",
    length: 36,
  })
  jobId: string;
}
