import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { BoopSensorProfileAction } from "./BoopSensorProfileAction.model";

@Entity({
  name: "boop_sensor_profiles",
  comment: "Stores profiles defining how the boop sensor should act",
})
export class BoopSensorProfile {
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

  @Column({
    name: "resets_after",
    unsigned: true,
  })
  resetsAfter: number;

  @OneToMany(() => BoopSensorProfileAction, (action) => action.profile, { cascade: true })
  actions: BoopSensorProfileAction[];
}
