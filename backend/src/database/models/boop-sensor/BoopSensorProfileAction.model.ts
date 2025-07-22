import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ActionType } from "../../../actions/ActionType";
import { BoopSensorProfile } from "./BoopSensorProfile.model";

@Entity({
  name: "boop_sensor_profile_actions",
  comment: "Stores actions for boop sensor profiles",
})
export class BoopSensorProfileAction {
  @PrimaryColumn({
    name: "id",
    type: "varchar",
    length: 36,
  })
  id: string;

  @Column({
    name: "trigger_at_value",
    unsigned: true,
  })
  triggerAtValue: number;

  @Column({
    name: "action_type",
    type: "enum",
    enum: ActionType,
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

  @Column({
    name: "trigger_multiple_times",
    type: "boolean",
  })
  triggerMultipleTimes: boolean;

  @ManyToOne(() => BoopSensorProfile, (profile) => profile.actions, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    nullable: false,
    orphanedRowAction: "delete",
  })
  @JoinColumn({
    name: "profile_id",
  })
  profile: BoopSensorProfile;
}
