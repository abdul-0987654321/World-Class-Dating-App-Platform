import db from '../../infrastructure/database/connection';
import {
  OpeningMoveEntity,
  OpeningMoveTemplateEntity,
  MatchOpeningResponseEntity,
  CreateOpeningMoveDto,
  UpdateOpeningMoveDto,
  CreateOpeningResponseDto,
  TemplateCategory,
} from '../entities/OpeningMove.entity';

export class OpeningMoveRepository {
  private tableName = 'opening_moves';
  private templatesTableName = 'opening_move_templates';
  private responsesTableName = 'match_opening_responses';

  // Opening Moves CRUD
  async create(userId: string, moveData: CreateOpeningMoveDto): Promise<OpeningMoveEntity> {
    const [move] = await db(this.tableName)
      .insert({
        user_id: userId,
        ...moveData,
      })
      .returning('*');

    return move;
  }

  async findByUserId(userId: string): Promise<OpeningMoveEntity[]> {
    return db(this.tableName).where({ user_id: userId }).orderBy('order', 'asc');
  }

  async findActiveByUserId(userId: string): Promise<OpeningMoveEntity[]> {
    return db(this.tableName).where({ user_id: userId, active: true }).orderBy('order', 'asc');
  }

  async findById(id: string): Promise<OpeningMoveEntity | null> {
    const move = await db(this.tableName).where({ id }).first();
    return move || null;
  }

  async update(
    id: string,
    userId: string,
    moveData: UpdateOpeningMoveDto
  ): Promise<OpeningMoveEntity | null> {
    const [move] = await db(this.tableName)
      .where({ id, user_id: userId })
      .update({
        ...moveData,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return move || null;
  }

  async delete(id: string, userId: string): Promise<void> {
    await db(this.tableName).where({ id, user_id: userId }).delete();
  }

  async countActiveByUserId(userId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ user_id: userId, active: true })
      .count('id as count')
      .first();

    return parseInt(result?.count as string) || 0;
  }

  async deactivateAll(userId: string): Promise<void> {
    await db(this.tableName)
      .where({ user_id: userId })
      .update({ active: false, updated_at: db.fn.now() });
  }

  // Templates CRUD
  async findAllTemplates(): Promise<OpeningMoveTemplateEntity[]> {
    return db(this.templatesTableName).where({ active: true }).orderBy('popularity_score', 'desc');
  }

  async findTemplatesByCategory(category: TemplateCategory): Promise<OpeningMoveTemplateEntity[]> {
    return db(this.templatesTableName)
      .where({ category, active: true })
      .orderBy('popularity_score', 'desc');
  }

  async findTemplateById(id: string): Promise<OpeningMoveTemplateEntity | null> {
    const template = await db(this.templatesTableName).where({ id }).first();
    return template || null;
  }

  async incrementTemplatePopularity(templateId: string): Promise<void> {
    await db(this.templatesTableName).where({ id: templateId }).increment('popularity_score', 1);
  }

  // Match Opening Responses
  async createResponse(
    responseData: CreateOpeningResponseDto & { responder_id: string }
  ): Promise<MatchOpeningResponseEntity> {
    const [response] = await db(this.responsesTableName).insert(responseData).returning('*');

    return response;
  }

  async findResponseByMatchId(matchId: string): Promise<MatchOpeningResponseEntity | null> {
    const response = await db(this.responsesTableName).where({ match_id: matchId }).first();

    return response || null;
  }

  async hasUserResponded(matchId: string, userId: string): Promise<boolean> {
    const response = await db(this.responsesTableName)
      .where({ match_id: matchId, responder_id: userId })
      .first();

    return !!response;
  }

  // Get opening moves with template details
  async findOpeningMovesWithTemplates(userId: string): Promise<any[]> {
    return db(this.tableName)
      .leftJoin(
        this.templatesTableName,
        `${this.tableName}.template_id`,
        `${this.templatesTableName}.id`
      )
      .where(`${this.tableName}.user_id`, userId)
      .where(`${this.tableName}.active`, true)
      .select(
        `${this.tableName}.*`,
        db.raw(`
          CASE
            WHEN ${this.tableName}.template_id IS NOT NULL
            THEN json_build_object(
              'id', ${this.templatesTableName}.id,
              'category', ${this.templatesTableName}.category,
              'content', ${this.templatesTableName}.content,
              'is_system', ${this.templatesTableName}.is_system,
              'popularity_score', ${this.templatesTableName}.popularity_score
            )
            ELSE NULL
          END as template
        `)
      )
      .orderBy(`${this.tableName}.order`, 'asc');
  }
}
