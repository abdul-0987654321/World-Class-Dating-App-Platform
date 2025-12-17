import { PreferencesRepository } from '../repositories/preferences.repository';
import { UpdatePreferencesDto, PreferencesResponse } from '../entities/Preferences.entity';
import logger from '../../utils/logger';

export class PreferencesService {
  private preferencesRepository: PreferencesRepository;

  constructor() {
    this.preferencesRepository = new PreferencesRepository();
  }

  async getPreferencesByUserId(userId: string): Promise<PreferencesResponse> {
    const preferences = await this.preferencesRepository.findByUserId(userId);
    if (!preferences) {
      throw new Error('Preferences not found');
    }

    return preferences;
  }

  async updatePreferences(userId: string, updateData: UpdatePreferencesDto): Promise<PreferencesResponse> {
    // Validate age range
    if (updateData.age_min !== undefined && updateData.age_max !== undefined) {
      if (updateData.age_min > updateData.age_max) {
        throw new Error('Minimum age must be less than or equal to maximum age');
      }
    }

    // Validate age bounds
    if (updateData.age_min !== undefined && (updateData.age_min < 18 || updateData.age_min > 100)) {
      throw new Error('Minimum age must be between 18 and 100');
    }

    if (updateData.age_max !== undefined && (updateData.age_max < 18 || updateData.age_max > 100)) {
      throw new Error('Maximum age must be between 18 and 100');
    }

    // Validate distance
    if (updateData.distance_max !== undefined && (updateData.distance_max < 1 || updateData.distance_max > 500)) {
      throw new Error('Maximum distance must be between 1 and 500 km');
    }

    const preferences = await this.preferencesRepository.update(userId, updateData);
    if (!preferences) {
      throw new Error('Preferences not found');
    }

    logger.info(`Preferences updated for user: ${userId}`);
    return preferences;
  }
}
