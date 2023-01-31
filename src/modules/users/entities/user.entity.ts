import { Table, Column, Model } from 'sequelize-typescript';

@Table({modelName: 'users'})
export class User extends Model {

    @Column
    firstname: string;

    @Column
    lastname: string;

    @Column
    username: string;

    @Column
    email: string;
}
