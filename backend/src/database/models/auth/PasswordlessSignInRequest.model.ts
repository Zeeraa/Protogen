import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User.model";

@Entity({
  name: "passwordless_signin_requests"
})
export class PasswordlessSignInRequest {
  @PrimaryColumn({
    name: "id",
    type: "varchar",
    length: 36,
  })
  uuid: string;

  @Column({
    name: "signin_key",
    type: "varchar",
    length: 8,
  })
  signinKey: string;

  @Column({
    name: "expires_at",
    type: "datetime",
  })
  expiresAt: Date;

  @Column({
    name: "used",
    type: "boolean",
    default: false,
  })
  used: boolean;

  @ManyToOne(() => User, { onDelete: "CASCADE", onUpdate: "CASCADE", nullable: true })
  @JoinColumn({ name: "approved_by_user_id" })
  approvedBy: User;
}
