import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({
  name: "kv_data_storage",
})
export class KVDataStoreEntry {
  @PrimaryColumn({
    unique: true,
    type: "varchar",
    length: 255,
    name: "data_key",
  })
  key: string;

  @Column({
    type: "varchar",
    length: 2048,
    name: "data_value",
    nullable: true,
    default: null,
  })
  value: string | null;
}