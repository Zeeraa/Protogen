import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SavedVideo } from "./SavedVideos.model";

@Entity({ name: "saved_video_groups" })
export class SavedVideoGroup {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "int",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
  })
  name: string;

  @OneToMany(() => SavedVideo, v => v.group)
  videos: SavedVideo[];
}