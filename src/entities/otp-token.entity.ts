import { User } from "@common";
import { Optional } from "sequelize";
import { BelongsTo, Column, Default, Model, Table } from "sequelize-typescript";

export type OtpTokenAttributes = {
  id: number;
  lastSentOtp?: Date;
  countVerifyEmailRequest: number;
  lastSentVerifyEmail?: Date;
  countUpdatePasswordRequest: number;
  lastSentUpdatePassword?: Date;
};

type OtpTokenCreationAttributes = Optional<
  OtpTokenAttributes,
  "id" | "countVerifyEmailRequest" | "countUpdatePasswordRequest"
>;

@Table({ tableName: "otp_tokens", schema: "core", timestamps: false })
export class OtpToken extends Model<OtpTokenAttributes, OtpTokenCreationAttributes> {
  id: number;

  @BelongsTo(() => User, "id")
  user: User;

  @Column("timestamp")
  lastSentOtp?: Date;

  @Default(0)
  @Column
  countVerifyEmailRequest: number;

  @Column("timestamp")
  lastSentVerifyEmail?: Date;

  @Default(0)
  @Column
  countUpdatePasswordRequest: number;

  @Column("timestamp")
  lastSentUpdatePassword?: Date;
}
