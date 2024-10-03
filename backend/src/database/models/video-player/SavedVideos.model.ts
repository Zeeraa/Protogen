import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "saved_videos" })
export class SavedVideo {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "int",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "sorting_number",
    type: "int",
    default: 0,
  })
  sortingNumber: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
  })
  name: string;

  @Column({
    name: "url",
    type: "varchar",
    length: 1024,
  })
  url: string;

  @Column({
    name: "mirror_video",
    type: "boolean",
    default: false,
  })
  mirrorVideo: boolean;

  @Column({
    name: "is_stream",
    type: "boolean",
    default: false,
  })
  isStream: boolean;

  @Column({
    name: "hide_url",
    type: "boolean",
    default: false,
  })
  hideUrl: boolean;
}