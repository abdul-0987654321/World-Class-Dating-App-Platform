import {
  PromptResponse,
  UserPromptResponse,
  CreateUserPromptDto,
  UpdateUserPromptDto,
} from '../entities/Prompt.entity';
import { PromptRepository } from '../repositories/prompt.repository';

export class PromptService {
  private promptRepository: PromptRepository;
  private readonly MAX_USER_PROMPTS = 6;

  constructor(promptRepository?: PromptRepository) {
    this.promptRepository = promptRepository || new PromptRepository();
  }

  async getAvailablePrompts(): Promise<PromptResponse[]> {
    const prompts = await this.promptRepository.findAllActivePrompts();
    return prompts.map((p) => ({
      id: p.id,
      question: p.question,
      category: p.category,
    }));
  }

  async addUserPrompt(
    userId: string,
    promptId: string,
    answer: string
  ): Promise<UserPromptResponse> {
    // Validate prompt exists
    const prompt = await this.promptRepository.findPromptById(promptId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Check if user already answered this prompt
    const exists = await this.promptRepository.checkUserPromptExists(userId, promptId);
    if (exists) {
      throw new Error('You have already answered this prompt');
    }

    // Check max prompts limit
    const count = await this.promptRepository.countUserPrompts(userId);
    if (count >= this.MAX_USER_PROMPTS) {
      throw new Error(`Maximum ${this.MAX_USER_PROMPTS} prompts allowed`);
    }

    const createData: CreateUserPromptDto = {
      user_id: userId,
      prompt_id: promptId,
      answer: answer.trim(),
      display_order: count,
    };

    const userPrompt = await this.promptRepository.createUserPrompt(createData);
    return {
      id: userPrompt.id,
      prompt_id: promptId,
      question: prompt.question,
      answer: userPrompt.answer,
      category: prompt.category,
      display_order: userPrompt.display_order,
    };
  }

  async getUserPrompts(userId: string): Promise<UserPromptResponse[]> {
    const userPrompts = await this.promptRepository.findUserPrompts(userId);
    return userPrompts.map((up) => ({
      id: up.id,
      prompt_id: up.prompt_id,
      question: up.question,
      answer: up.answer,
      category: up.category,
      display_order: up.display_order,
    }));
  }

  async updateUserPrompt(
    userId: string,
    userPromptId: string,
    answer: string
  ): Promise<UserPromptResponse> {
    const userPrompt = await this.promptRepository.findUserPromptById(userPromptId);
    if (!userPrompt) {
      throw new Error('User prompt not found');
    }

    if (userPrompt.user_id !== userId) {
      throw new Error('Unauthorized to update this prompt');
    }

    const updateData: UpdateUserPromptDto = {
      answer: answer.trim(),
    };

    await this.promptRepository.updateUserPrompt(userPromptId, updateData);

    // Get updated data with prompt details
    const updated = await this.promptRepository.findUserPrompts(userId);
    const updatedPrompt = updated.find((up) => up.id === userPromptId);

    if (!updatedPrompt) {
      throw new Error('Failed to retrieve updated prompt');
    }

    return {
      id: updatedPrompt.id,
      prompt_id: updatedPrompt.prompt_id,
      question: updatedPrompt.question,
      answer: updatedPrompt.answer,
      category: updatedPrompt.category,
      display_order: updatedPrompt.display_order,
    };
  }

  async deleteUserPrompt(userId: string, userPromptId: string): Promise<void> {
    const userPrompt = await this.promptRepository.findUserPromptById(userPromptId);
    if (!userPrompt) {
      throw new Error('User prompt not found');
    }

    if (userPrompt.user_id !== userId) {
      throw new Error('Unauthorized to delete this prompt');
    }

    await this.promptRepository.deleteUserPrompt(userPromptId);
  }
}
