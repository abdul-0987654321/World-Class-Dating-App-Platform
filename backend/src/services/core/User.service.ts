import { UserRepository } from '../../repositories';
import { UserUpdateInput } from '../../models/User.model';

export class UserService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    this.userRepo = userRepo;
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(userId: string, input: UserUpdateInput) {
    const user = await this.userRepo.update(userId, input);
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(userId: string) {
    await this.userRepo.softDelete(userId);
  }

  async getUserSettings(userId: string) {
    return await this.userRepo.getSettings(userId);
  }

  async updateUserSettings(userId: string, settings: any) {
    return await this.userRepo.updateSettings(userId, settings);
  }

  async updateLocation(userId: string, lat: number, lng: number, city?: string, state?: string, country?: string) {
    await this.userRepo.updateLocation(userId, lat, lng, city, state, country);
  }

  async getUserLocation(userId: string) {
    return await this.userRepo.getLocation(userId);
  }

  async searchUsers(filters: any) {
    return await this.userRepo.search(filters);
  }

  async updateCoinBalance(userId: string, amount: number) {
    return await this.userRepo.updateCoinBalance(userId, amount);
  }

  async getCoinBalance(userId: string) {
    const user = await this.userRepo.findById(userId);
    return user?.coin_balance || 0;
  }
}
