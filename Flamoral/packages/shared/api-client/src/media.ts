import { ApiClient } from './client';

export class MediaApi {
  constructor(private client: ApiClient) {}

  async uploadImage(file: File | Blob, type: 'profile' | 'message' | 'verification'): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.client.post<{ url: string; id: string }>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async deleteImage(imageId: string): Promise<void> {
    return this.client.delete<void>(`/media/${imageId}`);
  }

  getImageUrl(path: string, baseUrl?: string): string {
    // Handle both absolute and relative paths
    if (path.startsWith('http')) {
      return path;
    }
    // Use provided baseUrl or path as-is
    return baseUrl ? `${baseUrl}${path}` : path;
  }
}
