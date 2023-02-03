import { TinyIntegerDataType } from "sequelize";
import { Table, Column, Model, DataType, Default, CreatedAt, UpdatedAt, AutoIncrement, PrimaryKey } from "sequelize-typescript";

@Table({ modelName: "users" })
export class User extends Model {
  @AutoIncrement
  @PrimaryKey
  @Column
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
  role: number;

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
