import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "custom_faces", comment: "Stores custom faces created by user" })
export class CustomFace {
  @PrimaryColumn({
    name: "uuid",
    type: "varchar",
    length: 36,
  })
  uuid: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
  })
  name: string;

  @Column({
    name: "mirror_image",
    type: "boolean",
    default: false,
  })
  mirrorImage: boolean;

  @Column({
    name: "flip_right_side",
    type: "boolean",
    default: false,
  })
  flipRightSide: boolean;

  @Column({
    name: "flip_left_side",
    type: "boolean",
    default: false,
  })
  flipLeftSide: boolean;

  @Column({
    name: "image",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image: string;
}