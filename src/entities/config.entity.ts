import { Optional } from "sequelize";
import { Column, CreatedAt, DataType, DeletedAt, Model, Table, UpdatedAt } from "sequelize-typescript";

export type ConfigAttributes = {
  id: number;
  type: string;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

type ConfigCreationAttributes = Optional<ConfigAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

@Table({ tableName: "configs", schema: "core", paranoid: true })
export class Config extends Model<ConfigAttributes, ConfigCreationAttributes> {
  id: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  type: string;

  @Column(DataType.JSONB)
  data?: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt?: Date;
}
