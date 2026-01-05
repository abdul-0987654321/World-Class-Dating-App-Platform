/**
 * FLAMORAL Terms of Service
 * Comprehensive User Agreement for Dating Platform
 *
 * Version: 3.0.0
 * Last Updated: 2025-12-15
 * Effective Date: 2025-12-15
 */

export interface TermsSection {
  id: string;
  title: string;
  content: string;
  examples?: string[];
}

export interface TermsOfService {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  sections: TermsSection[];
}

export const termsOfService: TermsOfService = {
  version: '3.0.0',
  effectiveDate: '2025-12-15',
  lastUpdated: '2025-12-15',

  summary: `
    These Terms of Service ("Terms") govern your use of FLAMORAL. By using our platform, you agree to these Terms.

    Key Points:
    • You must be 18 or older to use FLAMORAL
    • Provide accurate information and maintain one account
    • Treat others with respect and follow our Community Guidelines
    • We provide tools for connections; you're responsible for your interactions
    • Premium features are subject to payment terms
    • Violations may result in account suspension or termination
    • Disputes are resolved through binding arbitration (with opt-out option)
  `,

  sections: [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: `
        By creating an account or using FLAMORAL ("Service," "Platform," "we," "us," or "our"), you agree to be bound by these Terms of Service, our Privacy Policy, Community Guidelines, and all applicable laws and regulations.

        **Eligibility Requirements**
        To use FLAMORAL, you must:
        • Be at least 18 years of age (or the age of majority in your jurisdiction if higher)
        • Have the legal capacity to enter into a binding agreement
        • Not be prohibited from using the Service under applicable laws
        • Not have been previously banned from FLAMORAL
        • Not be a registered sex offender

        **Agreement to Terms**
        By clicking "I Accept," creating an account, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you may not use FLAMORAL.

        **Updates to Terms**
        We may modify these Terms at any time. We will notify you of material changes via email or in-app notification at least 30 days before they take effect. Continued use after changes become effective constitutes acceptance.
      `,
    },
    {
      id: 'account-registration',
      title: '2. Account Registration and Security',
      content: `
        **2.1 Account Creation**
        To access FLAMORAL, you must create an account by providing accurate, current, and complete information. You agree to:
        • Provide truthful information about yourself
        • Use your real identity and recent photos
        • Maintain only one account
        • Keep your account information up to date
        • Not impersonate any person or entity

        **2.2 Account Security**
        You are responsible for:
        • Maintaining the confidentiality of your login credentials
        • All activities that occur under your account
        • Notifying us immediately of any unauthorized use
        • Using strong, unique passwords

        We recommend enabling two-factor authentication for enhanced security.

        **2.3 Account Verification**
        We may require verification to confirm your identity. This may include:
        • Photo verification (selfie matching)
        • Phone number verification
        • Email verification
        • Optional ID verification for enhanced trust badges

        Failure to complete required verification may limit your access to certain features.
      `,
      examples: [
        "Using someone else's photos is a violation and will result in account termination",
        'Creating multiple accounts to circumvent a ban is prohibited',
        'Misrepresenting your age, even by one year, violates these Terms',
      ],
    },
    {
      id: 'user-conduct',
      title: '3. User Conduct and Community Standards',
      content: `
        **3.1 Acceptable Use**
        FLAMORAL is intended for building genuine romantic connections. You agree to:
        • Treat all users with respect and dignity
        • Follow our Community Guidelines
        • Use the Platform for its intended purpose
        • Respect others' privacy and boundaries
        • Report violations and safety concerns

        **3.2 Prohibited Conduct**
        You may NOT:
        • Harass, bully, stalk, or intimidate other users
        • Send unsolicited sexual content or explicit messages
        • Engage in hate speech, discrimination, or bigotry
        • Scam, defraud, or deceive other users
        • Solicit money or engage in commercial activities
        • Share others' personal information without consent
        • Use the Platform for illegal purposes
        • Interfere with the Platform's operation
        • Create fake profiles or impersonate others
        • Engage in spam or mass unsolicited messaging
        • Promote violence, self-harm, or dangerous activities
        • Use automated systems or bots
        • Circumvent safety features or bans

        **3.3 Content Standards**
        All content you post must:
        • Be accurate and not misleading
        • Not infringe intellectual property rights
        • Not contain malware or harmful code
        • Not violate any laws or regulations
        • Comply with our photo guidelines (no nudity, no minors, recent photos only)

        **3.4 Reporting and Enforcement**
        We investigate all reports of violations. Enforcement actions may include:
        • Warning
        • Temporary suspension
        • Feature restrictions
        • Permanent ban
        • Report to law enforcement when required
      `,
    },
    {
      id: 'safety',
      title: '4. Safety and Personal Responsibility',
      content: `
        **4.1 Platform Role**
        FLAMORAL provides tools to connect people. We do NOT:
        • Conduct background checks on users (except optional premium feature)
        • Verify the accuracy of user-provided information
        • Guarantee the safety of in-person meetings
        • Guarantee the intentions or character of users

        **4.2 Your Responsibility**
        You acknowledge that:
        • You are solely responsible for your interactions with other users
        • You should use caution when communicating with strangers
        • You should verify information before meeting in person
        • You should always meet in public places initially
        • You should inform someone of your plans when meeting someone new

        **4.3 Safety Recommendations**
        We strongly encourage you to:
        • Use our video chat feature before meeting in person
        • Research potential matches independently
        • Never share financial information or send money
        • Report suspicious behavior immediately
        • Trust your instincts—if something feels wrong, it probably is
        • Review our Safety Tips in the Safety Center

        **4.4 Emergency Situations**
        If you are in immediate danger, contact local emergency services first. Then report to us through the Safety Hub for platform-level action.
      `,
    },
    {
      id: 'intellectual-property',
      title: '5. Intellectual Property',
      content: `
        **5.1 FLAMORAL's Rights**
        FLAMORAL and its licensors own all rights to:
        • The FLAMORAL name, logo, and branding
        • The Platform's design, features, and functionality
        • Our matching algorithms and technology
        • All content created by FLAMORAL

        You may not copy, modify, distribute, or create derivative works without our written permission.

        **5.2 Your Content**
        You retain ownership of content you create and post. By posting content, you grant FLAMORAL a:
        • Worldwide, non-exclusive, royalty-free license
        • Right to use, reproduce, modify, and display your content
        • Right to use content for Platform operation and promotion
        • Right to sublicense to service providers

        This license ends when you delete your content or account, except for:
        • Content shared with other users (they may retain copies)
        • Anonymized data used for analytics
        • Content we are required to retain by law

        **5.3 DMCA and Copyright**
        We respect intellectual property rights. If you believe content infringes your copyright, contact us at legal@flamoral.com with:
        • Identification of the copyrighted work
        • Identification of the infringing content
        • Your contact information
        • A statement of good faith belief
        • A statement of accuracy under penalty of perjury
        • Your physical or electronic signature
      `,
    },
    {
      id: 'subscriptions',
      title: '6. Subscriptions and Payments',
      content: `
        **6.1 Free Services**
        Basic FLAMORAL features are available for free, including:
        • Profile creation
        • Limited daily likes
        • Messaging with matches
        • Basic discovery filters

        **6.2 Premium Subscriptions**
        Premium features are available through paid subscriptions:
        • FLAMORAL Premium: Unlimited likes, see who likes you, advanced filters
        • FLAMORAL Platinum: Premium features plus boosts, super likes, AI coach

        **6.3 Subscription Terms**
        • Subscriptions automatically renew unless cancelled
        • Cancel at least 24 hours before renewal to avoid charges
        • No refunds for partial subscription periods
        • Prices may change; we will notify you in advance
        • Promotional pricing applies to initial term only

        **6.4 In-App Purchases**
        Additional features available for purchase:
        • Boosts (increased visibility)
        • Super Likes (express special interest)
        • Coins (virtual currency for features)

        In-app purchases are non-refundable except as required by law.

        **6.5 Payment Processing**
        Payments are processed by:
        • App Store/Google Play for mobile subscriptions
        • Stripe for web subscriptions
        • Other approved payment processors

        We do not store your full payment card details.

        **6.6 Refund Policy**
        Refunds may be considered in cases of:
        • Technical errors causing duplicate charges
        • Unauthorized transactions (report within 60 days)
        • Service unavailability during subscription period
        • As required by applicable consumer protection laws

        Contact support@flamoral.com for refund requests.
      `,
    },
    {
      id: 'disclaimers',
      title: '7. Disclaimers and Limitations',
      content: `
        **7.1 Service "As Is"**
        FLAMORAL IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING:
        • MERCHANTABILITY
        • FITNESS FOR A PARTICULAR PURPOSE
        • NON-INFRINGEMENT
        • ACCURACY OR COMPLETENESS

        **7.2 No Guarantee of Results**
        We do not guarantee that you will:
        • Find a match or relationship
        • Receive a certain number of likes or matches
        • Have a positive experience with every user
        • Find the Platform suitable for your needs

        **7.3 Third-Party Content**
        We are not responsible for:
        • Content posted by other users
        • Third-party websites or services linked from our Platform
        • Actions or statements of other users
        • Third-party products or services

        **7.4 Limitation of Liability**
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLAMORAL AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
        • Indirect, incidental, special, consequential, or punitive damages
        • Loss of profits, data, use, or goodwill
        • Personal injury or property damage
        • Any damages exceeding the amount you paid to FLAMORAL in the 12 months preceding the claim

        Some jurisdictions do not allow certain limitations, so these may not apply to you.
      `,
    },
    {
      id: 'indemnification',
      title: '8. Indemnification',
      content: `
        You agree to indemnify, defend, and hold harmless FLAMORAL and its affiliates, officers, directors, employees, and agents from any claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from:

        • Your use of the Platform
        • Your violation of these Terms
        • Your violation of any third-party rights
        • Your content posted on the Platform
        • Your interactions with other users
        • Your negligence or willful misconduct

        We reserve the right to assume exclusive defense of any matter subject to indemnification. You agree to cooperate with our defense of such claims.
      `,
    },
    {
      id: 'dispute-resolution',
      title: '9. Dispute Resolution',
      content: `
        **9.1 Informal Resolution**
        Before filing any formal dispute, you agree to contact us at disputes@flamoral.com to attempt informal resolution. We will work with you in good faith to resolve the issue within 60 days.

        **9.2 Binding Arbitration**
        If informal resolution fails, disputes will be resolved through BINDING ARBITRATION administered by JAMS under its Streamlined Arbitration Rules.
        • Arbitration will be conducted individually (no class actions)
        • Location: San Francisco, CA, or by video/phone if you prefer
        • Language: English
        • Governing Law: California law applies
        • Arbitrator's decision is final and binding

        **9.3 Class Action Waiver**
        YOU AGREE TO RESOLVE DISPUTES ONLY ON AN INDIVIDUAL BASIS AND WAIVE ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS.

        **9.4 Exceptions**
        The following may be filed in court:
        • Small claims court actions
        • Injunctive relief for intellectual property infringement
        • Claims not subject to arbitration by law

        **9.5 Opt-Out Right**
        You may opt out of arbitration by emailing arbitration-optout@flamoral.com within 30 days of creating your account. Include your name, email, and statement that you wish to opt out.

        **9.6 Severability**
        If any part of this dispute resolution section is unenforceable, the remainder still applies.
      `,
    },
    {
      id: 'termination',
      title: '10. Termination',
      content: `
        **10.1 Your Right to Terminate**
        You may delete your account at any time through Settings > Account > Delete Account. Upon deletion:
        • Your profile will be removed from public view immediately
        • Your data will be deleted within 30 days
        • Active subscriptions will not be refunded for remaining periods
        • Some data may be retained as required by law

        **10.2 Our Right to Terminate**
        We may suspend or terminate your account:
        • For violation of these Terms or Community Guidelines
        • For fraudulent, illegal, or harmful activity
        • For extended inactivity (we will notify you first)
        • If required by law or court order
        • At our discretion with notice

        **10.3 Effect of Termination**
        Upon termination:
        • Your license to use the Platform ends immediately
        • We may retain data as required by law or legitimate interests
        • Provisions that should survive termination will remain in effect
        • You may not create a new account if banned

        **10.4 Appeals**
        If you believe your account was terminated in error, contact appeals@flamoral.com within 30 days.
      `,
    },
    {
      id: 'general',
      title: '11. General Provisions',
      content: `
        **11.1 Entire Agreement**
        These Terms, together with the Privacy Policy and Community Guidelines, constitute the entire agreement between you and FLAMORAL.

        **11.2 Severability**
        If any provision is found unenforceable, the remaining provisions remain in full effect.

        **11.3 No Waiver**
        Failure to enforce any provision does not waive our right to enforce it later.

        **11.4 Assignment**
        You may not assign your rights under these Terms. We may assign our rights to an affiliate or successor.

        **11.5 Force Majeure**
        We are not liable for delays or failures due to circumstances beyond our reasonable control.

        **11.6 Governing Law**
        These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles.

        **11.7 Contact Information**
        FLAMORAL Inc.
        123 Innovation Drive
        San Francisco, CA 94102, USA
        Email: legal@flamoral.com
        Support: support@flamoral.com
      `,
    },
  ],
};

export default termsOfService;
