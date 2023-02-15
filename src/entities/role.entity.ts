import { Optional } from "sequelize";
import { Column, CreatedAt, DataType, HasMany, Model, Table, UpdatedAt } from "sequelize-typescript";
import { Kid } from "./kid.entity";
import { User } from "./user.entity";

export type ActionAttributes = "*" | "create" | "read" | "update" | "delete" | "list";

export type PermissionAttributes = {
  resource: string;
  action: ActionAttributes | ActionAttributes[];
};

export type RoleAttributes = {
  id: number;
  name: string;
  code: string;
  description?: string;
  permissions?: PermissionAttributes[];
  createdAt: Date;
  updatedAt: Date;
};

type RoleCreationAttributes = Optional<RoleAttributes, "id" | "createdAt" | "updatedAt">;

@Table({ tableName: "roles" })
export class Role extends Model<RoleAttributes, RoleCreationAttributes> {
  id: number;
  @Column({ type: DataType.STRING(255), allowNull: false })
  name: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  code: string;

  @Column(DataType.STRING(255))
  description?: string;

  @Column(DataType.JSONB)
  permissions?: PermissionAttributes[];

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Kid)
  kids: Kid[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
