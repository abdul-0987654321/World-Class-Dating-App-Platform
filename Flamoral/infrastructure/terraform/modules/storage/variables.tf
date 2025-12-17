# Variables for Storage Lifecycle Management Module

variable "storage_account_id" {
  description = "The ID of the Azure Storage Account to apply lifecycle policies to"
  type        = string
}

variable "enable_lifecycle_management" {
  description = "Enable lifecycle management policies"
  type        = bool
  default     = true
}

variable "profile_photo_cool_days" {
  description = "Days after modification to move profile photos to Cool tier"
  type        = number
  default     = 30
}

variable "album_photo_cool_days" {
  description = "Days after modification to move album photos to Cool tier"
  type        = number
  default     = 30
}

variable "album_photo_archive_days" {
  description = "Days after modification to move album photos to Archive tier"
  type        = number
  default     = 90
}

variable "verification_cool_days" {
  description = "Days after modification to move verification photos to Cool tier"
  type        = number
  default     = 7
}

variable "verification_archive_days" {
  description = "Days after modification to move verification photos to Archive tier"
  type        = number
  default     = 14
}

variable "temp_file_delete_days" {
  description = "Days after modification to delete temporary files"
  type        = number
  default     = 7
}

variable "soft_delete_retention_days" {
  description = "Days to retain soft-deleted items before permanent deletion"
  type        = number
  default     = 14
}

variable "thumbnail_cool_days" {
  description = "Days after modification to move thumbnails to Cool tier"
  type        = number
  default     = 60
}

variable "thumbnail_archive_days" {
  description = "Days after modification to move thumbnails to Archive tier"
  type        = number
  default     = 180
}

variable "video_cool_days" {
  description = "Days after modification to move videos to Cool tier"
  type        = number
  default     = 45
}

variable "video_archive_days" {
  description = "Days after modification to move videos to Archive tier"
  type        = number
  default     = 120
}

variable "inactive_user_archive_days" {
  description = "Days after modification to archive inactive user photos"
  type        = number
  default     = 30
}

variable "inactive_user_delete_days" {
  description = "Days after modification to delete inactive user photos"
  type        = number
  default     = 365
}

variable "original_photo_cool_days" {
  description = "Days after modification to move original photos to Cool tier"
  type        = number
  default     = 60
}

variable "original_photo_archive_days" {
  description = "Days after modification to move original photos to Archive tier"
  type        = number
  default     = 180
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
