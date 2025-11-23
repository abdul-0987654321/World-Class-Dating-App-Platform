import { ApiClient } from './client';
import type {
  User,
  Profile,
  UpdateProfileRequest,
  UploadPhotoResponse
} from '@connectsphere/types';

export class UserApi {
  constructor(private client: ApiClient) {}

  async getProfile(userId?: string): Promise<Profile> {
    const url = userId ? `/users/${userId}/profile` : '/users/me/profile';
    return this.client.get<Profile>(url);
  }

  async updateProfile(data: UpdateProfileRequest): Promise<Profile> {
    return this.client.put<Profile>('/users/me/profile', data);
  }

  async uploadPhoto(file: File | Blob): Promise<UploadPhotoResponse> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.client.post<UploadPhotoResponse>('/users/me/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async deletePhoto(photoId: string): Promise<void> {
    return this.client.delete<void>(`/users/me/photos/${photoId}`);
  }

  async reorderPhotos(photoIds: string[]): Promise<void> {
    return this.client.post<void>('/users/me/photos/reorder', { photoIds });
  }

  async getSettings(): Promise<any> {
    return this.client.get<any>('/users/me/settings');
  }

  async updateSettings(settings: any): Promise<any> {
    return this.client.put<any>('/users/me/settings', settings);
  }

  async blockUser(userId: string): Promise<void> {
    return this.client.post<void>(`/users/${userId}/block`);
  }

  async unblockUser(userId: string): Promise<void> {
    return this.client.delete<void>(`/users/${userId}/block`);
  }

  async reportUser(userId: string, reason: string, description?: string): Promise<void> {
    return this.client.post<void>(`/users/${userId}/report`, { reason, description });
  }
}
