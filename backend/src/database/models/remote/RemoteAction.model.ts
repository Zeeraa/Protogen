import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { RemoteControlInputType } from "./RemoteControlInputType";
import { RemoteProfile } from "./RemoteProfile.model";
import { RemoteControlActionType } from "./RemoteControlActionType";

@Entity({
  name: "remote_action",
})
@Unique(["profile", "inputType"])
export class RemoteAction {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "input_type",
    type: "enum",
    enum: RemoteControlInputType,
  })
  inputType: RemoteControlInputType;

  @Column({
    name: "action_type",
    type: "enum",
    enum: RemoteControlActionType,
    default: RemoteControlActionType.NONE,
  })
  actionType: RemoteControlActionType;

  @Column({
    name: "action",
    type: "varchar",
    length: 512,
    nullable: true,
    default: null,
  })
  action: string | null;

  @ManyToOne(() => RemoteProfile, p => p.actions, { onDelete: "CASCADE", onUpdate: "CASCADE", nullable: false })
  @JoinColumn({ name: "profile_id" })
  profile: RemoteProfile;
}