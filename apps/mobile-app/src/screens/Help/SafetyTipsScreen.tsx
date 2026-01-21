import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

interface SafetyTip {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const safetyTips: SafetyTip[] = [
  {
    id: '1',
    icon: 'shield-checkmark',
    title: 'Protect Your Personal Information',
    description:
      'Never share sensitive information like your home address, financial details, or workplace in your profile or early conversations. Keep conversations on the platform until you feel comfortable.',
    color: '#34C759',
  },
  {
    id: '2',
    icon: 'camera',
    title: 'Look for Verified Profiles',
    description:
      'Verified profiles have a blue checkmark badge, indicating photo verification. While not mandatory, it adds an extra layer of authenticity to the profile.',
    color: '#007AFF',
  },
  {
    id: '3',
    icon: 'videocam',
    title: 'Use Video Chat Before Meeting',
    description:
      'Before meeting in person, have a video call to verify their identity and get a better sense of who they are. This helps ensure they match their profile photos.',
    color: '#FF6B6B',
  },
  {
    id: '4',
    icon: 'people',
    title: 'Meet in Public Places',
    description:
      'Always meet for the first time in a public place with lots of people around. Avoid secluded areas and never invite someone to your home on the first date.',
    color: '#FF9500',
  },
  {
    id: '5',
    icon: 'car',
    title: 'Arrange Your Own Transportation',
    description:
      "Drive yourself or use your own ride-sharing service to and from the date. Never accept rides from someone you just met, and don't share your exact address.",
    color: '#5856D6',
  },
  {
    id: '6',
    icon: 'person-add',
    title: 'Tell Friends and Family',
    description:
      "Let a trusted friend or family member know where you're going, who you're meeting, and when you expect to be back. Share your live location if possible.",
    color: '#AF52DE',
  },
  {
    id: '7',
    icon: 'medical',
    title: 'Stay Sober and Alert',
    description:
      "Keep your drinks in sight and don't accept drinks from strangers. Stay sober enough to make good decisions and trust your instincts if something feels off.",
    color: '#FF2D55',
  },
  {
    id: '8',
    icon: 'flag',
    title: 'Report Suspicious Behavior',
    description:
      'If someone makes you uncomfortable, asks for money, or behaves inappropriately, report and block them immediately. We take all reports seriously.',
    color: '#FF3B30',
  },
  {
    id: '9',
    icon: 'checkmark-circle',
    title: 'Trust Your Instincts',
    description:
      "If something feels wrong, it probably is. Don't hesitate to leave a situation that makes you uncomfortable. Your safety is always the top priority.",
    color: '#34C759',
  },
  {
    id: '10',
    icon: 'lock-closed',
    title: 'Protect Your Account',
    description:
      'Use a strong, unique password and enable two-factor authentication. Never share your login credentials with anyone, including people claiming to be support staff.',
    color: '#8E8E93',
  },
];

interface SafetyTipCardProps {
  tip: SafetyTip;
}

const SafetyTipCard: React.FC<SafetyTipCardProps> = ({ tip }) => {
  return (
    <View style={styles.tipCard}>
      <View style={[styles.iconContainer, { backgroundColor: tip.color + '20' }]}>
        <Icon name={tip.icon} size={32} color={tip.color} />
      </View>
      <Text style={styles.tipTitle}>{tip.title}</Text>
      <Text style={styles.tipDescription}>{tip.description}</Text>
    </View>
  );
};

const SafetyTipsScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleEmergency = () => {
    Linking.openURL('tel:911');
  };

  const handleReportConcern = () => {
    Linking.openURL('mailto:safety@flamoral.com');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Tips</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Icon name="shield-checkmark" size={60} color="#FF6B6B" />
          <Text style={styles.heroTitle}>Your Safety Matters</Text>
          <Text style={styles.heroSubtitle}>
            Dating should be fun and safe. Follow these tips to protect yourself and have a great
            experience.
          </Text>
        </View>

        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyContent}>
            <Icon name="warning" size={24} color="#FF3B30" />
            <View style={styles.emergencyText}>
              <Text style={styles.emergencyTitle}>In an Emergency?</Text>
              <Text style={styles.emergencySubtitle}>Call emergency services immediately</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergency}
            accessibilityRole="button"
            accessibilityLabel="Call emergency services"
          >
            <Text style={styles.emergencyButtonText}>Call 911</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Safety Guidelines</Text>
          {safetyTips.map((tip) => (
            <SafetyTipCard key={tip.id} tip={tip} />
          ))}
        </View>

        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>

          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://www.rainn.org/')}
            accessibilityRole="button"
            accessibilityLabel="Visit RAINN website"
          >
            <Icon name="link" size={24} color="#FF6B6B" />
            <View style={styles.resourceText}>
              <Text style={styles.resourceTitle}>RAINN</Text>
              <Text style={styles.resourceSubtitle}>National Sexual Assault Hotline</Text>
            </View>
            <Icon name="open-outline" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://www.thehotline.org/')}
            accessibilityRole="button"
            accessibilityLabel="Visit National Domestic Violence Hotline"
          >
            <Icon name="link" size={24} color="#FF6B6B" />
            <View style={styles.resourceText}>
              <Text style={styles.resourceTitle}>National Domestic Violence Hotline</Text>
              <Text style={styles.resourceSubtitle}>24/7 support and resources</Text>
            </View>
            <Icon name="open-outline" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://www.ncadv.org/')}
            accessibilityRole="button"
            accessibilityLabel="Visit NCADV website"
          >
            <Icon name="link" size={24} color="#FF6B6B" />
            <View style={styles.resourceText}>
              <Text style={styles.resourceTitle}>NCADV</Text>
              <Text style={styles.resourceSubtitle}>Coalition Against Domestic Violence</Text>
            </View>
            <Icon name="open-outline" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View style={styles.reportSection}>
          <Text style={styles.reportTitle}>See Something Concerning?</Text>
          <Text style={styles.reportSubtitle}>
            Report any suspicious behavior, harassment, or safety concerns to our trust and safety
            team.
          </Text>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportConcern}
            accessibilityRole="button"
            accessibilityLabel="Report a safety concern"
          >
            <Icon name="flag" size={20} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>Report a Concern</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.commitmentSection}>
          <Text style={styles.commitmentTitle}>Our Commitment to You</Text>
          <Text style={styles.commitmentText}>
            At Flamoral, your safety is our top priority. We use advanced AI to detect and prevent
            inappropriate behavior, verify user identities, and provide 24/7 support. We're
            committed to creating a safe, respectful community for everyone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  emergencyBanner: {
    backgroundColor: '#FFF3F3',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyText: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
  },
  emergencySubtitle: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 2,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  resourcesSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resourceText: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  resourceSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  reportSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  commitmentSection: {
    backgroundColor: '#F9F9F9',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 24,
    borderRadius: 12,
  },
  commitmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  commitmentText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

export default SafetyTipsScreen;
