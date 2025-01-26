import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { RemoteControlActionType } from "./RemoteControlActionType";
import { RemoteProfile } from "./RemoteProfile.model";

@Entity({
  name: "remote_action",
})
@Unique(["profile", "actionType"])
export class RemoteAction {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "action_type",
    type: "enum",
    enum: RemoteControlActionType,
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