import db from '../../infrastructure/database/connection';
import {
  PromptEntity,
  UserPromptEntity,
  CreateUserPromptDto,
  UpdateUserPromptDto,
} from '../entities/Prompt.entity';

export class PromptRepository {
  private readonly promptsTable = 'prompts';
  private readonly userPromptsTable = 'user_prompts';

  // Prompt methods
  async findAllActivePrompts(): Promise<PromptEntity[]> {
    return db(this.promptsTable).where({ is_active: true }).orderBy('display_order', 'asc');
  }

  async findPromptById(id: string): Promise<PromptEntity | null> {
    const prompt = await db(this.promptsTable).where({ id }).first();
    return prompt || null;
  }

  // User Prompt methods
  async createUserPrompt(data: CreateUserPromptDto): Promise<UserPromptEntity> {
    const [userPrompt] = await db(this.userPromptsTable).insert(data).returning('*');
    return userPrompt;
  }

  async findUserPrompts(userId: string): Promise<any[]> {
    return db(this.userPromptsTable as any)
      .select(
        'user_prompts.id',
        'user_prompts.prompt_id',
        'user_prompts.answer',
        'user_prompts.display_order',
        'prompts.question',
        'prompts.category'
      )
      .join('prompts', 'user_prompts.prompt_id', 'prompts.id')
      .where({ 'user_prompts.user_id': userId })
      .orderBy('user_prompts.display_order', 'asc');
  }

  async findUserPromptById(id: string): Promise<UserPromptEntity | null> {
    const userPrompt = await db(this.userPromptsTable).where({ id }).first();
    return userPrompt || null;
  }

  async updateUserPrompt(id: string, data: UpdateUserPromptDto): Promise<UserPromptEntity> {
    const [userPrompt] = await db(this.userPromptsTable)
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return userPrompt;
  }

  async deleteUserPrompt(id: string): Promise<void> {
    await db(this.userPromptsTable).where({ id }).delete();
  }

  async checkUserPromptExists(userId: string, promptId: string): Promise<boolean> {
    const exists = await db(this.userPromptsTable)
      .where({ user_id: userId, prompt_id: promptId })
      .first();
    return !!exists;
  }

  async countUserPrompts(userId: string): Promise<number> {
    const result = await db(this.userPromptsTable)
      .where({ user_id: userId })
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }

  /**
   * PERFORMANCE: Batch fetch prompts for multiple users
   * Fixes N+1 query issue in discovery feed
   */
  async findUserPromptsBatch(userIds: string[]): Promise<any[]> {
    if (userIds.length === 0) {
      return [];
    }

    return db(this.userPromptsTable as any)
      .select(
        'user_prompts.id',
        'user_prompts.user_id',
        'user_prompts.prompt_id',
        'user_prompts.answer',
        'user_prompts.display_order',
        'prompts.question',
        'prompts.category'
      )
      .join('prompts', 'user_prompts.prompt_id', 'prompts.id')
      .whereIn('user_prompts.user_id', userIds)
      .orderBy('user_prompts.display_order', 'asc');
  }
}
