import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'user' | 'admin';

@Entity("Users")
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: UserRole = 'user';
}