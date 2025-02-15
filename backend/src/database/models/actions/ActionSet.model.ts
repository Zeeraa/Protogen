import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ActionSetAction } from "./ActionSetEntry.model";

@Entity({
  name: "action_sets"
})
export class ActionSet {
  @PrimaryGeneratedColumn({
    unsigned: true,
  })
  id: number;

  @Column({
    type: "varchar",
    length: 32,
    unique: true,
  })
  name: string;

  @Column({
    name: "show_on_dashboard",
    type: "boolean",
    default: false,
  })
  showOnDashboard: boolean;

  @OneToMany(() => ActionSetAction, e => e.actionSet, { cascade: true })
  actions: ActionSetAction[];
}
