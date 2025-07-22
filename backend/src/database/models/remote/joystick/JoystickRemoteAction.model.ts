import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { ActionType } from "../../../../actions/ActionType";
import { JoystickRemoteProfile } from "./JoystickRemoteProfile.model";
import { JoystickRemoteControlInputType } from "./JoystickRemoteControlInputType";

@Entity({
  name: "joystick_remote_action",
})
@Unique(["profile", "inputType"])
export class JoystickRemoteAction {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "input_type",
    type: "enum",
    enum: JoystickRemoteControlInputType,
  })
  inputType: JoystickRemoteControlInputType;

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

  @Column({
    name: "metadata",
    type: "text",
    nullable: true,
    default: null,
  })
  metadata: string | null;

  @ManyToOne(() => JoystickRemoteProfile, p => p.actions, { onDelete: "CASCADE", onUpdate: "CASCADE", nullable: false })
  @JoinColumn({ name: "profile_id" })
  profile: JoystickRemoteProfile;
}
