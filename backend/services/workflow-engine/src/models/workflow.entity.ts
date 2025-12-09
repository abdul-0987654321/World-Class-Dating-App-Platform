import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  TriggerConfig,
  ConditionConfig,
  ActionConfig,
  WorkflowStatus,
} from '../interfaces/workflow.interface';

@Entity('workflows')
@Index(['status'])
@Index(['createdBy'])
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  trigger: TriggerConfig;

  @Column({ type: 'jsonb', nullable: true })
  conditions: ConditionConfig[];

  @Column({ type: 'jsonb' })
  actions: ActionConfig[];

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
