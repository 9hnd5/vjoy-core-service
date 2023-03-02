import { Role } from "entities/role.entity";
import { USER_STATUS } from "modules/users/users.constants";
import { Optional } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

export type UserAttributes = {
  id: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  phone?: string;
  roleCode: string;
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

  @Column({ type: DataType.STRING(255), unique: true })
  email?: string;

  @Column({ type: DataType.STRING(255), unique: true })
  phone?: string;

  @Column(DataType.STRING(255))
  password?: string;

  @Default(USER_STATUS.NEW)
  @Column({ type: DataType.INTEGER, allowNull: false })
  status: number;

  @ForeignKey(() => Role)
  @Column({ type: DataType.STRING(255), allowNull: false })
  roleCode: string;

  @BelongsTo(() => Role, { targetKey: "code" })
  role: Role;

  @Column(DataType.STRING(255))
  provider?: string;

  @Column(DataType.STRING(255))
  socialId?: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt?: Date;
}
