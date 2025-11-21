import { MediaMetadata, ModerationStatus, ModerationResult } from '../../types';

export class MediaEntity implements MediaMetadata {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  urls: {
    thumbnail: string;
    standard: string;
    hd: string;
    original: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  isProfilePhoto: boolean;
  isVerified: boolean;
  moderationStatus: ModerationStatus;
  moderationResult?: ModerationResult;
  uploadedAt: Date;
  updatedAt: Date;

  constructor(data: MediaMetadata) {
    this.id = data.id;
    this.userId = data.userId;
    this.fileName = data.fileName;
    this.originalName = data.originalName;
    this.mimeType = data.mimeType;
    this.size = data.size;
    this.urls = data.urls;
    this.dimensions = data.dimensions;
    this.isProfilePhoto = data.isProfilePhoto;
    this.isVerified = data.isVerified;
    this.moderationStatus = data.moderationStatus;
    this.moderationResult = data.moderationResult;
    this.uploadedAt = data.uploadedAt;
    this.updatedAt = data.updatedAt;
  }

  markAsProfilePhoto(): void {
    this.isProfilePhoto = true;
    this.updatedAt = new Date();
  }

  markAsVerified(): void {
    this.isVerified = true;
    this.updatedAt = new Date();
  }

  updateModerationStatus(status: ModerationStatus, result?: ModerationResult): void {
    this.moderationStatus = status;
    this.moderationResult = result;
    this.updatedAt = new Date();
  }

  isApproved(): boolean {
    return this.moderationStatus === ModerationStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.moderationStatus === ModerationStatus.REJECTED;
  }

  isPending(): boolean {
    return this.moderationStatus === ModerationStatus.PENDING;
  }
}
