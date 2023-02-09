import { Optional } from "sequelize";
import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  DeletedAt,
} from "sequelize-typescript";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";

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

  @Column(DataType.STRING(255))
  firstname: string;

  @Column(DataType.STRING(255))
  lastname: string;

  @Column(DataType.STRING(255))
  dob: string;

  @Column(DataType.STRING(1))
  gender: string;

  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  parentId: number;

  @ForeignKey(() => Role)
  @Column(DataType.TINYINT)
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
  
  @Column(DataType.JSON)
  learningGoal?: LearningGoalAttributes;
  
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
