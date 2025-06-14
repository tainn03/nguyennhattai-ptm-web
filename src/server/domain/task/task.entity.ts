import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  desc!: string;

  @Column({ type: 'enum', enum: ['todo', 'in_progress', 'done'], default: 'todo' })
  status!: 'todo' | 'in_progress' | 'done';

  @Column()
  deadline!: Date;

  @Column()
  createdAt!: Date;

  @Column()
  createdBy!: string;

  @Column()
  updatedAt!: Date;

  @Column()
  updatedBy!: string;
}