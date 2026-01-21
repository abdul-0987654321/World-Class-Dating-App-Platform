import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

export const SafetyGuidelines: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Container>
      <Navigation />
      <BackLink to="/">← Back to Flamoral</BackLink>
      <Content>
        <Header>
          <Title>Safety Guidelines</Title>
          <LastUpdated>Last Updated: January 2, 2026</LastUpdated>
          <TagLine>Your safety is our top priority</TagLine>
        </Header>

        <AlertBox>
          <AlertIcon>🚨</AlertIcon>
          <AlertContent>
            <Strong>In an emergency, contact local authorities immediately.</Strong>
            <div>If you feel unsafe, trust your instincts and leave the situation.</div>
          </AlertContent>
        </AlertBox>

        <Section>
          <SectionTitle>Before You Meet</SectionTitle>

          <SafetyCard>
            <CardIcon>💬</CardIcon>
            <CardContent>
              <CardTitle>Take Your Time</CardTitle>
              <CardDescription>
                Get to know someone through in-app messaging before sharing personal contact
                information. Watch for red flags like requests for money, inconsistent stories, or
                pressure to move off the app quickly.
              </CardDescription>
            </CardContent>
          </SafetyCard>

          <SafetyCard>
            <CardIcon>🔍</CardIcon>
            <CardContent>
              <CardTitle>Do Your Research</CardTitle>
              <CardDescription>
                Search for your match on social media and verify their identity. Video chat before
                meeting in person. Look for verification badges on profiles - they indicate extra
                steps were taken to confirm identity.
              </CardDescription>
            </CardContent>
          </SafetyCard>

          <SafetyCard>
            <CardIcon>📍</CardIcon>
            <CardContent>
              <CardTitle>Keep Personal Info Private</CardTitle>
              <CardDescription>
                Never share your home address, workplace, financial information, or other sensitive
                details until you've built trust. Use Flamoral messaging instead of sharing your
                phone number initially.
              </CardDescription>
            </CardContent>
          </SafetyCard>
        </Section>

        <Section>
          <SectionTitle>Meeting In Person</SectionTitle>

          <SafetyCard>
            <CardIcon>🏢</CardIcon>
            <CardContent>
              <CardTitle>Meet in Public</CardTitle>
              <CardDescription>
                Always choose a busy, public location for your first several dates. Coffee shops,
                restaurants, and public parks are great options. Avoid isolated areas, private
                residences, and hotels.
              </CardDescription>
            </CardContent>
          </SafetyCard>

          <SafetyCard>
            <CardIcon>👥</CardIcon>
            <CardContent>
              <CardTitle>Tell Someone</CardTitle>
              <CardDescription>
                Share your plans with a friend or family member. Tell them who you're meeting, where
                you'll be, and when to expect you back. Set up a check-in system and stick to it.
              </CardDescription>
            </CardContent>
          </SafetyCard>

          <SafetyCard>
            <CardIcon>🚗</CardIcon>
            <CardContent>
              <CardTitle>Arrange Your Own Transportation</CardTitle>
              <CardDescription>
                Drive yourself, use rideshare, or take public transit. Don't accept rides from your
                date until you know them well. Keep your phone charged and have backup
                transportation options.
              </CardDescription>
            </CardContent>
          </SafetyCard>

          <SafetyCard>
            <CardIcon>🍸</CardIcon>
            <CardContent>
              <CardTitle>Stay Sober and Alert</CardTitle>
              <CardDescription>
                Keep a clear head on first dates. Never leave your drink unattended. If you feel
                suddenly ill, dizzy, or disoriented, seek help immediately and contact authorities
                if needed.
              </CardDescription>
            </CardContent>
          </SafetyCard>
        </Section>

        <Section>
          <SectionTitle>Spotting Red Flags</SectionTitle>
          <Paragraph>Watch out for these warning signs:</Paragraph>

          <WarningList>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Requests for money or financial help</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Pressure to move off the app quickly</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Refuses to video chat or meet in public</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Inconsistent information or stories</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Excessive flattery or "love bombing"</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Controlling behavior or jealousy</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Disrespects your boundaries</span>
            </WarningItem>
            <WarningItem>
              <WarningIcon>⚠️</WarningIcon>
              <span>Claims of being military/working overseas</span>
            </WarningItem>
          </WarningList>
        </Section>

        <Section>
          <SectionTitle>Reporting & Blocking</SectionTitle>
          <Paragraph>
            If someone makes you uncomfortable, violates our community guidelines, or behaves
            inappropriately:
          </Paragraph>
          <List>
            <ListItem>
              <Strong>Block:</Strong> Use the block feature to prevent further contact
            </ListItem>
            <ListItem>
              <Strong>Report:</Strong> Report profiles to our Trust & Safety team for review
            </ListItem>
            <ListItem>
              <Strong>Unmatch:</Strong> Remove connections you no longer want
            </ListItem>
          </List>
          <Paragraph>
            Our moderation team reviews all reports and takes appropriate action, including
            permanent bans for serious violations. Your reports help keep our community safe.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>Sexual Health & Consent</SectionTitle>
          <Paragraph>If you choose to be intimate with someone you meet on Flamoral:</Paragraph>
          <List>
            <ListItem>Practice safe sex and use protection</ListItem>
            <ListItem>Get tested regularly for STIs</ListItem>
            <ListItem>Consent must be clear, enthusiastic, and ongoing</ListItem>
            <ListItem>Never pressure anyone or be pressured yourself</ListItem>
            <ListItem>Respect boundaries - "no" always means no</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>Resources</SectionTitle>
          <ResourceGrid>
            <ResourceCard>
              <ResourceTitle>RAINN</ResourceTitle>
              <ResourceDescription>Sexual assault support</ResourceDescription>
              <ResourceLink href="tel:1-800-656-4673">1-800-656-HOPE</ResourceLink>
            </ResourceCard>
            <ResourceCard>
              <ResourceTitle>National DV Hotline</ResourceTitle>
              <ResourceDescription>Domestic violence support</ResourceDescription>
              <ResourceLink href="tel:1-800-799-7233">1-800-799-SAFE</ResourceLink>
            </ResourceCard>
            <ResourceCard>
              <ResourceTitle>Crisis Text Line</ResourceTitle>
              <ResourceDescription>Text support for crisis</ResourceDescription>
              <ResourceLink href="sms:741741">Text HOME to 741741</ResourceLink>
            </ResourceCard>
            <ResourceCard>
              <ResourceTitle>FTC Report Fraud</ResourceTitle>
              <ResourceDescription>Report romance scams</ResourceDescription>
              <ResourceLink href="https://reportfraud.ftc.gov" target="_blank">
                reportfraud.ftc.gov
              </ResourceLink>
            </ResourceCard>
          </ResourceGrid>
        </Section>

        <Section>
          <ContactInfo>
            <Strong>Need to report something to Flamoral?</Strong>
            <div>Email: safety@flamoral.com</div>
            <div>In-app: Profile → Settings → Report a Problem</div>
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
  background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%);
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
`;

const TagLine = styled.div`
  font-size: 1.1rem;
  color: #22c55e;
  margin-top: 0.5rem;
  font-weight: 500;
