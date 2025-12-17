import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { policyService, Policy } from '../../services';

export const TermsOfService: React.FC = () => {
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

      const region = policyService.getUserRegion();
      const language = policyService.getUserLanguage();

      const policyData = await policyService.getTermsOfService(region, language);
      setPolicy(policyData);
    } catch (err) {
      console.error('Failed to load terms of service:', err);
      setError('Failed to load terms of service. Showing fallback content.');
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Content>
          <LoadingSpinner>Loading Terms of Service...</LoadingSpinner>
        </Content>
      </Container>
    );
  }

  // If we have policy data from API, render it
  if (!error && policy) {
    return (
      <Container>
        <Content>
          <Header>
            <Title>Terms of Service</Title>
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

          {policy.contactInfo && (
            <Section>
              <SectionTitle>Contact Information</SectionTitle>
              <ContactInfo>
                <div>Flamoral, Inc.</div>
                <div>Email: {policy.contactInfo.email}</div>
                {policy.contactInfo.address && <div>Address: {policy.contactInfo.address}</div>}
              </ContactInfo>
            </Section>
          )}

          <Section>
            <Paragraph style={{ marginTop: '2rem', fontWeight: 500 }}>
              BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
            </Paragraph>
          </Section>
        </Content>
      </Container>
    );
  }

  // Fallback to static content
  return (
    <Container>
      <Content>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Header>
          <Title>Terms of Service</Title>
          <LastUpdated>Last Updated: November 20, 2025</LastUpdated>
        </Header>

        <Section>
          <SectionTitle>1. Acceptance of Terms</SectionTitle>
          <Paragraph>
            Welcome to Flamoral! By accessing or using our dating platform, mobile application, or any related services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
          </Paragraph>
          <Paragraph>
            These Terms constitute a legally binding agreement between you and Flamoral, Inc. ("Flamoral," "we," "us," or "our"). We reserve the right to update or modify these Terms at any time without prior notice. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>2. Eligibility</SectionTitle>
          <Paragraph>
            You must be at least 18 years old to create an account and use Flamoral. By creating an account, you represent and warrant that:
          </Paragraph>
          <List>
            <ListItem>You are at least 18 years of age</ListItem>
            <ListItem>You are legally permitted to use the Service in your jurisdiction</ListItem>
            <ListItem>You have not been previously banned or suspended from the Service</ListItem>
            <ListItem>You are not a convicted sex offender</ListItem>
            <ListItem>You will comply with these Terms and all applicable local, state, national, and international laws and regulations</ListItem>
          </List>
          <Paragraph>
            We reserve the right to request proof of age at any time. Failure to provide such proof may result in account suspension or termination.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>3. Account Registration and Security</SectionTitle>
          <SubsectionTitle>3.1 Account Creation</SubsectionTitle>
          <Paragraph>
            To use Flamoral, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update your information to keep it accurate and current.
          </Paragraph>

          <SubsectionTitle>3.2 Account Security</SubsectionTitle>
          <Paragraph>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
          </Paragraph>
          <List>
            <ListItem>Use a strong, unique password</ListItem>
            <ListItem>Not share your account credentials with anyone</ListItem>
            <ListItem>Notify us immediately of any unauthorized access to your account</ListItem>
            <ListItem>Log out of your account at the end of each session</ListItem>
          </List>
          <Paragraph>
            Flamoral will not be liable for any loss or damage arising from your failure to maintain account security.
          </Paragraph>

          <SubsectionTitle>3.3 One Account Per Person</SubsectionTitle>
          <Paragraph>
            You may maintain only one account at a time. Creating multiple accounts may result in termination of all accounts.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>4. User Conduct and Prohibited Activities</SectionTitle>
          <Paragraph>
            You agree to use the Service in a respectful and lawful manner. The following conduct is strictly prohibited:
          </Paragraph>

          <SubsectionTitle>4.1 Prohibited Content</SubsectionTitle>
          <List>
            <ListItem>Nudity, sexual content, or pornographic material</ListItem>
            <ListItem>Hate speech, threats, or harassment</ListItem>
            <ListItem>Violence, graphic content, or images promoting self-harm</ListItem>
            <ListItem>Illegal activities or promotion of illegal substances</ListItem>
            <ListItem>Spam, advertising, or promotional content</ListItem>
            <ListItem>Misleading, false, or deceptive information</ListItem>
            <ListItem>Content that violates any third-party intellectual property rights</ListItem>
          </List>

          <SubsectionTitle>4.2 Prohibited Behavior</SubsectionTitle>
          <List>
            <ListItem>Impersonating another person or misrepresenting your identity</ListItem>
            <ListItem>Stalking, harassing, or threatening other users</ListItem>
            <ListItem>Soliciting money or financial information from other users</ListItem>
            <ListItem>Using the Service for commercial purposes without authorization</ListItem>
            <ListItem>Attempting to access another user's account</ListItem>
            <ListItem>Interfering with or disrupting the Service</ListItem>
            <ListItem>Using automated tools (bots, scrapers, etc.) to access the Service</ListItem>
            <ListItem>Reverse engineering, decompiling, or disassembling any part of the Service</ListItem>
          </List>

          <Paragraph>
            Violation of these terms may result in immediate account suspension or termination, and we reserve the right to report illegal activity to law enforcement authorities.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>5. Content Ownership and License</SectionTitle>
          <SubsectionTitle>5.1 Your Content</SubsectionTitle>
          <Paragraph>
            You retain ownership of all content you post on Flamoral, including photos, text, and other materials ("User Content"). However, by posting User Content, you grant Flamoral a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content in connection with the Service.
          </Paragraph>

          <SubsectionTitle>5.2 Content Moderation</SubsectionTitle>
          <Paragraph>
            We reserve the right to review, monitor, and remove any User Content at our sole discretion. We use automated systems and human moderators to enforce our Community Guidelines. Content that violates our policies will be removed, and repeat offenders may be banned.
          </Paragraph>

          <SubsectionTitle>5.3 Our Content</SubsectionTitle>
          <Paragraph>
            The Service and all materials therein, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, and software, are the property of Flamoral or its licensors and are protected by copyright, trademark, and other intellectual property laws.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>6. Subscriptions and Payments</SectionTitle>
          <SubsectionTitle>6.1 Subscription Plans</SubsectionTitle>
          <Paragraph>
            Flamoral offers various subscription plans (Basic, Mid, Ultra) that provide access to premium features. Subscription fees are billed in advance on a recurring monthly basis.
          </Paragraph>

          <SubsectionTitle>6.2 Pricing and Payment</SubsectionTitle>
          <Paragraph>
            Subscription prices are subject to change with 30 days notice. By purchasing a subscription, you authorize us to charge your payment method on file for the subscription fee and any applicable taxes.
          </Paragraph>

          <SubsectionTitle>6.3 Auto-Renewal</SubsectionTitle>
          <Paragraph>
            Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date. You can cancel your subscription at any time through your account settings.
          </Paragraph>

          <SubsectionTitle>6.4 Cancellation and Refunds</SubsectionTitle>
          <Paragraph>
            You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. We do not provide refunds for partial subscription periods, except as required by law or at our sole discretion.
          </Paragraph>

          <SubsectionTitle>6.5 Virtual Currency (Coins)</SubsectionTitle>
          <Paragraph>
            Flamoral offers virtual currency ("Coins") that can be purchased and used within the Service. Coins have no monetary value outside the Service, cannot be exchanged for cash, and are non-refundable except as required by law.
          </Paragraph>

          <SubsectionTitle>6.6 Boosts and Power-Ups</SubsectionTitle>
          <Paragraph>
            Certain features, such as Profile Boosts, can be purchased for one-time use. These purchases are non-refundable and non-transferable.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>7. Privacy and Data Protection</SectionTitle>
          <Paragraph>
            Your privacy is important to us. Our collection and use of personal information is described in our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to our collection, use, and sharing of your information as described in the Privacy Policy.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>8. Safety and Verification</SectionTitle>
          <SubsectionTitle>8.1 Background Checks</SubsectionTitle>
          <Paragraph>
            Flamoral does not conduct criminal background checks on users. We are not responsible for the conduct of any user, whether on or off the Service.
          </Paragraph>

          <SubsectionTitle>8.2 Photo Verification</SubsectionTitle>
          <Paragraph>
            We may offer optional photo verification to help ensure users are who they claim to be. However, verification does not guarantee the authenticity or character of any user.
          </Paragraph>

          <SubsectionTitle>8.3 Safety Tips</SubsectionTitle>
          <List>
            <ListItem>Never send money to someone you haven't met in person</ListItem>
            <ListItem>Meet in public places for first dates</ListItem>
            <ListItem>Tell a friend or family member about your plans</ListItem>
            <ListItem>Trust your instincts - if something feels wrong, it probably is</ListItem>
            <ListItem>Report suspicious behavior immediately</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>9. Disclaimer of Warranties</SectionTitle>
          <Paragraph>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </Paragraph>
          <Paragraph>
            FLAMORAL DOES NOT WARRANT THAT:
          </Paragraph>
          <List>
            <ListItem>The Service will be uninterrupted, secure, or error-free</ListItem>
            <ListItem>Defects will be corrected</ListItem>
            <ListItem>The Service is free of viruses or harmful components</ListItem>
            <ListItem>The results obtained from using the Service will be accurate or reliable</ListItem>
            <ListItem>Any matches or connections you make will result in a relationship</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>10. Limitation of Liability</SectionTitle>
          <Paragraph>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLAMORAL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </Paragraph>
          <List>
            <ListItem>Your use or inability to use the Service</ListItem>
            <ListItem>Any unauthorized access to or use of our servers and/or any personal information stored therein</ListItem>
            <ListItem>Any interruption or cessation of transmission to or from the Service</ListItem>
            <ListItem>Any bugs, viruses, or malicious code transmitted through the Service</ListItem>
            <ListItem>Any errors or omissions in any content or loss or damage incurred as a result of your use of any content posted, emailed, transmitted, or otherwise made available through the Service</ListItem>
            <ListItem>The conduct or content of any user or third party on the Service</ListItem>
          </List>
          <Paragraph>
            IN NO EVENT SHALL FLAMORAL'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS RELATED TO THE SERVICE EXCEED THE AMOUNT YOU PAID TO FLAMORAL IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>11. Indemnification</SectionTitle>
          <Paragraph>
            You agree to indemnify, defend, and hold harmless Flamoral, its officers, directors, employees, agents, licensors, and suppliers from and against all losses, expenses, damages, and costs, including reasonable attorneys' fees, resulting from:
          </Paragraph>
          <List>
            <ListItem>Your violation of these Terms</ListItem>
            <ListItem>Your violation of any rights of another party</ListItem>
            <ListItem>Your User Content</ListItem>
            <ListItem>Your use of the Service</ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>12. Termination</SectionTitle>
          <SubsectionTitle>12.1 Termination by You</SubsectionTitle>
          <Paragraph>
            You may terminate your account at any time by going to your account settings and deleting your account.
          </Paragraph>

          <SubsectionTitle>12.2 Termination by Us</SubsectionTitle>
          <Paragraph>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including but not limited to:
          </Paragraph>
          <List>
            <ListItem>Violation of these Terms</ListItem>
            <ListItem>Fraudulent, illegal, or abusive behavior</ListItem>
            <ListItem>Failure to pay subscription fees</ListItem>
            <ListItem>Extended periods of inactivity</ListItem>
            <ListItem>At our sole discretion</ListItem>
          </List>

          <SubsectionTitle>12.3 Effect of Termination</SubsectionTitle>
          <Paragraph>
            Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>13. Dispute Resolution</SectionTitle>
          <SubsectionTitle>13.1 Governing Law</SubsectionTitle>
          <Paragraph>
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
          </Paragraph>

          <SubsectionTitle>13.2 Arbitration</SubsectionTitle>
          <Paragraph>
            Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by arbitration in Delaware, before one arbitrator.
          </Paragraph>
          <Paragraph>
            The arbitration shall be administered by the American Arbitration Association (AAA) in accordance with its Consumer Arbitration Rules. Judgment on the award may be entered in any court having jurisdiction.
          </Paragraph>

          <SubsectionTitle>13.3 Class Action Waiver</SubsectionTitle>
          <Paragraph>
            YOU AND FLAMORAL AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>14. Miscellaneous</SectionTitle>
          <SubsectionTitle>14.1 Entire Agreement</SubsectionTitle>
          <Paragraph>
            These Terms, together with the Privacy Policy and Community Guidelines, constitute the entire agreement between you and Flamoral regarding the Service.
          </Paragraph>

          <SubsectionTitle>14.2 Severability</SubsectionTitle>
          <Paragraph>
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
          </Paragraph>

          <SubsectionTitle>14.3 Waiver</SubsectionTitle>
          <Paragraph>
            No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term.
          </Paragraph>

          <SubsectionTitle>14.4 Assignment</SubsectionTitle>
          <Paragraph>
            You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent. We may assign these Terms without restriction.
          </Paragraph>

          <SubsectionTitle>14.5 Force Majeure</SubsectionTitle>
          <Paragraph>
            Flamoral shall not be liable for any delay or failure to perform resulting from causes outside its reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.
          </Paragraph>

          <SubsectionTitle>14.6 Export Controls</SubsectionTitle>
          <Paragraph>
            The Service may be subject to U.S. export control laws. You agree to comply with all applicable export and import laws and regulations.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>15. Contact Information</SectionTitle>
          <Paragraph>
            If you have any questions about these Terms, please contact us at:
          </Paragraph>
          <ContactInfo>
            <div>Flamoral, Inc.</div>
            <div>Email: legal@flamoral.com</div>
            <div>Address: [Your Business Address]</div>
            <div>Phone: [Your Phone Number]</div>
          </ContactInfo>
        </Section>

        <Section>
          <Paragraph style={{ marginTop: '2rem', fontWeight: 500 }}>
            BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
          </Paragraph>
        </Section>
      </Content>
    </Container>
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

const Version = styled.div`
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.25rem;
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
