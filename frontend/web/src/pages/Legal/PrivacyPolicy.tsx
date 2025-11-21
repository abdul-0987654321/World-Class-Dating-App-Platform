import React, { useEffect } from 'react';
import styled from 'styled-components';

export const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Container>
      <Content>
        <Header>
          <Title>Privacy Policy</Title>
          <LastUpdated>Last Updated: November 20, 2025</LastUpdated>
        </Header>

        <Section>
          <Paragraph>
            At ConnectSphere, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dating platform and mobile application. Please read this policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>1. Information We Collect</SectionTitle>

          <SubsectionTitle>1.1 Information You Provide to Us</SubsectionTitle>
          <Paragraph>
            We collect information that you voluntarily provide to us when you register on the Service, express an interest in obtaining information about us or our products and services, or otherwise contact us.
          </Paragraph>
          <List>
            <ListItem><Strong>Account Information:</Strong> Name, email address, date of birth, gender, location, phone number</ListItem>
            <ListItem><Strong>Profile Information:</Strong> Photos, bio, interests, preferences, prompts and answers</ListItem>
            <ListItem><Strong>Payment Information:</Strong> Credit card details, billing address (processed securely by Stripe)</ListItem>
            <ListItem><Strong>Communications:</Strong> Messages sent through the Service, customer support interactions</ListItem>
            <ListItem><Strong>User Content:</Strong> Photos, videos, and other content you upload or create</ListItem>
          </List>

          <SubsectionTitle>1.2 Information Automatically Collected</SubsectionTitle>
          <Paragraph>
            When you access the Service, we automatically collect certain information about your device and usage:
          </Paragraph>
          <List>
            <ListItem><Strong>Device Information:</Strong> IP address, browser type, operating system, device identifiers</ListItem>
            <ListItem><Strong>Usage Data:</Strong> Pages visited, features used, time spent on the Service, swipes, matches, messages</ListItem>
            <ListItem><Strong>Location Data:</Strong> Approximate location based on IP address or precise location (if you grant permission)</ListItem>
            <ListItem><Strong>Cookies and Tracking Technologies:</Strong> Cookies, web beacons, pixel tags, and similar technologies</ListItem>
          </List>

          <SubsectionTitle>1.3 Information from Third Parties</SubsectionTitle>
          <List>
            <ListItem><Strong>Social Media:</Strong> If you connect your account to social media (Facebook, Instagram, Spotify), we may receive information from those platforms</ListItem>
            <ListItem><Strong>Payment Processors:</Strong> Transaction information from Stripe (without storing your full credit card details)</ListItem>
            <ListItem><Strong>Analytics Providers:</Strong> Aggregated usage data from Google Analytics, TikTok Pixel, Snapchat Pixel</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>2. How We Use Your Information</SectionTitle>
          <Paragraph>
            We use the information we collect for the following purposes:
          </Paragraph>
          <List>
            <ListItem><Strong>Provide the Service:</Strong> Create and manage your account, facilitate matches and connections, process payments</ListItem>
            <ListItem><Strong>Personalization:</Strong> Show you potential matches based on your preferences, location, and behavior</ListItem>
            <ListItem><Strong>Communication:</Strong> Send you notifications, updates, customer support responses, and marketing communications (with your consent)</ListItem>
            <ListItem><Strong>Safety and Security:</Strong> Detect and prevent fraud, spam, abuse, and other harmful activity; enforce our Terms of Service</ListItem>
            <ListItem><Strong>Analytics and Improvement:</Strong> Understand how users interact with the Service, improve features, develop new products</ListItem>
            <ListItem><Strong>Legal Compliance:</Strong> Comply with applicable laws, regulations, and legal processes</ListItem>
            <ListItem><Strong>Marketing:</Strong> Deliver targeted advertisements and promotional content (with your consent)</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>3. How We Share Your Information</SectionTitle>
          <Paragraph>
            We may share your information in the following situations:
          </Paragraph>

          <SubsectionTitle>3.1 With Other Users</SubsectionTitle>
          <Paragraph>
            Your profile information (photos, bio, age, location) is visible to other users of the Service. When you match with someone, they can see your profile and send you messages.
          </Paragraph>

          <SubsectionTitle>3.2 With Service Providers</SubsectionTitle>
          <List>
            <ListItem><Strong>Payment Processing:</Strong> Stripe (for payment processing)</ListItem>
            <ListItem><Strong>Cloud Storage:</Strong> Microsoft Azure (for storing photos and data)</ListItem>
            <ListItem><Strong>Email Services:</Strong> SendGrid (for transactional emails)</ListItem>
            <ListItem><Strong>SMS Services:</Strong> Twilio (for phone verification)</ListItem>
            <ListItem><Strong>Analytics:</Strong> Google Analytics, TikTok, Snapchat (for usage analytics)</ListItem>
            <ListItem><Strong>Content Moderation:</Strong> Azure Cognitive Services (for NSFW detection)</ListItem>
          </List>

          <SubsectionTitle>3.3 For Legal Reasons</SubsectionTitle>
          <Paragraph>
            We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas, law enforcement). We may also disclose information to:
          </Paragraph>
          <List>
            <ListItem>Prevent fraud or illegal activity</ListItem>
            <ListItem>Protect our rights, property, or safety</ListItem>
            <ListItem>Enforce our Terms of Service</ListItem>
            <ListItem>Respond to emergencies involving danger of death or serious physical injury</ListItem>
          </List>

          <SubsectionTitle>3.4 Business Transfers</SubsectionTitle>
          <Paragraph>
            If ConnectSphere is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will provide notice before your information is transferred and becomes subject to a different Privacy Policy.
          </Paragraph>

          <SubsectionTitle>3.5 With Your Consent</SubsectionTitle>
          <Paragraph>
            We may share your information with third parties when you give us explicit consent to do so.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>4. Your Privacy Rights</SectionTitle>
          <Paragraph>
            Depending on your location, you may have certain rights regarding your personal information:
          </Paragraph>

          <SubsectionTitle>4.1 Access and Portability</SubsectionTitle>
          <Paragraph>
            You have the right to request a copy of the personal information we hold about you. You can download your data through your account settings.
          </Paragraph>

          <SubsectionTitle>4.2 Correction</SubsectionTitle>
          <Paragraph>
            You can update or correct your profile information at any time through your account settings.
          </Paragraph>

          <SubsectionTitle>4.3 Deletion</SubsectionTitle>
          <Paragraph>
            You have the right to request deletion of your personal information. You can delete your account at any time, and we will permanently delete your data within 30 days (except where we are required to retain it by law).
          </Paragraph>

          <SubsectionTitle>4.4 Opt-Out of Marketing</SubsectionTitle>
          <Paragraph>
            You can opt-out of receiving marketing communications by clicking "unsubscribe" in any marketing email or by adjusting your notification preferences in account settings.
          </Paragraph>

          <SubsectionTitle>4.5 Do Not Sell My Personal Information (California Residents)</SubsectionTitle>
          <Paragraph>
            We do not sell your personal information to third parties. California residents have the right to request information about the categories of personal information we collect and how we use it.
          </Paragraph>

          <SubsectionTitle>4.6 GDPR Rights (EU Residents)</SubsectionTitle>
          <Paragraph>
            If you are located in the European Union, you have additional rights under the General Data Protection Regulation (GDPR):
          </Paragraph>
          <List>
            <ListItem>Right to object to processing</ListItem>
            <ListItem>Right to restrict processing</ListItem>
            <ListItem>Right to data portability</ListItem>
            <ListItem>Right to withdraw consent</ListItem>
            <ListItem>Right to lodge a complaint with a supervisory authority</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>5. Data Retention</SectionTitle>
          <Paragraph>
            We retain your personal information for as long as necessary to provide the Service and fulfill the purposes described in this Privacy Policy. This includes:
          </Paragraph>
          <List>
            <ListItem><Strong>Active Accounts:</Strong> We retain your information while your account is active</ListItem>
            <ListItem><Strong>Deleted Accounts:</Strong> After you delete your account, we permanently delete your data within 30 days, except for information we are required to retain by law (e.g., financial records for tax purposes)</ListItem>
            <ListItem><Strong>Backups:</Strong> Deleted data may remain in backup systems for up to 90 days</ListItem>
            <ListItem><Strong>Legal Requirements:</Strong> We may retain information longer if required by law or to protect our legal interests</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>6. Security</SectionTitle>
          <Paragraph>
            We use administrative, technical, and physical security measures to protect your personal information. These measures include:
          </Paragraph>
          <List>
            <ListItem>Encryption of data in transit (HTTPS/TLS) and at rest</ListItem>
            <ListItem>Secure authentication (JWT tokens, password hashing)</ListItem>
            <ListItem>Regular security audits and penetration testing</ListItem>
            <ListItem>Access controls and employee training</ListItem>
            <ListItem>Automated monitoring and threat detection</ListItem>
          </List>
          <Paragraph>
            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>7. International Data Transfers</SectionTitle>
          <Paragraph>
            Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. If you are located in the EU or other regions with data protection laws, please note that we may transfer your data to the United States and other countries.
          </Paragraph>
          <Paragraph>
            We ensure that such transfers are conducted in accordance with applicable data protection laws and implement appropriate safeguards, such as Standard Contractual Clauses approved by the European Commission.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>8. Children's Privacy</SectionTitle>
          <Paragraph>
            ConnectSphere is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information as soon as possible.
          </Paragraph>
          <Paragraph>
            If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at privacy@connectsphere.com.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>9. Cookies and Tracking Technologies</SectionTitle>

          <SubsectionTitle>9.1 Types of Cookies We Use</SubsectionTitle>
          <List>
            <ListItem><Strong>Essential Cookies:</Strong> Required for the Service to function (e.g., session cookies, authentication)</ListItem>
            <ListItem><Strong>Analytics Cookies:</Strong> Help us understand how users interact with the Service (Google Analytics)</ListItem>
            <ListItem><Strong>Advertising Cookies:</Strong> Used to deliver targeted ads (TikTok Pixel, Snapchat Pixel, Google Ads)</ListItem>
            <ListItem><Strong>Preference Cookies:</Strong> Remember your settings and preferences</ListItem>
          </List>

          <SubsectionTitle>9.2 Managing Cookies</SubsectionTitle>
          <Paragraph>
            You can control cookies through your browser settings. However, disabling cookies may affect your ability to use certain features of the Service.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>10. Third-Party Links and Services</SectionTitle>
          <Paragraph>
            The Service may contain links to third-party websites and services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party services you visit.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>11. Changes to This Privacy Policy</SectionTitle>
          <Paragraph>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We may also send you a notification via email or through the Service.
          </Paragraph>
          <Paragraph>
            Your continued use of the Service after any changes to this Privacy Policy will constitute your acceptance of such changes.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>12. Contact Us</SectionTitle>
          <Paragraph>
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </Paragraph>
          <ContactInfo>
            <div><Strong>ConnectSphere, Inc.</Strong></div>
            <div>Email: privacy@connectsphere.com</div>
            <div>Address: [Your Business Address]</div>
            <div>Data Protection Officer: dpo@connectsphere.com</div>
          </ContactInfo>
          <Paragraph style={{ marginTop: '1.5rem' }}>
            <Strong>For EU Residents:</Strong> You may also contact our EU representative at eu-representative@connectsphere.com.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>13. Your California Privacy Rights</SectionTitle>
          <Paragraph>
            California Civil Code Section 1798.83 permits California residents to request certain information regarding our disclosure of personal information to third parties for their direct marketing purposes. To make such a request, please contact us at privacy@connectsphere.com.
          </Paragraph>

          <SubsectionTitle>California Consumer Privacy Act (CCPA)</SubsectionTitle>
          <Paragraph>
            California residents have specific rights under the CCPA:
          </Paragraph>
          <List>
            <ListItem><Strong>Right to Know:</Strong> You can request information about the categories and specific pieces of personal information we have collected about you</ListItem>
            <ListItem><Strong>Right to Delete:</Strong> You can request deletion of your personal information</ListItem>
            <ListItem><Strong>Right to Opt-Out:</Strong> You can opt-out of the sale of your personal information (we do not sell your information)</ListItem>
            <ListItem><Strong>Right to Non-Discrimination:</Strong> You have the right not to receive discriminatory treatment for exercising your privacy rights</ListItem>
          </List>
          <Paragraph>
            To exercise these rights, please email us at privacy@connectsphere.com or use the data download/deletion features in your account settings.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>14. Nevada Residents</SectionTitle>
          <Paragraph>
            Nevada residents have the right to opt-out of the sale of certain personal information. We do not sell your personal information as defined under Nevada law. If you have questions, please contact us at privacy@connectsphere.com.
          </Paragraph>
        </Section>

        <Section>
          <Paragraph style={{ marginTop: '2rem', fontWeight: 500, fontSize: '1.1rem' }}>
            BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY.
          </Paragraph>
        </Section>
      </Content>
    </Container>
  );
};

// Styled Components (reused from TermsOfService for consistency)

const Container = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
  padding: 2rem 1rem;
`;

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  background: white;
  padding: 3rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const Header = styled.div`
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const LastUpdated = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const Section = styled.section`
  margin-bottom: 2.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 1rem 0;
`;

const SubsectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #34495e;
  margin: 1.5rem 0 0.75rem 0;
`;

const Paragraph = styled.p`
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
  margin: 0 0 1rem 0;
`;

const List = styled.ul`
  margin: 0.5rem 0 1rem 1.5rem;
  padding: 0;
`;

const ListItem = styled.li`
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
  margin-bottom: 0.5rem;
`;

const Strong = styled.strong`
  font-weight: 600;
  color: #2c3e50;
`;

const ContactInfo = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
  border-left: 4px solid #007bff;
  margin-top: 1rem;

  div {
    margin-bottom: 0.5rem;
    color: #333;
    font-size: 1rem;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export default PrivacyPolicy;
