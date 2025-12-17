import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ScheduledMessageService } from '../../services/scheduled-message.service';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto } from '../../dtos';

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
    console.error('[ScheduledMessageController] Create failed:', error.message);
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
    console.error('[ScheduledMessageController] Update failed:', error.message);
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
    console.error('[ScheduledMessageController] Delete failed:', error.message);
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
    console.error('[ScheduledMessageController] Warmup sequence failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
