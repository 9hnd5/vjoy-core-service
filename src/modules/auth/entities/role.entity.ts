import { User } from "modules/users/entities/user.entity";
import { Optional } from "sequelize";
import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";

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
};

type RoleCreationAttributes = Optional<RoleAttributes, "id">;

@Table({ tableName: "roles", timestamps: false })
export class Role extends Model<RoleAttributes, RoleCreationAttributes> {
  id: number;
  @Column(DataType.STRING(255))
  name: string;

  @Column(DataType.STRING(255))
  code: string;

  @Column(DataType.STRING(255))
  description?: string;

  @Column(DataType.JSON)
  permissions?: PermissionAttributes[];

  @HasMany(() => User)
  users: User[];
}
