import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

import {
  TriggerType,
  ConditionType,
  ActionType,
  WorkflowStatus,
} from '../interfaces/workflow.interface';

export class TriggerConfigDto {
  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  type: TriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class ConditionConfigDto {
  @ApiProperty({ enum: ConditionType })
  @IsEnum(ConditionType)
  type: ConditionType;

  @ApiProperty({
    enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains'],
  })
  @IsEnum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains'])
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';

  @ApiProperty()
  value: any;

  @ApiPropertyOptional({ enum: ['AND', 'OR'] })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  logicalOperator?: 'AND' | 'OR';
}

export class ActionConfigDto {
  @ApiProperty({ enum: ActionType })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiProperty()
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  delay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  retryOnFailure?: boolean;
}

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: TriggerConfigDto })
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  trigger: TriggerConfigDto;

  @ApiPropertyOptional({ type: [ConditionConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionConfigDto)
  conditions?: ConditionConfigDto[];

  @ApiProperty({ type: [ActionConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionConfigDto)
  actions: ActionConfigDto[];

  @ApiPropertyOptional({ enum: WorkflowStatus })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
