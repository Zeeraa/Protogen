import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RgbSceneEffect } from "./RgbSceneEffect.model";

@Entity({ name: "rgb_scene_effect_properties" })
export class RgbSceneEffectProperty {
  @PrimaryGeneratedColumn({ name: "id", unsigned: true })
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

  @ManyToOne(() => RgbSceneEffect, (effect) => effect.properties, { nullable: false, onUpdate: "CASCADE", onDelete: "CASCADE", orphanedRowAction: "delete" })
  @JoinColumn({ name: "effect_id" })
  effect: RgbSceneEffect;
}