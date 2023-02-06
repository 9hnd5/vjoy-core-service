import { Optional } from "sequelize";
import { Table, Column, Model, DataType, Default, CreatedAt, UpdatedAt } from "sequelize-typescript";
import { USER_STATUS } from "../users.constants";

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
};

type UserCreationAttributes = Optional<UserAttributes, "id">;

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

  @Default(4)
  @Column(DataType.TINYINT)
  roleId: number;

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
}
