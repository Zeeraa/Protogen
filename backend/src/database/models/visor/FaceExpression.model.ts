import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "face_expressions" })
export class FaceExpressionData {
  @PrimaryColumn({
    name: "uuid",
    type: "varchar",
    length: 36,
  })
  uuid: string;

  @Column({
    unique: true,
    type: "varchar",
    length: 255,
    name: "name",
  })
  name: string;

  @Column({
    name: "image",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image: string;
}