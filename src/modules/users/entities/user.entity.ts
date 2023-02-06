import { Optional } from "sequelize";
import { Table, Column, Model, DataType, Default, CreatedAt, UpdatedAt } from "sequelize-typescript";

export type UserAttributes = {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
  roleId: number;
  provider?: string;
  socialId?: string;
};

type UserCreationAttributes = Optional<UserAttributes, "id">;

@Table({ modelName: "users", paranoid: true })
export class User extends Model<UserAttributes, UserCreationAttributes> {
  id: number;

  @Column(DataType.STRING(255))
  firstname: string;

  @Column(DataType.STRING(255))
  lastname: string;

  @Column(DataType.STRING(255))
  email: string;

  @Column(DataType.STRING(255))
  phone: string;

  @Column(DataType.STRING(255))
  password: string;

  @Default(1)
  @Column(DataType.TINYINT)
  status: number;

  @Column(DataType.TINYINT)
  roleId: number;

  @Column(DataType.STRING(255))
  provider: string;

  @Column(DataType.STRING(255))
  socialId: string;

  @CreatedAt
  @Column
  createdAt: Date;

  @UpdatedAt
  @Column
  updatedAt: Date;
}
