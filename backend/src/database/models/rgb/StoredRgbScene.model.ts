import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { RgbSceneEffect } from "./RgbSceneEffect.model";

@Entity({
  name: "rgb_scenes"
})
export class StoredRgbScene {
  @PrimaryColumn({ name: "id", type: "varchar", length: 36 })
  id: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @OneToMany(() => RgbSceneEffect, (effect) => effect.scene, { cascade: true })
  effects: RgbSceneEffect[];
}