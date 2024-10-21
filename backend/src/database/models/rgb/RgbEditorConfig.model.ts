import { Column, Entity, PrimaryColumn } from "typeorm";
import { RgbPreviewElementType } from "./enum/RgbPreviewElementType";

@Entity({
  name: "rgb_editor_preview_elements"
})
export class RgbEditorPreviewElement {
  @PrimaryColumn({
    name: "id",
    type: "varchar",
    length: 36
  })
  uuid: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 128,
  })
  name: string;

  @Column({
    name: "type",
    type: "enum",
    enum: RgbPreviewElementType,
  })
  type: RgbPreviewElementType;

  @Column({
    name: "x",
    type: "int",
  })
  x: number;

  @Column({
    name: "y",
    type: "int",
  })
  y: number;

  @Column({
    name: "start_index",
    type: "int",
    unsigned: true,
  })
  startIndex: number;

  @Column({
    name: "length",
    type: "int",
    unsigned: true,
  })
  length: number;
}