import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

export const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Always render static content immediately - no blocking API calls
  return (
    <Container>
      <Navigation />
      <BackLink to="/">← Back to Flamoral</BackLink>
      <Content>
        <StaticPrivacyPolicy />
      </Content>
    </Container>
  );
};

// Static fallback component in case API fails
const StaticPrivacyPolicy: React.FC = () => {
  return (
    <>
      <Header>
        <Title>Privacy Policy</Title>
        <LastUpdated>Last Updated: November 20, 2025</LastUpdated>
      </Header>

      <Section>
        <Paragraph>
          At Flamoral, we take your privacy seriously. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our dating platform and mobile
          application. Please read this policy carefully. If you do not agree with the terms of this
          Privacy Policy, please do not access the Service.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>1. Information We Collect</SectionTitle>

        <SubsectionTitle>1.1 Information You Provide to Us</SubsectionTitle>
        <Paragraph>
          We collect information that you voluntarily provide to us when you register on the
          Service, express an interest in obtaining information about us or our products and
          services, or otherwise contact us.
        </Paragraph>
        <List>
          <ListItem>
            <Strong>Account Information:</Strong> Name, email address, date of birth, gender,
            location, phone number
          </ListItem>
          <ListItem>
            <Strong>Profile Information:</Strong> Photos, bio, interests, preferences, prompts and
            answers
          </ListItem>
          <ListItem>
            <Strong>Payment Information:</Strong> Credit card details, billing address (processed
            securely by Stripe)
          </ListItem>
          <ListItem>
            <Strong>Communications:</Strong> Messages sent through the Service, customer support
            interactions
          </ListItem>
          <ListItem>
            <Strong>User Content:</Strong> Photos, videos, and other content you upload or create
          </ListItem>
        </List>

        <SubsectionTitle>1.2 Information Automatically Collected</SubsectionTitle>
        <Paragraph>
          When you access the Service, we automatically collect certain information about your
          device and usage:
        </Paragraph>
        <List>
          <ListItem>
            <Strong>Device Information:</Strong> IP address, browser type, operating system, device
            identifiers
          </ListItem>
          <ListItem>
            <Strong>Usage Data:</Strong> Pages visited, features used, time spent on the Service,
            swipes, matches, messages
          </ListItem>
          <ListItem>
            <Strong>Location Data:</Strong> Approximate location based on IP address or precise
            location (if you grant permission)
          </ListItem>
          <ListItem>
            <Strong>Cookies and Tracking Technologies:</Strong> Cookies, web beacons, pixel tags,
            and similar technologies
          </ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>2. How We Use Your Information</SectionTitle>
        <Paragraph>We use the information we collect for the following purposes:</Paragraph>
        <List>
          <ListItem>
            <Strong>Provide the Service:</Strong> Create and manage your account, facilitate matches
            and connections, process payments
          </ListItem>
          <ListItem>
            <Strong>Personalization:</Strong> Show you potential matches based on your preferences,
            location, and behavior
          </ListItem>
          <ListItem>
            <Strong>Communication:</Strong> Send you notifications, updates, customer support
            responses, and marketing communications (with your consent)
          </ListItem>
          <ListItem>
            <Strong>Safety and Security:</Strong> Detect and prevent fraud, spam, abuse, and other
            harmful activity; enforce our Terms of Service
          </ListItem>
          <ListItem>
            <Strong>Analytics and Improvement:</Strong> Understand how users interact with the
            Service, improve features, develop new products
          </ListItem>
          <ListItem>
            <Strong>Legal Compliance:</Strong> Comply with applicable laws, regulations, and legal
            processes
          </ListItem>
        </List>
      </Section>


      <Section>
        <SectionTitle>3. How We Share Your Information</SectionTitle>
        <Paragraph>We may share your information in the following circumstances:</Paragraph>
        <List>
          <ListItem><Strong>Service Providers:</Strong> Third-party vendors who help us operate the Service (hosting, analytics, payment processing, customer support)</ListItem>
          <ListItem><Strong>Safety and Legal:</Strong> When required by law, court order, or to protect the safety of our users</ListItem>
          <ListItem><Strong>Business Transfers:</Strong> In connection with a merger, acquisition, or sale of assets</ListItem>
          <ListItem><Strong>With Your Consent:</Strong> When you explicitly agree to share your data with third parties</ListItem>
        </List>
        <Paragraph>We do not sell your personal information to third parties.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>4. Your Rights Under GDPR (EU/EEA Users)</SectionTitle>
        <Paragraph>If you are in the EU/EEA, you have the following rights under the General Data Protection Regulation:</Paragraph>
        <List>
          <ListItem><Strong>Right of Access (Art. 15):</Strong> Request a copy of your personal data</ListItem>
          <ListItem><Strong>Right to Rectification (Art. 16):</Strong> Correct inaccurate or incomplete data</ListItem>
          <ListItem><Strong>Right to Erasure (Art. 17):</Strong> Request deletion of your personal data</ListItem>
          <ListItem><Strong>Right to Restrict Processing (Art. 18):</Strong> Limit how we use your data</ListItem>
          <ListItem><Strong>Right to Data Portability (Art. 20):</Strong> Receive your data in a portable format</ListItem>
          <ListItem><Strong>Right to Object (Art. 21):</Strong> Object to processing for marketing or profiling</ListItem>
          <ListItem><Strong>Right to Withdraw Consent:</Strong> Withdraw consent at any time without affecting prior processing</ListItem>
        </List>
        <Paragraph>To exercise these rights, visit Settings &gt; Privacy or contact our DPO at dpo@flamoral.com. We will respond within 30 days.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>5. Your Rights Under CCPA/CPRA (California Residents)</SectionTitle>
        <Paragraph>California residents have additional rights under the California Consumer Privacy Act and California Privacy Rights Act:</Paragraph>
        <List>
          <ListItem><Strong>Right to Know:</Strong> Request disclosure of personal information collected, used, and shared</ListItem>
          <ListItem><Strong>Right to Delete:</Strong> Request deletion of your personal information</ListItem>
          <ListItem><Strong>Right to Opt-Out:</Strong> Opt out of the sale or sharing of personal information</ListItem>
          <ListItem><Strong>Right to Correct:</Strong> Request correction of inaccurate personal information</ListItem>
          <ListItem><Strong>Right to Limit:</Strong> Limit the use and disclosure of sensitive personal information</ListItem>
          <ListItem><Strong>Non-Discrimination:</Strong> We will not discriminate against you for exercising your rights</ListItem>
        </List>
        <Paragraph>We honor Global Privacy Control (GPC) signals. To exercise your rights, visit our Do Not Sell page or contact privacy@flamoral.com.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>6. LGPD Rights (Brazil)</SectionTitle>
        <Paragraph>If you are a resident of Brazil, the Lei Geral de Protecao de Dados (LGPD) provides you with rights to access, correct, delete, and port your data, as well as to object to processing and request anonymization. Contact our DPO to exercise these rights.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. Data Retention</SectionTitle>
        <Paragraph>We retain your personal data only as long as necessary to provide the Service and fulfill the purposes described in this policy:</Paragraph>
        <List>
          <ListItem><Strong>Active Accounts:</Strong> Data is retained while your account is active</ListItem>
          <ListItem><Strong>Deleted Accounts:</Strong> Most data is deleted within 30 days after account deletion, with a 14-day grace period for cancellation</ListItem>
          <ListItem><Strong>Messages:</Strong> Deleted messages are purged after 90 days</ListItem>
          <ListItem><Strong>Legal Requirements:</Strong> Some data may be retained longer to comply with legal obligations, resolve disputes, or enforce agreements</ListItem>
          <ListItem><Strong>Analytics:</Strong> Aggregated, anonymized data may be retained indefinitely for analytical purposes</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>8. International Data Transfers</SectionTitle>
        <Paragraph>Your data may be transferred to and processed in countries other than your own. We use appropriate safeguards including Standard Contractual Clauses (SCCs) approved by the European Commission, and we ensure adequate protection for international transfers as required by GDPR, LGPD, and other applicable laws.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>9. Security Measures</SectionTitle>
        <Paragraph>We implement industry-standard security measures to protect your data, including:</Paragraph>
        <List>
          <ListItem>Encryption in transit (TLS 1.2+) and at rest (AES-256)</ListItem>
          <ListItem>Regular security audits and penetration testing</ListItem>
          <ListItem>Access controls and least-privilege principles</ListItem>
          <ListItem>Secure development practices and code reviews</ListItem>
          <ListItem>Incident response and data breach notification procedures (within 72 hours per GDPR Article 33)</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>10. Cookies and Tracking Technologies</SectionTitle>
        <Paragraph>We use cookies and similar technologies categorized as: essential (required), functional (preferences), analytics (usage understanding), and marketing (advertising). You can manage your cookie preferences through our Cookie Consent Banner or visit our Cookie Policy for details. We honor Do Not Track and Global Privacy Control (GPC) signals.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>11. Children and Minors</SectionTitle>
        <Paragraph>Flamoral is not intended for anyone under the age of 18. We do not knowingly collect personal information from minors. If we learn that we have collected data from a minor, we will promptly delete it. If you believe a minor has provided us with personal information, please contact us at privacy@flamoral.com.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>12. Changes to This Policy</SectionTitle>
        <Paragraph>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the Service. Your continued use of the Service after changes take effect constitutes acceptance of the revised policy.</Paragraph>
      </Section>

      <Section>
        <SectionTitle>Contact Us</SectionTitle>
        <Paragraph>
          If you have questions or concerns about this Privacy Policy or our data practices, please
          contact us at:
        </Paragraph>
        <ContactInfo>
          <div>
            <Strong>Flamoral, Inc.</Strong>
          </div>
          <div>Email: privacy@flamoral.com</div>
          <div>Address: 548 Market St, Suite 95879, San Francisco, CA 94104</div>
          <div>Data Protection Officer: dpo@flamoral.com</div>
        </ContactInfo>
      </Section>
    </>
  );
};

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  padding: 2rem 1rem;
`;

const BackLink = styled(Link)`
  display: inline-block;
  max-width: 900px;
  margin: 0 auto 1rem;
  padding: 0 1rem;
  color: #ec4899;
  text-decoration: none;
  font-size: 0.9rem;

  &:hover {
    color: #f472b6;
    text-decoration: underline;
  }

  @media (min-width: 900px) {
    display: block;
    padding: 0;
  }
