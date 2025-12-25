import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Always render static content immediately - no blocking API calls
  return (
    <Container>
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
          At Flamoral, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dating platform and mobile application. Please read this policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
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
        </List>
      </Section>

      <Section>
        <SectionTitle>Contact Us</SectionTitle>
        <Paragraph>
          If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
        </Paragraph>
        <ContactInfo>
          <div><Strong>Flamoral, Inc.</Strong></div>
          <div>Email: privacy@flamoral.com</div>
          <div>Address: [Your Business Address]</div>
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
  background: linear-gradient(135deg, #EC4899 0%, #3B82F6 100%);
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
  border-left: 4px solid #3B82F6;
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
