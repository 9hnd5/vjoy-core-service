import { Optional } from "sequelize";
import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from "sequelize-typescript";

export type ApiKeyAttributes = {
  id: number;
  name: string;
  description?: string;
  type: string;
  apiToken: string;
  env: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiKeyCreationAttributes = Optional<ApiKeyAttributes, "id" | "createdAt" | "updatedAt">;

@Table({ tableName: "api_keys" })
export class ApiKey extends Model<ApiKeyAttributes, ApiKeyCreationAttributes> {
  id: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name: string;

  @Column({ type: DataType.STRING(255) })
  description?: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  type: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  apiToken: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  env: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
