import { OpeningMoveRepository } from '../repositories/opening-move.repository';
import {
  OpeningMoveResponse,
  OpeningMoveTemplateResponse,
  CreateOpeningMoveDto,
  UpdateOpeningMoveDto,
  CreateOpeningResponseDto,
  TemplateCategory,
} from '../entities/OpeningMove.entity';
import logger from '../../utils/logger';

const MAX_OPENING_MOVES = 3;

export class OpeningMoveService {
  private repository: OpeningMoveRepository;

  constructor() {
    this.repository = new OpeningMoveRepository();
  }

  // Get user's opening moves
  async getUserOpeningMoves(userId: string): Promise<OpeningMoveResponse[]> {
    const moves = await this.repository.findOpeningMovesWithTemplates(userId);
    return moves;
  }

  // Create a new opening move
  async createOpeningMove(userId: string, moveData: CreateOpeningMoveDto): Promise<OpeningMoveResponse> {
    // Check if user already has 3 active opening moves
    const activeCount = await this.repository.countActiveByUserId(userId);
    if (activeCount >= MAX_OPENING_MOVES) {
      throw new Error(`You can only have up to ${MAX_OPENING_MOVES} active opening moves`);
    }

    // Validate based on type
    this.validateOpeningMove(moveData);

    // If order not provided, set to next available
    if (moveData.order === undefined) {
      moveData.order = activeCount;
    }

    // If using a template, increment its popularity
    if (moveData.template_id) {
      await this.repository.incrementTemplatePopularity(moveData.template_id);
    }

    const move = await this.repository.create(userId, moveData);
    logger.info(`Opening move created for user ${userId}`);

    // Fetch with template details if applicable
    const [moveWithTemplate] = await this.repository.findOpeningMovesWithTemplates(userId);
    return moveWithTemplate || move;
  }

  // Update an opening move
  async updateOpeningMove(
    id: string,
    userId: string,
    updateData: UpdateOpeningMoveDto
  ): Promise<OpeningMoveResponse> {
    const existingMove = await this.repository.findById(id);
    if (!existingMove) {
      throw new Error('Opening move not found');
    }

    if (existingMove.user_id !== userId) {
      throw new Error('You can only update your own opening moves');
    }

    const updated = await this.repository.update(id, userId, updateData);
    if (!updated) {
      throw new Error('Failed to update opening move');
    }

    logger.info(`Opening move ${id} updated for user ${userId}`);
    return updated;
  }

  // Delete an opening move
  async deleteOpeningMove(id: string, userId: string): Promise<void> {
    const existingMove = await this.repository.findById(id);
    if (!existingMove) {
      throw new Error('Opening move not found');
    }

    if (existingMove.user_id !== userId) {
      throw new Error('You can only delete your own opening moves');
    }

    await this.repository.delete(id, userId);
    logger.info(`Opening move ${id} deleted for user ${userId}`);
  }

  // Reorder opening moves
  async reorderOpeningMoves(userId: string, orderedIds: string[]): Promise<OpeningMoveResponse[]> {
    if (orderedIds.length > MAX_OPENING_MOVES) {
      throw new Error(`You can only have up to ${MAX_OPENING_MOVES} opening moves`);
    }

    // Verify all IDs belong to the user
    const userMoves = await this.repository.findActiveByUserId(userId);
    const userMoveIds = userMoves.map(m => m.id);

    for (const id of orderedIds) {
      if (!userMoveIds.includes(id)) {
        throw new Error('Invalid opening move ID');
      }
    }

    // Update order for each move
    for (let i = 0; i < orderedIds.length; i++) {
      await this.repository.update(orderedIds[i], userId, { order: i });
    }

    logger.info(`Opening moves reordered for user ${userId}`);
    return this.getUserOpeningMoves(userId);
  }

  // Get all available templates
  async getAllTemplates(): Promise<OpeningMoveTemplateResponse[]> {
    return this.repository.findAllTemplates();
  }

  // Get templates by category
  async getTemplatesByCategory(category: TemplateCategory): Promise<OpeningMoveTemplateResponse[]> {
    return this.repository.findTemplatesByCategory(category);
  }

  // Create response to opening move
  async createOpeningMoveResponse(
    userId: string,
    responseData: CreateOpeningResponseDto
  ): Promise<any> {
    // Check if user already responded to this match
    const existingResponse = await this.repository.findResponseByMatchId(responseData.match_id);
    if (existingResponse) {
      throw new Error('You have already responded to this match');
    }

    // Verify opening move exists
    const openingMove = await this.repository.findById(responseData.opening_move_id);
    if (!openingMove) {
      throw new Error('Opening move not found');
    }

    // Create the response
    const response = await this.repository.createResponse({
      ...responseData,
      responder_id: userId,
    });

    logger.info(`User ${userId} responded to opening move in match ${responseData.match_id}`);
    return response;
  }

  // Check if user has responded to a match
  async hasUserResponded(matchId: string, userId: string): Promise<boolean> {
    return this.repository.hasUserResponded(matchId, userId);
  }

  // Get response for a match
  async getMatchResponse(matchId: string): Promise<any> {
    return this.repository.findResponseByMatchId(matchId);
  }

  // Private helper to validate opening move data
  private validateOpeningMove(moveData: CreateOpeningMoveDto): void {
    if (moveData.type === 'text' && !moveData.content) {
      throw new Error('Text opening moves must have content');
    }

    if (moveData.type === 'image' && !moveData.image_url) {
      throw new Error('Image opening moves must have an image URL');
    }

    if (moveData.type === 'system' && !moveData.template_id) {
      throw new Error('System opening moves must have a template ID');
    }

    if (moveData.content && moveData.content.length > 200) {
      throw new Error('Opening move content cannot exceed 200 characters');
    }
  }
}
