import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { GamepadProfileAction } from "./GamepadProfileAction.model";

@Entity({
  name: "gamepad_profiles"
})
export class GamepadProfile {
  @PrimaryColumn({
    name: "id",
    type: "varchar",
    length: 36,
  })
  id: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 64,
  })
  name: string;

  @OneToMany(() => GamepadProfileAction, (action) => action.profile, { cascade: true })
  actions: GamepadProfileAction[];
}