`;

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  background: rgba(26, 26, 26, 0.9);
  backdrop-filter: blur(20px);
  padding: 3rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const Header = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const LastUpdated = styled.div`
  font-size: 0.9rem;
  color: #9ca3af;
  margin-top: 0.5rem;
`;

const Version = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.25rem;
`;

const Section = styled.section`
  margin-bottom: 2.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #f3f4f6;
  margin: 0 0 1rem 0;
`;

const SubsectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #d1d5db;
  margin: 1.5rem 0 0.75rem 0;
`;

const Paragraph = styled.p`
  font-size: 1rem;
  line-height: 1.8;
  color: #d1d5db;
  margin: 0 0 1rem 0;
`;

const List = styled.ul`
  margin: 0.5rem 0 1rem 1.5rem;
  padding: 0;
`;

const ListItem = styled.li`
  font-size: 1rem;
  line-height: 1.8;
  color: #d1d5db;
  margin-bottom: 0.5rem;
`;

const Strong = styled.strong`
  font-weight: 600;
  color: #f9fafb;
`;

const ContactInfo = styled.div`
  background: rgba(59, 130, 246, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
  margin-top: 1rem;

  div {
    margin-bottom: 0.5rem;
    color: #d1d5db;
    font-size: 1rem;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export default PrivacyPolicy;
