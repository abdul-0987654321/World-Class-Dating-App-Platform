import { ProfileRepository } from '../../../domain/repositories/profile.repository';
import { mockDatabase } from '../../helpers/db-mock';
import { createMockProfile } from '../../helpers/test-data';

jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('ProfileRepository', () => {
  let profileRepository: ProfileRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    profileRepository = new ProfileRepository();
  });

  describe('create', () => {
    it('should create a new profile and return profile entity', async () => {
      const userId = 'test-user-id';
      const mockProfile = createMockProfile(userId);

      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles', [mockProfile]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await profileRepository.create({ user_id: userId });

      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
    });

    it('should handle database errors when creating profile', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Database error')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await expect(profileRepository.create({ user_id: 'user-id' })).rejects.toThrow('Database error');
    });
  });

  describe('findByUserId', () => {
    it('should return profile when found by user id', async () => {
      const userId = 'test-user-id';
      const mockProfile = createMockProfile(userId);

      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles', mockProfile);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      const result = await profileRepository.findByUserId(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile not found', async () => {
      const { mockKnex } = mockDatabase('profiles', null);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      const result = await profileRepository.findByUserId('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update profile with provided data', async () => {
      const userId = 'test-user-id';
      const updateData = {
        bio: 'Updated bio',
        occupation: 'Senior Developer',
        city: 'New York',
      };
      const updatedProfile = createMockProfile(userId, updateData);

      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles', [updatedProfile]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await profileRepository.update(userId, updateData);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: 'Updated bio',
          occupation: 'Senior Developer',
          city: 'New York',
        })
      );
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
    });

    it('should update interests and languages as JSONB arrays', async () => {
      const userId = 'test-user-id';
      const updateData = {
        interests: ['coding', 'gaming', 'travel'],
        languages: ['English', 'Spanish', 'French'],
      };
      const updatedProfile = createMockProfile(userId, updateData);

      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles', [updatedProfile]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await profileRepository.update(userId, updateData);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: ['coding', 'gaming', 'travel'],
          languages: ['English', 'Spanish', 'French'],
        })
      );
    });

    it('should handle partial updates', async () => {
      const userId = 'test-user-id';
      const updateData = { bio: 'Only updating bio' };
      const updatedProfile = createMockProfile(userId, updateData);

      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles', [updatedProfile]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await profileRepository.update(userId, updateData);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: 'Only updating bio',
        })
      );
    });

    it('should return null if profile not found', async () => {
      const { mockKnex } = mockDatabase('profiles', []);

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      const result = await profileRepository.update('non-existent-id', { bio: 'test' });

      expect(result).toBeUndefined();
    });

    it('should handle database errors when updating', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Update failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await expect(
        profileRepository.update('user-id', { bio: 'test' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete profile by user id', async () => {
      const userId = 'test-user-id';
      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles');

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await profileRepository.delete(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle errors when deleting profile', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('profiles');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Delete failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      profileRepository = new ProfileRepository();

      await expect(profileRepository.delete('user-id')).rejects.toThrow('Delete failed');
    });
  });
});
