import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

export const RefundPolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Container>
      <Navigation />
      <BackLink to="/">← Back to Flamoral</BackLink>
      <Content>
        <Header>
          <Title>Refund & Cancellation Policy</Title>
          <LastUpdated>Last Updated: January 2, 2026</LastUpdated>
        </Header>

        <Section>
          <Paragraph>
            This Refund and Cancellation Policy applies to all purchases made through the Flamoral
            platform, including subscriptions, virtual currency (Flamoral Coins), and in-app
            purchases. Please read this policy carefully before making any purchase.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>1. Subscriptions</SectionTitle>

          <SubsectionTitle>1.1 Subscription Plans</SubsectionTitle>
          <Paragraph>
            Flamoral offers the following subscription tiers: Basic, Plus, Premium, Premium+, and
            Elite. All subscriptions are billed in advance on a recurring basis (monthly or
            annually, depending on your selection).
          </Paragraph>

          <SubsectionTitle>1.2 Free Trial</SubsectionTitle>
          <Paragraph>
            If you signed up for a free trial, you will not be charged until the trial period ends.
            You may cancel at any time during the trial to avoid being charged. Once the trial
            period ends, your payment method will be automatically charged for the first
            subscription period.
          </Paragraph>

          <SubsectionTitle>1.3 Cancellation</SubsectionTitle>
          <Paragraph>You may cancel your subscription at any time through:</Paragraph>
          <List>
            <ListItem>The Flamoral app: Profile → Settings → Subscription → Cancel</ListItem>
            <ListItem>The Flamoral website: Account Settings → Subscription → Cancel</ListItem>
            <ListItem>Email: support@flamoral.com with subject "Cancel Subscription"</ListItem>
          </List>
          <Paragraph>
            When you cancel, your subscription will remain active until the end of your current
            billing period. You will not be charged for any subsequent periods, and you will
            continue to have access to premium features until your subscription expires.
          </Paragraph>

          <SubsectionTitle>1.4 Subscription Refunds</SubsectionTitle>
          <HighlightBox type="info">
            <Strong>Within 14 days of purchase:</Strong> You may request a full refund if you have
            not used any premium features. Partial refunds may be available if features were used
            minimally.
          </HighlightBox>
          <HighlightBox type="warning">
            <Strong>After 14 days:</Strong> Subscriptions are generally non-refundable. However, we
            may consider refunds on a case-by-case basis for exceptional circumstances.
          </HighlightBox>
          <Paragraph>
            To request a refund, contact our support team at billing@flamoral.com with your account
            email and reason for the refund request.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>2. Flamoral Coins & Virtual Currency</SectionTitle>
          <Paragraph>
            Flamoral Coins are virtual currency used to purchase in-app items such as Super Likes,
            Profile Boosts, and virtual gifts.
          </Paragraph>

          <SubsectionTitle>2.1 No Cash Value</SubsectionTitle>
          <Paragraph>
            Flamoral Coins have no real-world monetary value and cannot be exchanged for cash. They
            are licensed to you, not sold, and remain the property of Flamoral.
          </Paragraph>

          <SubsectionTitle>2.2 Non-Refundable</SubsectionTitle>
          <HighlightBox type="warning">
            <Strong>Virtual currency purchases are generally non-refundable.</Strong> Once coins are
            purchased, they cannot be refunded except as required by applicable law.
          </HighlightBox>

          <SubsectionTitle>2.3 Exceptions</SubsectionTitle>
          <Paragraph>Refunds for coin purchases may be considered if:</Paragraph>
          <List>
            <ListItem>You were charged due to a technical error</ListItem>
            <ListItem>
              Unauthorized purchases were made on your account (with documentation)
            </ListItem>
            <ListItem>The coins were not credited to your account</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>3. In-App Purchases</SectionTitle>
          <Paragraph>
            Individual feature purchases (Super Likes, Boosts, etc.) are non-refundable once used.
            If you purchased a feature but it failed to work due to a technical issue on our end,
            please contact support for assistance.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>4. App Store & Play Store Purchases</SectionTitle>
          <Paragraph>
            If you made your purchase through the Apple App Store or Google Play Store, refund
            requests must be submitted through the respective platform:
          </Paragraph>
          <List>
            <ListItem>
              <Strong>Apple App Store:</Strong> Request refunds at reportaproblem.apple.com
            </ListItem>
            <ListItem>
              <Strong>Google Play Store:</Strong> Request refunds through
              play.google.com/store/account
            </ListItem>
          </List>
          <Paragraph>
            Apple and Google have their own refund policies and timelines. Flamoral cannot process
            refunds for purchases made through these platforms.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>5. Account Termination</SectionTitle>
          <Paragraph>
            If your account is terminated by Flamoral due to a violation of our Terms of Service or
            Community Guidelines:
          </Paragraph>
          <List>
            <ListItem>No refund will be provided for any remaining subscription period</ListItem>
            <ListItem>All unused Flamoral Coins will be forfeited</ListItem>
            <ListItem>You will lose access to all purchased features immediately</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>6. Price Changes</SectionTitle>
          <Paragraph>
            Flamoral reserves the right to change subscription prices at any time. Price changes
            will not affect your current subscription period. You will be notified at least 30 days
            before any price increase takes effect for renewal periods.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>7. How to Request a Refund</SectionTitle>
          <Paragraph>To request a refund, please provide the following information:</Paragraph>
          <List>
            <ListItem>Your account email address</ListItem>
            <ListItem>Date of purchase</ListItem>
            <ListItem>Order/transaction ID (if available)</ListItem>
            <ListItem>Reason for refund request</ListItem>
          </List>
          <ContactInfo>
            <Strong>Contact our Billing Team:</Strong>
            <div>Email: billing@flamoral.com</div>
            <div>Subject: Refund Request - (include your account email)</div>
            <div>Response time: Within 3-5 business days</div>
          </ContactInfo>
        </Section>

        <Section>
          <SectionTitle>8. Regional Rights</SectionTitle>
          <Paragraph>
            If you are located in the European Union, United Kingdom, or other jurisdictions with
            consumer protection laws, you may have additional rights regarding refunds and
            cancellations. These rights are not affected by this policy.
          </Paragraph>
          <Paragraph>
            EU residents may exercise their right of withdrawal within 14 days of purchase. Note
            that this right may be waived if you begin using digital content or services during the
            withdrawal period.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>9. Changes to This Policy</SectionTitle>
          <Paragraph>
            We may update this Refund and Cancellation Policy from time to time. Changes will be
            posted on this page with an updated "Last Updated" date. Material changes will be
            communicated via email or in-app notification.
          </Paragraph>
        </Section>

        <Section>
          <ContactInfo>
            <Strong>Questions about billing?</Strong>
            <div>Email: billing@flamoral.com</div>
            <div>Phone: +1 (800) FLAMORAL</div>
          </ContactInfo>
        </Section>
      </Content>
    </Container>
  );
};

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

const HighlightBox = styled.div<{ type: 'info' | 'warning' }>`
  background: ${(props) =>
    props.type === 'info' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
  border: 1px solid
    ${(props) => (props.type === 'info' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)')};
  border-left: 4px solid ${(props) => (props.type === 'info' ? '#22C55E' : '#F59E0B')};
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  color: #d1d5db;
  font-size: 0.95rem;
  line-height: 1.7;
`;

const ContactInfo = styled.div`
  background: rgba(59, 130, 246, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
  margin-top: 1rem;

  div {
    margin-top: 0.5rem;
    color: #d1d5db;
    font-size: 1rem;
  }
`;

export default RefundPolicy;
