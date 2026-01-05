import logger from '../../utils/logger';
import { UpdateUserDto, UserResponse } from '../entities/User.entity';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateUser(userId: string, updateData: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepository.update(userId, updateData);
    if (!user) {
      throw new Error('User not found');
    }

    logger.info(`User updated: ${userId}`);
    return this.sanitizeUser(user);
  }

  async deactivateAccount(userId: string): Promise<void> {
    await this.userRepository.deactivate(userId);
    logger.info(`User account deactivated: ${userId}`);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.userRepository.delete(userId);
    logger.info(`User account deleted: ${userId}`);
  }

  private sanitizeUser(user: any): UserResponse {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
