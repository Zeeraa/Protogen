import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FaceColorEffect } from "./FaceColorEffect";

@Entity({
  name: "face_color_effect_properties",
  comment: "Stores color effect properties for face renderer"
})
export class FaceColorEffectProperty {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true
  })
  id: number;

  @Column({
    name: "key",
    type: "varchar",
    length: 255,
  })
  key: string;

  @Column({
    name: "value",
    type: "varchar",
    length: 1024,
  })
  value: string;

  @ManyToOne(() => FaceColorEffect, (effect) => effect.properties, { nullable: false, onUpdate: "CASCADE", onDelete: "CASCADE", orphanedRowAction: "delete" })
  @JoinColumn({ name: "effect_id" })
  effect: FaceColorEffect;
}
