import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { Optional } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  DeletedAt,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

export type LearningGoalAttributes = {
  d?: number;
  w?: number[];
};

export type KidAttributes = {
  id: number;
  firstname: string;
  lastname: string;
  dob: string;
  gender: string;
  parentId: number;
  roleId: number;
  profilePicture?: string;
  avatarCode?: string;
  buddyCode?: string;
  buddyName?: string;
  learningGoal?: LearningGoalAttributes;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

type KidCreationAttributes = Optional<KidAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

@Table({ modelName: "kids", paranoid: true })
export class Kid extends Model<KidAttributes, KidCreationAttributes> {
  id: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  firstname: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  lastname: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  dob: string;

  @Column({ type: DataType.STRING(1), allowNull: false })
  gender: string;

  @ForeignKey(() => User)
  @Column({ allowNull: false })
  parentId: number;

  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER, allowNull: false })
  roleId: number;

  @BelongsTo(() => Role)
  role: Role;

  @Column(DataType.STRING(255))
  profilePicture?: string;

  @Column(DataType.STRING(255))
  avatarCode?: string;

  @Column(DataType.STRING(255))
  buddyCode?: string;

  @Column(DataType.STRING(255))
  buddyName?: string;

  @Column(DataType.JSONB)
  learningGoal?: LearningGoalAttributes;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt?: Date;
}
