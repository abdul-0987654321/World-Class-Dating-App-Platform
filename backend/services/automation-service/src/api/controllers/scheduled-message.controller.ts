import { Response } from 'express';
import { createLogger } from '@flamoral/backend-shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ScheduledMessageService } from '../../services/scheduled-message.service';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto } from '../../dtos';

const logger = createLogger('automation-service:scheduled-message-controller');
const scheduledMessageService = new ScheduledMessageService();

/**
 * Create scheduled message
 */
export const createScheduledMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const dto: CreateScheduledMessageDto = {
      ...req.body,
      userId: req.userId!,
    };

    const result = await scheduledMessageService.createScheduledMessage(dto);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Create failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update scheduled message
 */
export const updateScheduledMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const dto: UpdateScheduledMessageDto = req.body;

    const result = await scheduledMessageService.updateScheduledMessage(id, dto);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Update failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Delete scheduled message
 */
export const deleteScheduledMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await scheduledMessageService.deleteScheduledMessage(id);

    res.json({
      success: true,
      message: 'Scheduled message deleted',
    });
  } catch (error: any) {
    logger.error('Delete failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Create match warmup sequence
 */
export const createMatchWarmupSequence = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const dto = {
      ...req.body,
      userId: req.userId!,
    };

    const result = await scheduledMessageService.createMatchWarmupSequence(dto);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Warmup sequence failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