`;

const AlertBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const AlertIcon = styled.span`
  font-size: 1.5rem;
`;

const AlertContent = styled.div`
  color: #fca5a5;
  font-size: 0.95rem;
  line-height: 1.6;

  div {
    margin-top: 0.25rem;
    color: #d1d5db;
  }
`;

const Section = styled.section`
  margin-bottom: 2.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #f3f4f6;
  margin: 0 0 1.25rem 0;
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

const SafetyCard = styled.div`
  display: flex;
  gap: 1rem;
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.25);
  }
`;

const CardIcon = styled.span`
  font-size: 1.75rem;
  flex-shrink: 0;
`;

const CardContent = styled.div`
  flex: 1;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #f3f4f6;
  margin: 0 0 0.5rem 0;
`;

const CardDescription = styled.p`
  font-size: 0.95rem;
  line-height: 1.7;
  color: #d1d5db;
  margin: 0;
`;

const WarningList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
`;

const WarningItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #fbbf24;
  font-size: 0.95rem;
`;

const WarningIcon = styled.span`
  font-size: 1rem;
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ResourceCard = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
`;

const ResourceTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #f3f4f6;
  margin: 0 0 0.25rem 0;
`;

const ResourceDescription = styled.p`
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0 0 0.75rem 0;
`;

const ResourceLink = styled.a`
  display: inline-block;
  color: #60a5fa;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;

  &:hover {
    color: #93c5fd;
    text-decoration: underline;
  }
`;

const ContactInfo = styled.div`
  background: rgba(59, 130, 246, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
  text-align: center;

  div {
    margin-top: 0.5rem;
    color: #d1d5db;
    font-size: 1rem;
  }
`;

export default SafetyGuidelines;
