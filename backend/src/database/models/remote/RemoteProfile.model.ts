import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RemoteAction } from "./RemoteAction.model";

@Entity({
  name: "remote_profile",
})
export class RemoteProfile {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 16,
    unique: true,
  })
  name: string;

  @Column({
    name: "click_to_activate",
    default: true,
  })
  clickToActivate: boolean;

  @OneToMany(() => RemoteAction, a => a.profile, { cascade: true })
  actions: RemoteAction[];
}