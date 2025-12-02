import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type UserMode = 'date' | 'friends' | 'network';
export type GroupSizePreference = 'one-on-one' | 'small-group' | 'large-group' | 'any';

interface DateModeProfile {
  relationship_type?: string;
  has_children?: boolean;
  wants_children?: boolean;
  zodiac_sign?: string;
  religion?: string;
  politics?: string;
}

interface FriendsModeProfile {
  friend_looking_for?: string[];
  friend_activities?: string[];
  friend_availability?: string;
  friend_group_size_preference?: GroupSizePreference;
}

interface NetworkModeProfile {
  network_industry?: string;
  network_profession?: string;
  network_company?: string;
  network_job_title?: string;
  network_years_experience?: number;
  network_skills?: string[];
  network_looking_for?: string[];
  network_linkedin_url?: string;
  network_portfolio_url?: string;
  network_career_goals?: string;
  network_open_to_opportunities?: boolean;
}

interface ModeSpecificProfileProps {
  mode: UserMode;
  dateProfile?: DateModeProfile;
  friendsProfile?: FriendsModeProfile;
  networkProfile?: NetworkModeProfile;
  onEdit?: () => void;
  editable?: boolean;
}

export const ModeSpecificProfile: React.FC<ModeSpecificProfileProps> = ({
  mode,
  dateProfile,
  friendsProfile,
  networkProfile,
  onEdit,
  editable = false,
}) => {
  const renderDateModeProfile = () => {
    if (!dateProfile) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="heart" size={24} color="#FF6B6B" />
            <Text style={styles.headerTitle}>Dating Profile</Text>
          </View>
          {editable && onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Icon name="pencil" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          {dateProfile.relationship_type && (
            <ProfileItem
              icon="heart-outline"
              label="Looking for"
              value={formatRelationshipType(dateProfile.relationship_type)}
            />
          )}

          {dateProfile.zodiac_sign && (
            <ProfileItem icon="zodiac-sagittarius" label="Zodiac" value={dateProfile.zodiac_sign} />
          )}

          {dateProfile.religion && (
            <ProfileItem icon="church" label="Religion" value={dateProfile.religion} />
          )}

          {dateProfile.politics && (
            <ProfileItem icon="flag" label="Politics" value={dateProfile.politics} />
          )}

          {dateProfile.has_children !== undefined && (
            <ProfileItem
              icon="baby-carriage"
              label="Has children"
              value={dateProfile.has_children ? 'Yes' : 'No'}
            />
          )}

          {dateProfile.wants_children !== undefined && (
            <ProfileItem
              icon="human-male-child"
              label="Wants children"
              value={dateProfile.wants_children ? 'Yes' : 'No'}
            />
          )}
        </View>
      </View>
    );
  };

  const renderFriendsModeProfile = () => {
    if (!friendsProfile) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="account-group" size={24} color="#4ECDC4" />
            <Text style={styles.headerTitle}>Friends Profile</Text>
          </View>
          {editable && onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Icon name="pencil" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          {friendsProfile.friend_looking_for && friendsProfile.friend_looking_for.length > 0 && (
            <View style={styles.itemContainer}>
              <Icon name="search-web" size={20} color="#4ECDC4" style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Looking for</Text>
                <View style={styles.tagsContainer}>
                  {friendsProfile.friend_looking_for.map((item, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#4ECDC4' }]}>
                      <Text style={styles.tagText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {friendsProfile.friend_activities && friendsProfile.friend_activities.length > 0 && (
            <View style={styles.itemContainer}>
              <Icon name="run" size={20} color="#4ECDC4" style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Activities</Text>
                <View style={styles.tagsContainer}>
                  {friendsProfile.friend_activities.map((activity, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#4ECDC4' }]}>
                      <Text style={styles.tagText}>{activity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {friendsProfile.friend_availability && (
            <ProfileItem
              icon="calendar-clock"
              label="Availability"
              value={friendsProfile.friend_availability}
              color="#4ECDC4"
            />
          )}

          {friendsProfile.friend_group_size_preference && (
            <ProfileItem
              icon="account-multiple"
              label="Group preference"
              value={formatGroupSize(friendsProfile.friend_group_size_preference)}
              color="#4ECDC4"
            />
          )}
        </View>
      </View>
    );
  };

  const renderNetworkModeProfile = () => {
    if (!networkProfile) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="briefcase" size={24} color="#95E1D3" />
            <Text style={styles.headerTitle}>Professional Profile</Text>
          </View>
          {editable && onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Icon name="pencil" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          {networkProfile.network_job_title && (
            <ProfileItem
              icon="badge-account"
              label="Job Title"
              value={networkProfile.network_job_title}
              color="#95E1D3"
            />
          )}

          {networkProfile.network_company && (
            <ProfileItem
              icon="office-building"
              label="Company"
              value={networkProfile.network_company}
              color="#95E1D3"
            />
          )}

          {networkProfile.network_industry && (
            <ProfileItem
              icon="factory"
              label="Industry"
              value={networkProfile.network_industry}
              color="#95E1D3"
            />
          )}

          {networkProfile.network_profession && (
            <ProfileItem
              icon="briefcase-variant"
              label="Profession"
              value={networkProfile.network_profession}
              color="#95E1D3"
            />
          )}

          {networkProfile.network_years_experience !== undefined && (
            <ProfileItem
              icon="clock-outline"
              label="Experience"
              value={`${networkProfile.network_years_experience} years`}
              color="#95E1D3"
            />
          )}

          {networkProfile.network_skills && networkProfile.network_skills.length > 0 && (
            <View style={styles.itemContainer}>
              <Icon name="brain" size={20} color="#95E1D3" style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Skills</Text>
                <View style={styles.tagsContainer}>
                  {networkProfile.network_skills.map((skill, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#95E1D3' }]}>
                      <Text style={styles.tagText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {networkProfile.network_looking_for && networkProfile.network_looking_for.length > 0 && (
            <View style={styles.itemContainer}>
              <Icon name="target" size={20} color="#95E1D3" style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Looking for</Text>
                <View style={styles.tagsContainer}>
                  {networkProfile.network_looking_for.map((item, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#95E1D3' }]}>
                      <Text style={styles.tagText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {networkProfile.network_career_goals && (
            <View style={styles.itemContainer}>
              <Icon name="trophy-outline" size={20} color="#95E1D3" style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>Career Goals</Text>
                <Text style={styles.itemValue}>{networkProfile.network_career_goals}</Text>
              </View>
            </View>
          )}

          {networkProfile.network_open_to_opportunities && (
            <View style={[styles.badge, { backgroundColor: '#95E1D3' }]}>
              <Icon name="briefcase-check" size={16} color="#FFFFFF" />
              <Text style={styles.badgeText}>Open to opportunities</Text>
            </View>
          )}

          {(networkProfile.network_linkedin_url || networkProfile.network_portfolio_url) && (
            <View style={styles.linksContainer}>
              {networkProfile.network_linkedin_url && (
                <TouchableOpacity style={styles.linkButton}>
                  <Icon name="linkedin" size={20} color="#0077B5" />
                  <Text style={styles.linkText}>LinkedIn</Text>
                </TouchableOpacity>
              )}
              {networkProfile.network_portfolio_url && (
                <TouchableOpacity style={styles.linkButton}>
                  <Icon name="web" size={20} color="#95E1D3" />
                  <Text style={styles.linkText}>Portfolio</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  switch (mode) {
    case 'date':
      return renderDateModeProfile();
    case 'friends':
      return renderFriendsModeProfile();
    case 'network':
      return renderNetworkModeProfile();
    default:
      return null;
  }
};

interface ProfileItemProps {
  icon: string;
  label: string;
  value: string;
  color?: string;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, label, value, color = '#666' }) => (
  <View style={styles.itemContainer}>
    <Icon name={icon} size={20} color={color} style={styles.itemIcon} />
    <View style={styles.itemContent}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value}</Text>
    </View>
  </View>
);

const formatRelationshipType = (type: string): string => {
  const types: Record<string, string> = {
    casual: 'Casual dating',
    serious: 'Serious relationship',
    friendship: 'Friendship',
    unsure: 'Not sure yet',
  };
  return types[type] || type;
};

const formatGroupSize = (size: GroupSizePreference): string => {
  const sizes: Record<GroupSizePreference, string> = {
    'one-on-one': 'One-on-one',
    'small-group': 'Small groups (3-5)',
    'large-group': 'Large groups (6+)',
    any: 'Any group size',
  };
  return sizes[size] || size;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    gap: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 14,
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  linksContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  linkText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
