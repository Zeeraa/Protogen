import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { FaceColorEffectProperty } from "./FaceColorEffectProperty";
import { FaceExpressionData } from "./FaceExpression.model";

@Entity({
  name: "face_color_effects",
  comment: "Stores color effect profiles for face renderer"
})
export class FaceColorEffect {
  @PrimaryColumn({
    name: "uuid",
    type: "varchar",
    length: 36,
  })
  uuid: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    unique: true,
  })
  name: string;

  @Column({
    name: "effect",
    type: "varchar",
    length: 255,
  })
  effect: string;

  @OneToMany(() => FaceColorEffectProperty, (property) => property.effect, { cascade: true })
  properties: FaceColorEffectProperty[];

  @OneToMany(() => FaceExpressionData, (expression) => expression.linkedColorEffect)
  linkedExpressions: FaceExpressionData[];
}
