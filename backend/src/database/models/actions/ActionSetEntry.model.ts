import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ActionSet } from "./ActionSet.model";
import { ActionType } from "../../../actions/ActionType";

@Entity({
  name: "action_set_action",
})
export class ActionSetAction {
  @PrimaryGeneratedColumn({
    unsigned: true,
  })
  id: number;

  @ManyToOne(() => ActionSet, a => a.actions, { nullable: false, onUpdate: "CASCADE", onDelete: "CASCADE", orphanedRowAction: "delete" })
  @JoinColumn({ name: "action_set_id" })
  actionSet: ActionSet;

  @Column({
    type: "enum",
    enum: ActionType
  })
  type: ActionType;

  @Column({
    name: "action",
    type: "varchar",
    length: 512,
    nullable: true,
    default: null,
  })
  action: string | null;
}
