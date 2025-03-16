import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { JoystickRemoteAction } from "./JoystickRemoteAction.model";

@Entity({
  name: "joystick_remote_profile",
})
export class JoystickRemoteProfile {
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

  @OneToMany(() => JoystickRemoteAction, a => a.profile, { cascade: true })
  actions: JoystickRemoteAction[];

  @Column({
    name: "last_save_date",
    type: "datetime"
  })
  lastSaveDate: Date;
}
