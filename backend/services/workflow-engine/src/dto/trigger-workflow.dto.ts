import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';

import { TriggerType } from '../interfaces/workflow.interface';

export class TriggerWorkflowDto {
  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiProperty()
  @IsObject()
  triggerData: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
