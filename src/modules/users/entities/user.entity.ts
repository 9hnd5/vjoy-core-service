import { Optional } from "sequelize";
import { USER_STATUS } from "../users.constants";
import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  DeletedAt,
} from "sequelize-typescript";
import { Role } from "src/modules/auth/entities/role.entity";

export type UserAttributes = {
  id: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  phone?: string;
  roleId: number;
  status: number;
  provider?: string;
  socialId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

type UserCreationAttributes = Optional<UserAttributes, "id" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

@Table({ modelName: "users", paranoid: true })
export class User extends Model<UserAttributes, UserCreationAttributes> {
  id: number;

  @Column(DataType.STRING(255))
  firstname?: string;

  @Column(DataType.STRING(255))
  lastname?: string;

  @Column(DataType.STRING(255))
  email?: string;

  @Column(DataType.STRING(255))
  phone?: string;

  @Column(DataType.STRING(255))
  password?: string;

  @Default(USER_STATUS.NEW)
  @Column(DataType.TINYINT)
  status: number;

  @ForeignKey(() => Role)
  @Column(DataType.TINYINT)
  roleId: number;

  @BelongsTo(() => Role)
  role: Role;

  @Column(DataType.STRING(255))
  provider?: string;

  @Column(DataType.STRING(255))
  socialId?: string;

  @CreatedAt
  @Column
  createdAt: Date;

  @UpdatedAt
  @Column
  updatedAt: Date;

  @DeletedAt
  @Column
  deletedAt: Date;
}
