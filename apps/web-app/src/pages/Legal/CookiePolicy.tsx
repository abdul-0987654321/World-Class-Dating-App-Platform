import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

export const CookiePolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Container>
      <Navigation />
      <BackLink to="/">← Back to Flamoral</BackLink>
      <Content>
        <Header>
          <Title>Cookie Policy</Title>
          <LastUpdated>Last Updated: January 2, 2026</LastUpdated>
        </Header>

        <Section>
          <Paragraph>
            This Cookie Policy explains how Flamoral, Inc. ("Flamoral," "we," "us," or "our") uses cookies and similar technologies when you visit our website or use our mobile application (the "Service"). This policy should be read in conjunction with our Privacy Policy.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>1. What Are Cookies?</SectionTitle>
          <Paragraph>
            Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and to provide information to the website owners.
          </Paragraph>
          <Paragraph>
            We also use similar technologies such as:
          </Paragraph>
          <List>
            <ListItem><Strong>Local Storage:</Strong> Stores data locally in your browser without an expiration date</ListItem>
            <ListItem><Strong>Session Storage:</Strong> Similar to local storage but data is cleared when the session ends</ListItem>
            <ListItem><Strong>Pixels/Web Beacons:</Strong> Small graphic images that track user behavior</ListItem>
            <ListItem><Strong>Device Fingerprinting:</Strong> Collecting device attributes to identify users</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>2. Types of Cookies We Use</SectionTitle>

          <SubsectionTitle>2.1 Essential Cookies</SubsectionTitle>
          <Paragraph>
            These cookies are strictly necessary for the Service to function. They enable core functionality such as security, authentication, and accessibility. You cannot opt out of these cookies.
          </Paragraph>
          <CookieTable>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>flamoral_session</td>
                <td>User session management</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>flamoral_csrf</td>
                <td>Security - prevent cross-site request forgery</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>flamoral_auth</td>
                <td>Authentication token</td>
                <td>30 days</td>
              </tr>
            </tbody>
          </CookieTable>

          <SubsectionTitle>2.2 Functional Cookies</SubsectionTitle>
          <Paragraph>
            These cookies remember your preferences and settings to enhance your experience.
          </Paragraph>
          <CookieTable>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>flamoral_theme</td>
                <td>Remember dark/light mode preference</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>flamoral_lang</td>
                <td>Language preference</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>flamoral_filters</td>
                <td>Discovery filter preferences</td>
                <td>90 days</td>
              </tr>
            </tbody>
          </CookieTable>

          <SubsectionTitle>2.3 Analytics Cookies</SubsectionTitle>
          <Paragraph>
            These cookies help us understand how visitors interact with the Service by collecting and reporting information anonymously.
          </Paragraph>
          <CookieTable>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>_ga, _gid</td>
                <td>Google Analytics - usage tracking</td>
                <td>2 years / 24 hours</td>
              </tr>
              <tr>
                <td>flamoral_analytics</td>
                <td>Internal analytics</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </CookieTable>

          <SubsectionTitle>2.4 Marketing Cookies</SubsectionTitle>
          <Paragraph>
            These cookies track your activity across websites to deliver targeted advertising.
          </Paragraph>
          <CookieTable>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>_fbp</td>
                <td>Facebook Pixel - ad tracking</td>
                <td>90 days</td>
              </tr>
              <tr>
                <td>_gcl_au</td>
                <td>Google Ads conversion tracking</td>
                <td>90 days</td>
              </tr>
            </tbody>
          </CookieTable>
        </Section>

        <Section>
          <SectionTitle>3. Managing Your Cookie Preferences</SectionTitle>
          <Paragraph>
            You have control over which cookies we use. Here's how you can manage your preferences:
          </Paragraph>

          <SubsectionTitle>3.1 Cookie Consent Banner</SubsectionTitle>
          <Paragraph>
            When you first visit our Service, you'll see a cookie consent banner allowing you to accept or customize which types of cookies you allow.
          </Paragraph>

          <SubsectionTitle>3.2 Browser Settings</SubsectionTitle>
          <Paragraph>
            Most web browsers allow you to control cookies through their settings. You can typically:
          </Paragraph>
          <List>
            <ListItem>View what cookies are stored on your device</ListItem>
            <ListItem>Delete cookies individually or all at once</ListItem>
            <ListItem>Block cookies from specific websites</ListItem>
            <ListItem>Block all third-party cookies</ListItem>
            <ListItem>Block all cookies (may affect functionality)</ListItem>
          </List>

          <SubsectionTitle>3.3 Opt-Out Links</SubsectionTitle>
          <Paragraph>
            You can opt out of specific third-party cookies:
          </Paragraph>
          <List>
            <ListItem>Google Analytics: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a></ListItem>
            <ListItem>Facebook: <a href="https://www.facebook.com/settings?tab=ads" target="_blank" rel="noopener noreferrer">Facebook Ad Settings</a></ListItem>
            <ListItem>Industry opt-out: <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance</a></ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>4. International Users</SectionTitle>
          <Paragraph>
            If you are located in the European Economic Area (EEA), United Kingdom, or other regions with privacy laws, we will only use non-essential cookies with your consent. You can withdraw your consent at any time.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>5. Updates to This Policy</SectionTitle>
          <Paragraph>
            We may update this Cookie Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>Contact Us</SectionTitle>
          <Paragraph>
            If you have questions about our use of cookies, please contact us:
          </Paragraph>
          <ContactInfo>
            <div><Strong>Flamoral, Inc.</Strong></div>
            <div>Email: privacy@flamoral.com</div>
            <div>Data Protection Officer: dpo@flamoral.com</div>
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

  a {
    color: #ec4899;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
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

  a {
    color: #ec4899;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Strong = styled.strong`
  font-weight: 600;
  color: #f9fafb;
`;

const CookieTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0 1.5rem;
  font-size: 0.9rem;

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  th {
    background: rgba(59, 130, 246, 0.1);
    color: #f3f4f6;
    font-weight: 600;
  }

  td {
    color: #d1d5db;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
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

export default CookiePolicy;
