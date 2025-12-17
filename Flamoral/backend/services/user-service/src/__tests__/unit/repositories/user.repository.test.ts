/// <reference types="jest" />
import { UserRepository } from '../../../domain/repositories/user.repository';
import { mockDatabase } from '../../helpers/db-mock';
import { createMockUser, createMockCreateUserDto } from '../../helpers/test-data';

// Mock the database module
jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    userRepository = new UserRepository();
  });

  describe('create', () => {
    it('should create a new user and return user entity', async () => {
      const mockUserData = createMockCreateUserDto();
      const mockUser = createMockUser({
        email: mockUserData.email,
        first_name: mockUserData.first_name,
        last_name: mockUserData.last_name,
      });

      const { mockKnex, mockQueryBuilder } = mockDatabase('users', [mockUser]);
      require('../../../infrastructure/database/connection').default = mockKnex;

      userRepository = new UserRepository();
      await userRepository.create({
        ...mockUserData,
        password_hash: 'hashed_password',
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUserData.email,
          first_name: mockUserData.first_name,
          last_name: mockUserData.last_name,
          password_hash: 'hashed_password',
        })
      );
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
    });

    it('should handle database errors when creating user', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('users');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Database error')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await expect(
        userRepository.create({
          ...createMockCreateUserDto(),
          password_hash: 'hashed_password',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should return user when found by id', async () => {
      const mockUser = createMockUser();
      const { mockKnex, mockQueryBuilder } = mockDatabase('users', mockUser);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      const result = await userRepository.findById(mockUser.id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: mockUser.id });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const { mockKnex } = mockDatabase('users', null);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      const result = await userRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = createMockUser();
      const { mockKnex, mockQueryBuilder } = mockDatabase('users', mockUser);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      const result = await userRepository.findByEmail(mockUser.email);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ email: mockUser.email });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user with email not found', async () => {
      const { mockKnex } = mockDatabase('users', null);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle email case-insensitivity', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const { mockKnex, mockQueryBuilder } = mockDatabase('users', mockUser);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await userRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should update is_email_verified and is_verified to true', async () => {
      const userId = 'test-user-id';
      const updatedUser = createMockUser({
        id: userId,
        is_email_verified: true,
        is_verified: true,
      });

      const { mockKnex, mockQueryBuilder } = mockDatabase('users', [updatedUser]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await userRepository.verifyEmail(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_email_verified: true,
        is_verified: true,
      });
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
    });

    it('should return null if user not found', async () => {
      const { mockKnex } = mockDatabase('users', []);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      const result = await userRepository.verifyEmail('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userId = 'test-user-id';
      const newPasswordHash = 'new_hashed_password';
      const updatedUser = createMockUser({
        id: userId,
        password_hash: newPasswordHash,
      });

      const { mockKnex, mockQueryBuilder } = mockDatabase('users', [updatedUser]);

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await userRepository.updatePassword(userId, newPasswordHash);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        password_hash: newPasswordHash,
      });
    });

    it('should handle database errors when updating password', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('users');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Update failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await expect(
        userRepository.updatePassword('user-id', 'new-hash')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last_login_at timestamp', async () => {
      const userId = 'test-user-id';
      const { mockKnex, mockQueryBuilder } = mockDatabase('users');

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await userRepository.updateLastLogin(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete user by setting is_active to false', async () => {
      const userId = 'test-user-id';
      const { mockKnex, mockQueryBuilder } = mockDatabase('users');

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await userRepository.delete(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('should handle errors when deleting user', async () => {
      const { mockKnex, mockQueryBuilder } = mockDatabase('users');
      mockQueryBuilder.then.mockImplementation(() => Promise.reject(new Error('Delete failed')));

      require('../../../infrastructure/database/connection').default = mockKnex;
      userRepository = new UserRepository();

      await expect(userRepository.delete('user-id')).rejects.toThrow('Delete failed');
    });
  });
});
