import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({
  name: "user",
  comment: "Stores all user accounts"
})
export class User {
  @PrimaryGeneratedColumn({
    name: "id",
    unsigned: true,
  })
  id: number;

  @Column({
    name: "username",
    type: "varchar",
    length: 32,
    comment: "The username",
  })
  @Index({ unique: true })
  username: string;

  @Column({
    name: "password",
    type: "varchar",
    length: 128,
    comment: "Password hash",
  })
  password: string;

  @CreateDateColumn({
    name: "last_password_change",
    type: "datetime",
  })
  lasPasswordChange: Date;

  @Column({
    name: "super_user",
    type: "boolean",
    default: false,
  })
  superUser: boolean;
}