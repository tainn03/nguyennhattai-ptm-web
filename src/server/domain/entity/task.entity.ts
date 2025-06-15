import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

// Add TaskStatus enum
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

@Entity("Tasks")
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({unique: true})
  title!: string;

  @Column()
  desc!: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status!: TaskStatus;

  @Column()
  deadline!: Date;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;
  
  @Column({ nullable: true })
  createdBy!: string;
  
  @Column({ nullable: true })
  updatedBy!: string;
}