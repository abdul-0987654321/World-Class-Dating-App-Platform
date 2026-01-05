import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { ExecutionStatus, ActionExecutionResult } from '../interfaces/workflow.interface';

import { Workflow } from './workflow.entity';

@Entity('workflow_executions')
@Index(['workflowId', 'createdAt'])
@Index(['status'])
@Index(['userId'])
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => Workflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb' })
  triggerData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', nullable: true })
  conditionsEvaluated: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditionResults: Record<string, boolean>;

  @Column({ type: 'jsonb', nullable: true })
  actionsExecuted: ActionExecutionResult[];

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @Column({ type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'int', nullable: true })
  duration: number; // in milliseconds

  @CreateDateColumn()
  createdAt: Date;
}
