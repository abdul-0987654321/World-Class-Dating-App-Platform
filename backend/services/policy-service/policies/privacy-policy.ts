/**
 * FLAMORAL Privacy Policy
 * Comprehensive GDPR, CCPA, and Global Privacy Compliance
 *
 * Version: 3.0.0
 * Last Updated: 2025-12-15
 * Effective Date: 2025-12-15
 */

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  examples?: string[];
  lastUpdated?: string;
}

export interface PrivacyPolicy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  sections: PolicySection[];
  userRights: string[];
  contactInfo: {
    email: string;
    address: string;
    dpo?: string;
  };
}

export const privacyPolicy: PrivacyPolicy = {
  version: '3.0.0',
  effectiveDate: '2025-12-15',
  lastUpdated: '2025-12-15',

  summary: `
    This Privacy Policy explains how FLAMORAL ("we," "us," or "our") collects, uses, shares, and protects your personal information when you use our dating platform and services. We are committed to protecting your privacy and ensuring you understand how your data is handled.

    Key Points:
    • We collect information you provide and data generated through your use of FLAMORAL
    • Your data is used to provide and improve our matching services
    • We never sell your personal information to third parties
    • You have full control over your data, including the right to download or delete it
    • We use industry-standard security measures to protect your information
    • You can manage your privacy settings at any time in your account
  `,

  sections: [
    {
      id: 'introduction',
      title: '1. Introduction',
      content: `
        FLAMORAL is a global dating platform committed to helping people form meaningful connections while protecting their privacy. This Privacy Policy applies to all users of our website, mobile applications, and related services (collectively, the "Services").

        By using FLAMORAL, you agree to the collection and use of information in accordance with this policy. If you do not agree with our practices, please do not use our Services.

        This policy is designed to be transparent and easy to understand. We have included practical examples throughout to illustrate how we handle your data in real-world scenarios.
      `,
    },
    {
      id: 'information-we-collect',
      title: '2. Information We Collect',
      content: `
        We collect several types of information to provide and improve our Services:

        **2.1 Information You Provide**

        • Account Information: Email address, phone number, password, date of birth, gender, and sexual orientation
        • Profile Information: Photos, biography, interests, relationship preferences, and answers to profile prompts
        • Verification Data: Selfie photos for identity verification, government ID (optional for enhanced verification)
        • Payment Information: Credit card details, billing address (processed by our payment providers)
        • Communications: Messages you send to other users, feedback you provide to us, and customer support inquiries

        **2.2 Information We Collect Automatically**

        • Device Information: Device type, operating system, unique device identifiers, browser type
        • Usage Data: Features used, time spent on the app, swipe patterns, search queries
        • Location Data: GPS location (if permitted), IP address-based location
        • Log Data: Access times, pages viewed, app crashes, and system activity

        **2.3 Information from Third Parties**

        • Social Media: If you connect a social account, we may receive your public profile information
        • Analytics Partners: Aggregated usage data and performance metrics
        • Verification Services: Identity verification results from our verification partners
      `,
      examples: [
        'When you sign up, we collect your email and date of birth to create your account and verify your age',
        'When you upload photos, we store them securely and use AI to verify they show a real person',
        'When you swipe on profiles, we learn your preferences to improve your recommendations',
        'When you grant location access, we show you potential matches nearby',
      ],
    },
    {
      id: 'how-we-use-information',
      title: '3. How We Use Your Information',
      content: `
        We use the information we collect to:

        **3.1 Provide Our Services**
        • Create and manage your account
        • Display your profile to potential matches
        • Enable communication between matched users
        • Process payments for premium features

        **3.2 Improve Matching**
        • Analyze compatibility factors to suggest relevant matches
        • Learn from your interactions to improve recommendations
        • Power our AI-based matching algorithm

        **3.3 Safety and Security**
        • Verify user identities and detect fake profiles
        • Prevent, detect, and investigate fraud and abuse
        • Enforce our Terms of Service and Community Guidelines
        • Respond to safety concerns and law enforcement requests

        **3.4 Communications**
        • Send service-related notifications (matches, messages, account updates)
        • Provide customer support
        • Send marketing communications (with your consent)

        **3.5 Research and Analytics**
        • Understand how users interact with our Services
        • Analyze trends and measure the effectiveness of features
        • Develop new features and improve existing ones
      `,
    },
    {
      id: 'data-sharing',
      title: '4. How We Share Your Information',
      content: `
        We do not sell your personal information. We share your data only in the following circumstances:

        **4.1 With Other Users**
        • Your public profile information is visible to other users
        • Messages are shared with the recipients you choose
        • You control what information is visible through privacy settings

        **4.2 With Service Providers**
        We share data with trusted partners who help us operate our Services:
        • Cloud hosting providers (data storage)
        • Payment processors (transaction processing)
        • Identity verification services (profile verification)
        • Analytics providers (service improvement)
        • Customer support tools (help desk services)

        All service providers are bound by strict confidentiality agreements.

        **4.3 For Legal Reasons**
        We may disclose information:
        • To comply with legal obligations
        • To respond to valid legal requests (subpoenas, court orders)
        • To protect FLAMORAL, our users, or the public from harm
        • In connection with investigations of suspected violations

        **4.4 Business Transfers**
        If FLAMORAL is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
      `,
    },
    {
      id: 'data-retention',
      title: '5. Data Retention',
      content: `
        We retain your information for as long as your account is active or as needed to provide our Services:

        **Active Accounts**
        • Profile data is retained while your account is active
        • Messages are retained for the duration of the conversation

        **Deleted Accounts**
        • Most data is deleted within 30 days of account deletion
        • Some data may be retained longer for legal compliance (up to 7 years for financial records)
        • Anonymized data may be retained for analytics purposes

        **Safety Data**
        • Reports and moderation data may be retained to prevent repeat violations
        • Banned user data is retained to prevent re-registration

        You can request deletion of your data at any time through your account settings or by contacting us.
      `,
    },
    {
      id: 'your-rights',
      title: '6. Your Rights and Choices',
      content: `
        You have control over your personal information:

        **6.1 Access and Portability**
        • View your data in your account settings
        • Request a copy of your data in a portable format
        • Download your data at any time

        **6.2 Correction**
        • Update your profile information at any time
        • Request correction of inaccurate data

        **6.3 Deletion**
        • Delete your account and associated data
        • Request deletion of specific data elements

        **6.4 Restriction and Objection**
        • Limit how we use your data
        • Object to certain processing activities
        • Opt out of marketing communications

        **6.5 Consent Withdrawal**
        • Withdraw consent for optional processing at any time
        • Manage cookie preferences

        **For EU/EEA Residents (GDPR)**
        You have additional rights including the right to lodge a complaint with your local data protection authority.

        **For California Residents (CCPA/CPRA)**
        You have the right to know, delete, correct, and opt out of the sale/sharing of personal information. We do not sell your personal information.

        To exercise any of these rights, visit your Privacy Settings or contact us at privacy@flamoral.com.
      `,
    },
    {
      id: 'security',
      title: '7. Security Measures',
      content: `
        We implement comprehensive security measures to protect your information:

        **Technical Safeguards**
        • AES-256 encryption for data at rest
        • TLS 1.3 encryption for data in transit
        • Regular security audits and penetration testing
        • Multi-factor authentication available
        • Automated threat detection systems

        **Organizational Safeguards**
        • Employee access controls and training
        • Background checks for employees with data access
        • Incident response procedures
        • Regular security awareness training

        **Third-Party Security**
        • Vendor security assessments
        • Data processing agreements with service providers
        • Regular compliance audits

        While we strive to protect your information, no method of transmission over the Internet is 100% secure. We encourage you to use strong passwords and enable two-factor authentication.
      `,
    },
    {
      id: 'international-transfers',
      title: '8. International Data Transfers',
      content: `
        FLAMORAL operates globally, and your information may be transferred to and processed in countries other than your own.

        **Transfer Safeguards**
        We ensure adequate protection for international transfers through:
        • Standard Contractual Clauses (SCCs) approved by the European Commission
        • Data Processing Agreements with all service providers
        • Adequacy decisions where applicable
        • Additional supplementary measures as required

        **EU-US Data Transfers**
        We comply with the EU-US Data Privacy Framework where applicable.

        By using our Services, you consent to the transfer of your information to countries that may have different data protection laws than your country of residence.
      `,
    },
    {
      id: 'children',
      title: "9. Children's Privacy",
      content: `
        FLAMORAL is intended for users 18 years of age and older. We do not knowingly collect personal information from children under 18.

        **Age Verification**
        • We require date of birth during registration
        • We use additional verification methods to confirm age
        • Accounts suspected of belonging to minors are immediately suspended

        If we discover that we have collected information from a child under 18, we will delete that information immediately. If you believe a minor is using our Services, please contact us at safety@flamoral.com.
      `,
    },
    {
      id: 'cookies',
      title: '10. Cookies and Tracking Technologies',
      content: `
        We use cookies and similar technologies to enhance your experience:

        **Essential Cookies**
        Required for basic functionality (authentication, security, preferences)

        **Analytics Cookies**
        Help us understand how users interact with our Services

        **Marketing Cookies**
        Used to deliver relevant advertisements (with your consent)

        You can manage your cookie preferences through:
        • Your browser settings
        • Our cookie consent banner
        • Your account Privacy Settings

        For more details, see our Cookie Policy.
      `,
    },
    {
      id: 'updates',
      title: '11. Updates to This Policy',
      content: `
        We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.

        **Notification of Changes**
        • Material changes will be communicated via email or in-app notification
        • We will update the "Last Updated" date at the top of this policy
        • A summary of changes will be provided

        **Review Period**
        For significant changes, we will give you advance notice and the opportunity to review before they take effect.

        Your continued use of FLAMORAL after changes become effective constitutes acceptance of the updated policy.
      `,
    },
    {
      id: 'contact',
      title: '12. Contact Us',
      content: `
        If you have questions about this Privacy Policy or our data practices, please contact us:

        **General Inquiries**
        Email: privacy@flamoral.com
        Address: FLAMORAL Inc., 123 Innovation Drive, San Francisco, CA 94102, USA

        **Data Protection Officer (EU)**
        Email: dpo@flamoral.com

        **EU Representative**
        FLAMORAL EU Representative
        Address: [EU Address]

        **UK Representative**
        FLAMORAL UK Representative
        Address: [UK Address]

        We aim to respond to all inquiries within 30 days.
      `,
    },
  ],

  userRights: [
    'Right to access your personal data',
    'Right to correct inaccurate data',
    'Right to delete your data ("right to be forgotten")',
    'Right to data portability',
    'Right to restrict processing',
    'Right to object to processing',
    'Right to withdraw consent',
    'Right to lodge a complaint with a supervisory authority',
    'Right to non-discrimination for exercising privacy rights',
    'Right to opt out of sale/sharing (CCPA)',
    'Right to limit use of sensitive personal information (CCPA)',
  ],

  contactInfo: {
    email: 'privacy@flamoral.com',
    address: 'FLAMORAL Inc., 123 Innovation Drive, San Francisco, CA 94102, USA',
    dpo: 'dpo@flamoral.com',
  },
};

export default privacyPolicy;
