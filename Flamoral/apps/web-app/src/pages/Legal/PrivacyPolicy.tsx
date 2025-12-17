import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { policyService, Policy } from '../../services';

export const PrivacyPolicy: React.FC = () => {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's region and language
      const region = policyService.getUserRegion();
      const language = policyService.getUserLanguage();

      // Fetch privacy policy from backend
      const policyData = await policyService.getPrivacyPolicy(region, language);
      setPolicy(policyData);
    } catch (err) {
      console.error('Failed to load privacy policy:', err);
      setError('Failed to load privacy policy. Please try again later.');
      // Fallback to static content if API fails
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container>
        <Content>
          <LoadingSpinner>Loading Privacy Policy...</LoadingSpinner>
        </Content>
      </Container>
    );
  }

  // Error state - show static fallback content
  if (error || !policy) {
    return (
      <Container>
        <Content>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <StaticPrivacyPolicy />
        </Content>
      </Container>
    );
  }

  // Render dynamic policy from backend
  return (
    <Container>
      <Content>
        <Header>
          <Title>Privacy Policy</Title>
          <LastUpdated>Last Updated: {new Date(policy.lastUpdated).toLocaleDateString()}</LastUpdated>
          <Version>Version {policy.version}</Version>
        </Header>

        {policy.summary && (
          <Section>
            <SummaryBox>
              <Paragraph>{policy.summary}</Paragraph>
            </SummaryBox>
          </Section>
        )}

        {policy.sections.map((section) => (
          <Section key={section.id}>
            <SectionTitle>{section.title}</SectionTitle>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{section.content}</Paragraph>

            {section.examples && section.examples.length > 0 && (
              <ExamplesBox>
                <ExamplesTitle>Examples:</ExamplesTitle>
                <List>
                  {section.examples.map((example, idx) => (
                    <ListItem key={idx}>{example}</ListItem>
                  ))}
                </List>
              </ExamplesBox>
            )}
          </Section>
        ))}

        {policy.userRights && policy.userRights.length > 0 && (
          <Section>
            <SectionTitle>Your Rights</SectionTitle>
            <List>
              {policy.userRights.map((right, idx) => (
                <ListItem key={idx}>{right}</ListItem>
              ))}
            </List>
          </Section>
        )}

        {policy.contactInfo && (
          <Section>
            <SectionTitle>Contact Us</SectionTitle>
            <ContactInfo>
              <div><Strong>Email:</Strong> {policy.contactInfo.email}</div>
              {policy.contactInfo.address && (
                <div><Strong>Address:</Strong> {policy.contactInfo.address}</div>
              )}
              {policy.contactInfo.dpo && (
                <div><Strong>Data Protection Officer:</Strong> {policy.contactInfo.dpo}</div>
              )}
            </ContactInfo>
          </Section>
        )}

        <Section>
          <Paragraph style={{ marginTop: '2rem', fontWeight: 500, fontSize: '1.1rem' }}>
            BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY.
          </Paragraph>
        </Section>
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
  margin-top: 0.5rem;
`;

const Version = styled.div`
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.25rem;
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

const SummaryBox = styled.div`
  background: #e3f2fd;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
`;

const ExamplesBox = styled.div`
  background: #f0f8f0;
  padding: 1.25rem;
  border-radius: 6px;
  margin-top: 1rem;
  border-left: 3px solid #4caf50;
`;

const ExamplesTitle = styled.div`
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #c62828;
`;
