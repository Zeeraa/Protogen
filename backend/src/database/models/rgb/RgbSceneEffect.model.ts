import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { StoredRgbScene } from "./StoredRgbScene.model";
import { RgbSceneEffectProperty } from "./RgbSceneEffectProperty.model";

@Entity({ name: "rgb_scene_effect" })
export class RgbSceneEffect {
  @PrimaryGeneratedColumn({ name: "id", unsigned: true })
  id: number;

  @Column({
    name: "effect",
    type: "varchar",
    length: 255,
  })
  effect: string;

  @Column({
    name: "display_name",
    type: "varchar",
    length: 255,
  })
  displayName: string;

  @ManyToOne(() => StoredRgbScene, (scene) => scene.effects, { nullable: false, onUpdate: "CASCADE", onDelete: "CASCADE", orphanedRowAction: "delete" })
  @JoinColumn({ name: "scene_id" })
  scene: StoredRgbScene;

  @OneToMany(() => RgbSceneEffectProperty, (prop) => prop.effect, { cascade: true })
  properties: RgbSceneEffectProperty[];
}