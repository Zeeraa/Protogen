import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { FaceColorEffect } from "./FaceColorEffect";

@Entity({ name: "face_expressions" })
export class FaceExpressionData {
  @PrimaryColumn({
    name: "uuid",
    type: "varchar",
    length: 36,
  })
  uuid: string;

  @Column({
    unique: true,
    type: "varchar",
    length: 255,
    name: "name",
  })
  name: string;

  @Column({
    name: "image",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image: string;

  @Column({
    type: "boolean",
    name: "mirror_image",
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
    name: "replace_colors",
    type: "boolean",
    default: false,
  })
  replaceColors: boolean;

  // Nullable @ManyToOne relation to FaceColorEffect. If effect is deleted this should be set to null
  @ManyToOne(() => FaceColorEffect, e => e.linkedExpressions, {
    nullable: true,
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "color_effect" })
  linkedColorEffect: FaceColorEffect | null;
}
