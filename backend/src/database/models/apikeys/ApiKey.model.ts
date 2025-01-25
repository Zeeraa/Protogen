import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({
  name: "api_keys",
  comment: "Stores api keys used by external applications",
})
export class ApiKey {
  @PrimaryColumn({
    name: "api_key",
    type: "varchar",
    length: 36,
  })
  apiKey: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 64,
    unique: true,
  })
  name: string;

  @Column({
    name: "super_user",
    type: "boolean",
  })
  superUser: boolean;
}