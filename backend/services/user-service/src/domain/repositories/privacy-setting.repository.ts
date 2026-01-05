import db from '../../infrastructure/database/connection';
import {
  PrivacySetting,
  PrivacySettingCreateInput,
  PrivacySettingUpdateInput,
} from '../entities/PrivacySetting.entity';

export class PrivacySettingRepository {
  private tableName = 'privacy_settings';

  async create(input: PrivacySettingCreateInput): Promise<PrivacySetting> {
    const now = new Date();
    const settingsData = {
      user_id: input.userId,
      // All other fields use database defaults
      created_at: now,
      updated_at: now,
    };

    const [settings] = await db(this.tableName).insert(settingsData).returning('*');

    return this.mapToEntity(settings);
  }

  async findById(id: string): Promise<PrivacySetting | null> {
    const settings = await db(this.tableName).where({ id }).first();

    return settings ? this.mapToEntity(settings) : null;
  }

  async findByUserId(userId: string): Promise<PrivacySetting | null> {
    const settings = await db(this.tableName).where({ user_id: userId }).first();

    return settings ? this.mapToEntity(settings) : null;
  }

  async update(id: string, input: PrivacySettingUpdateInput): Promise<PrivacySetting> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.incognitoMode !== undefined) updateData.incognito_mode = input.incognitoMode;
    if (input.incognitoUntil !== undefined) updateData.incognito_until = input.incognitoUntil;
    if (input.showDistance !== undefined) updateData.show_distance = input.showDistance;
    if (input.showLastActive !== undefined) updateData.show_last_active = input.showLastActive;
    if (input.showOnlineStatus !== undefined)
      updateData.show_online_status = input.showOnlineStatus;
    if (input.showAge !== undefined) updateData.show_age = input.showAge;
    if (input.profileVisibility !== undefined)
      updateData.profile_visibility = input.profileVisibility;
    if (input.hideFromContacts !== undefined)
      updateData.hide_from_contacts = input.hideFromContacts;
    if (input.hiddenContactNumbers !== undefined) {
      updateData.hidden_contact_numbers = JSON.stringify(input.hiddenContactNumbers);
    }
    if (input.readReceiptsEnabled !== undefined)
      updateData.read_receipts_enabled = input.readReceiptsEnabled;
    if (input.typingIndicatorsEnabled !== undefined)
      updateData.typing_indicators_enabled = input.typingIndicatorsEnabled;
    if (input.preciseLocation !== undefined) updateData.precise_location = input.preciseLocation;
    if (input.locationRadiusKm !== undefined)
      updateData.location_radius_km = input.locationRadiusKm;

    const [settings] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(settings);
  }

  async updateByUserId(userId: string, input: PrivacySettingUpdateInput): Promise<PrivacySetting> {
    const settings = await this.findByUserId(userId);

    if (!settings) {
      throw new Error('Privacy settings not found for user');
    }

    return this.update(settings.id, input);
  }

  async toggleIncognitoMode(
    userId: string,
    enabled: boolean,
    until?: Date
  ): Promise<PrivacySetting> {
    const settings = await this.findByUserId(userId);

    if (!settings) {
      throw new Error('Privacy settings not found for user');
    }

    const updateData: any = {
      incognito_mode: enabled,
      updated_at: new Date(),
    };

    if (enabled && until) {
      updateData.incognito_until = until;
    } else if (!enabled) {
      updateData.incognito_until = null;
    }

    const [updatedSettings] = await db(this.tableName)
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(updatedSettings);
  }

  async setProfileVisibility(
    userId: string,
    visibility: PrivacySetting['profileVisibility']
  ): Promise<PrivacySetting> {
    const [settings] = await db(this.tableName)
      .where({ user_id: userId })
      .update({
        profile_visibility: visibility,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(settings);
  }

  async updateLocationSettings(
    userId: string,
    preciseLocation: boolean,
    radiusKm?: number
  ): Promise<PrivacySetting> {
    const updateData: any = {
      precise_location: preciseLocation,
      updated_at: new Date(),
    };

    if (!preciseLocation && radiusKm !== undefined) {
      updateData.location_radius_km = radiusKm;
    } else if (preciseLocation) {
      updateData.location_radius_km = 0;
    }

    const [settings] = await db(this.tableName)
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(settings);
  }

  async addHiddenContact(userId: string, phoneNumber: string): Promise<PrivacySetting> {
    const settings = await this.findByUserId(userId);

    if (!settings) {
      throw new Error('Privacy settings not found for user');
    }

    const hiddenNumbers = settings.hiddenContactNumbers || [];

    if (!hiddenNumbers.includes(phoneNumber)) {
      hiddenNumbers.push(phoneNumber);
    }

    const [updatedSettings] = await db(this.tableName)
      .where({ user_id: userId })
      .update({
        hidden_contact_numbers: JSON.stringify(hiddenNumbers),
        hide_from_contacts: true,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(updatedSettings);
  }

  async removeHiddenContact(userId: string, phoneNumber: string): Promise<PrivacySetting> {
    const settings = await this.findByUserId(userId);

    if (!settings) {
      throw new Error('Privacy settings not found for user');
    }

    const hiddenNumbers = (settings.hiddenContactNumbers || []).filter(
      (num) => num !== phoneNumber
    );

    const [updatedSettings] = await db(this.tableName)
      .where({ user_id: userId })
      .update({
        hidden_contact_numbers: JSON.stringify(hiddenNumbers),
        hide_from_contacts: hiddenNumbers.length > 0,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(updatedSettings);
  }

  async findActiveIncognitoUsers(): Promise<PrivacySetting[]> {
    const settings = await db(this.tableName)
      .where({ incognito_mode: true })
      .where(function () {
        this.whereNull('incognito_until').orWhere('incognito_until', '>', new Date());
      })
      .select('*');

    return settings.map(this.mapToEntity);
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId }).del();
  }

  // Map database row to entity
  private mapToEntity(row: any): PrivacySetting {
    return {
      id: row.id,
      userId: row.user_id,
      incognitoMode: row.incognito_mode,
      incognitoUntil: row.incognito_until,
      showDistance: row.show_distance,
      showLastActive: row.show_last_active,
      showOnlineStatus: row.show_online_status,
      showAge: row.show_age,
      profileVisibility: row.profile_visibility,
      hideFromContacts: row.hide_from_contacts,
      hiddenContactNumbers: row.hidden_contact_numbers
        ? JSON.parse(row.hidden_contact_numbers)
        : undefined,
      readReceiptsEnabled: row.read_receipts_enabled,
      typingIndicatorsEnabled: row.typing_indicators_enabled,
      preciseLocation: row.precise_location,
      locationRadiusKm: row.location_radius_km,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new PrivacySettingRepository();
