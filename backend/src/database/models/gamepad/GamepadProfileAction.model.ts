import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { GamepadActionTriggers } from "../../../gamepadmanager/GamepadState";
import { GamepadProfile } from "./GamepadProfile.model";
import { ActionType } from "../../../actions/ActionType";

@Entity({
  name: "gamepad_profile_actions"
})
export class GamepadProfileAction {
  @PrimaryColumn({
    name: "id",
    type: "varchar",
    length: 36,
  })
  id: string;

  @ManyToOne(() => GamepadProfile, (profile) => profile.actions, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false,
    orphanedRowAction: "delete",
  })
  @JoinColumn({
    name: "profile_id",
  })
  profile: GamepadProfile;

  @Column({
    name: "trigger",
    type: "enum",
    enum: GamepadActionTriggers,
  })
  trigger: GamepadActionTriggers;

  @Column({
    name: "action_type",
    type: "enum",
    enum: ActionType,
    default: ActionType.NONE,
  })
  actionType: ActionType;

  @Column({
    name: "action",
    type: "varchar",
    length: 512,
    nullable: true,
    default: null,
  })
  action: string | null;
}