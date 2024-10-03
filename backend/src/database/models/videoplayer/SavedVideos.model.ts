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
    name: "url",
    type: "varchar",
    length: 255,
  })
  url: string;

  @Column({
    name: "mirror_video",
    type: "boolean",
    default: false,
  })
  mirrorVideo: boolean;
}