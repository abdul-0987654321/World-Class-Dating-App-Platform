/**
 * FLAMORAL Trust & Safety Policy
 * Comprehensive Safety Framework for Dating Platform
 *
 * Version: 3.0.0
 * Last Updated: 2025-12-15
 * Effective Date: 2025-12-15
 */

export interface SafetySection {
  id: string;
  title: string;
  content: string;
  reportingSteps?: string[];
  examples?: string[];
}

export interface TrustSafetyPolicy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  commitment: string;
  sections: SafetySection[];
  emergencyContacts: {
    region: string;
    emergency: string;
    hotlines?: string[];
  }[];
}

export const trustSafetyPolicy: TrustSafetyPolicy = {
  version: '3.0.0',
  effectiveDate: '2025-12-15',
  lastUpdated: '2025-12-15',

  commitment: `
    At FLAMORAL, your safety is our top priority. We are committed to creating a secure environment where you can form meaningful connections with confidence. This Trust & Safety Policy outlines our comprehensive approach to protecting our community.

    Our Safety Promise:
    • 24/7 dedicated safety team monitoring and responding to reports
    • AI-powered detection of suspicious behavior and fake profiles
    • Multi-layer verification to ensure authentic profiles
    • Zero tolerance for harassment, abuse, and fraud
    • Transparent reporting and swift enforcement actions
    • Continuous improvement based on user feedback and emerging threats
  `,

  sections: [
    {
      id: 'safety-features',
      title: '1. Platform Safety Features',
      content: `
        **1.1 Profile Verification**
        We employ multiple verification methods to ensure authentic profiles:

        • Photo Verification: AI-powered selfie verification matching your profile photos
        • Phone Verification: SMS verification to confirm unique users
        • Email Verification: Confirmed email addresses for account recovery
        • Optional ID Verification: Government ID verification for enhanced trust badges
        • Video Verification: Live video selfie for premium verification

        Verified profiles receive visible badges, increasing trust and match rates.

        **1.2 AI-Powered Safety Systems**
        Our artificial intelligence systems work 24/7 to:

        • Detect and remove fake profiles before you see them
        • Identify scam patterns and known bad actors
        • Flag potentially harmful content in messages
        • Detect and block inappropriate photos
        • Identify suspicious behavior patterns
        • Prevent ban evasion by repeat offenders

        Our AI catches 99%+ of fake profiles before they can interact with real users.

        **1.3 Blocking and Reporting**
        You have full control over your interactions:

        • Block Any User: Immediately removes them from your view and vice versa
        • Report Violations: Flag concerning behavior for review
        • Unmatch: Remove a match without blocking
        • Hide Profile: Temporarily hide from discovery without deleting account

        Blocking is anonymous—the blocked user is not notified.

        **1.4 Message Safety**
        Our messaging system includes:

        • Photo Request Consent: Recipients must accept before seeing photos
        • AI Content Scanning: Detects and filters harmful content
        • Undo Send: Recall messages within 60 seconds
        • Screenshot Detection: Notifies you if someone screenshots your chat
        • Link Safety: Warns before opening external links

        **1.5 Video Chat Safety**
        For video dates:

        • No Recording: We do not record video calls
        • Screenshot Blocked: Screenshots are technically blocked during calls
        • End Call Anytime: One tap to end any uncomfortable call
        • Report During Call: Report button accessible during video chats
      `,
    },
    {
      id: 'prohibited-behaviors',
      title: '2. Prohibited Behaviors',
      content: `
        The following behaviors are strictly prohibited and will result in immediate action:

        **2.1 Harassment and Abuse**
        • Sending threatening, intimidating, or abusive messages
        • Continued contact after being asked to stop
        • Stalking or monitoring someone's activity
        • Doxxing or sharing someone's private information
        • Cyberbullying or targeted harassment campaigns

        **2.2 Sexual Misconduct**
        • Sending unsolicited explicit content
        • Sexual harassment or unwanted advances
        • Non-consensual sharing of intimate images
        • Sexual coercion or pressure
        • Any form of sexual exploitation

        **2.3 Fraud and Deception**
        • Creating fake or misleading profiles
        • Catfishing or identity misrepresentation
        • Romance scams or financial fraud
        • Phishing or credential harvesting
        • Impersonating FLAMORAL staff

        **2.4 Dangerous Activities**
        • Promoting violence or self-harm
        • Drug dealing or illegal substance promotion
        • Human trafficking indicators
        • Encouraging dangerous meetups
        • Terrorism or extremist content

        **2.5 Discrimination**
        • Hate speech based on protected characteristics
        • Discriminatory rejection messages
        • Fetishization of race, ethnicity, or identity
        • Religious or political harassment

        **2.6 Platform Manipulation**
        • Using bots or automated systems
        • Creating multiple accounts
        • Circumventing bans or restrictions
        • Spamming or mass messaging
        • Selling or buying accounts
      `,
      examples: [
        'Sending "hey" 50 times after no response = harassment, results in suspension',
        'Requesting nude photos from new matches = sexual misconduct, results in warning or ban',
        'Asking for money or financial information = fraud indicator, results in investigation',
        'Threatening to expose private conversations = harassment, results in permanent ban',
      ],
    },
    {
      id: 'reporting-system',
      title: '3. Reporting System',
      content: `
        **3.1 How to Report**
        You can report concerns through multiple channels:

        • In-App Report: Tap the (...) menu on any profile or conversation
        • Safety Hub: Visit flamoral.com/safety to file a detailed report
        • Email: safety@flamoral.com for complex situations
        • Emergency: Call local emergency services for immediate danger

        **3.2 What to Report**
        Report any behavior that makes you feel unsafe or uncomfortable, including:
        • Harassment or threatening messages
        • Suspected fake profiles
        • Inappropriate content
        • Scam attempts
        • Off-platform concerning behavior
        • Underage users
        • Any Terms of Service violations

        **3.3 Report Categories**
        When reporting, select the most relevant category:
        • Fake Profile / Catfish
        • Harassment / Bullying
        • Inappropriate Content
        • Spam / Scam
        • Underage User
        • Threatening Behavior
        • Hate Speech
        • Self-Harm / Suicide Concerns
        • Physical Safety Concern
        • Other

        **3.4 What Happens After You Report**
        1. You receive confirmation that your report was received
        2. Our safety team reviews the report (typically within 1-24 hours)
        3. We investigate and gather evidence
        4. Appropriate action is taken
        5. You receive a notification about the outcome (when possible)

        Reports are confidential—the reported user is not told who reported them.
      `,
      reportingSteps: [
        'Open the profile or conversation you want to report',
        'Tap the three-dot menu (...) in the top right',
        'Select "Report"',
        'Choose the reason that best describes the issue',
        'Add any additional details or screenshots',
        'Submit the report',
      ],
    },
    {
      id: 'enforcement',
      title: '4. Enforcement Actions',
      content: `
        **4.1 Enforcement Levels**
        We take graduated enforcement actions based on severity:

        **Warning**
        • First-time minor violations
        • Educational notice about Community Guidelines
        • No feature restrictions

        **Temporary Suspension**
        • Repeated minor violations
        • Single moderate violation
        • 1-7 day suspension from platform
        • All features restricted during suspension

        **Feature Restrictions**
        • Messaging disabled
        • Photo uploads restricted
        • Discovery visibility reduced
        • Duration based on violation severity

        **Permanent Ban**
        • Severe violations (threats, fraud, illegal activity)
        • Repeated moderate violations
        • Complete account termination
        • Ban on creating new accounts

        **Law Enforcement Referral**
        • Illegal activities
        • Credible threats of violence
        • Child safety concerns
        • As required by law

        **4.2 Factors We Consider**
        When determining enforcement, we evaluate:
        • Severity of the violation
        • User's history on the platform
        • Impact on the victim(s)
        • Intent and context
        • Applicable laws and regulations

        **4.3 Appeals Process**
        If you believe an enforcement action was incorrect:
        1. Email appeals@flamoral.com within 30 days
        2. Include your username and explain why you disagree
        3. Provide any relevant evidence
        4. Our appeals team will review within 14 days
        5. You will receive a final decision via email

        Appeals decisions are final.
      `,
    },
    {
      id: 'safety-tips',
      title: '5. Safety Tips for Dating',
      content: `
        **5.1 Before You Meet**
        • Use video chat first to verify they're who they say they are
        • Research your date (social media, reverse image search)
        • Trust your instincts—if something feels off, don't meet
        • Keep conversations on FLAMORAL until you're comfortable
        • Never share financial information or send money

        **5.2 Planning the First Meeting**
        • Meet in a public place (coffee shop, restaurant, park)
        • Tell a friend or family member your plans
        • Share your location with someone you trust
        • Arrange your own transportation
        • Have a fully charged phone

        **5.3 During the Date**
        • Stay in public for the first few meetings
        • Watch your drink being prepared and poured
        • Don't leave food or drinks unattended
        • Keep your phone charged and accessible
        • Have a backup plan to leave if needed

        **5.4 After the Date**
        • Let someone know you got home safely
        • Trust your feelings about the experience
        • Take time before committing to another date
        • Report any concerning behavior to FLAMORAL

        **5.5 Red Flags to Watch For**
        • Reluctance to video chat or meet in person
        • Stories that don't add up or change
        • Moving too fast emotionally
        • Requests for money or financial help
        • Pressure to leave the app for other communication
        • Excessive jealousy or controlling behavior
        • Avoiding questions about their life
        • Only available at certain times
      `,
    },
    {
      id: 'protecting-information',
      title: '6. Protecting Your Information',
      content: `
        **6.1 What Not to Share**
        Never share with people you haven't met:
        • Home or work address
        • Financial information (bank, credit card)
        • Government ID numbers
        • Passwords or login credentials
        • Exact daily schedule or routine
        • Information about children or family members

        **6.2 Communication Safety**
        • Keep conversations on FLAMORAL until you've met in person
        • Be cautious about sharing social media accounts
        • Use a Google Voice number instead of your real phone number initially
        • Don't click suspicious links in messages

        **6.3 Photo Safety**
        • Disable location metadata on your photos
        • Avoid photos that reveal your address or workplace
        • Be mindful of identifiable backgrounds
        • Don't share explicit photos with people you haven't met

        **6.4 If You Feel Unsafe**
        If someone from FLAMORAL makes you feel unsafe:
        1. Block them immediately on the platform
        2. Report the behavior to our safety team
        3. Document any threatening communications
        4. Contact local police if there are credible threats
        5. Reach out to victim support services if needed
      `,
    },
    {
      id: 'special-situations',
      title: '7. Special Situations',
      content: `
        **7.1 Romance Scams**
        Warning signs of romance scams:
        • Professes love very quickly
        • Claims to be overseas (military, oil rig, doctor abroad)
        • Asks for money for emergencies or travel
        • Cannot video chat due to excuses
        • Sends generic or overly perfect photos

        If you suspect a scam:
        1. Stop all communication
        2. Do not send any money
        3. Report to FLAMORAL immediately
        4. Report to FTC at reportfraud.ftc.gov
        5. Report to FBI's IC3 if you lost money

        **7.2 Sextortion**
        If someone threatens to share intimate images:
        • Do not pay them—it rarely stops the threats
        • Stop all communication with them
        • Document everything (screenshots)
        • Report to FLAMORAL
        • Report to FBI's IC3 (ic3.gov)
        • Contact the Cyber Civil Rights Initiative

        **7.3 Domestic Violence Resources**
        If you're in an abusive relationship:
        • National Domestic Violence Hotline: 1-800-799-7233
        • Text "START" to 88788
        • Visit thehotline.org

        **7.4 Crisis Support**
        If you or someone you know is in crisis:
        • National Suicide Prevention Lifeline: 988
        • Crisis Text Line: Text HOME to 741741
        • International Association for Suicide Prevention: iasp.info/resources/Crisis_Centres/

        **7.5 LGBTQ+ Safety**
        We support all identities. Additional resources:
        • Trevor Project: 1-866-488-7386
        • Trans Lifeline: 877-565-8860
        • PFLAG: pflag.org
      `,
    },
    {
      id: 'law-enforcement',
      title: '8. Law Enforcement Cooperation',
      content: `
        **8.1 When We Cooperate**
        We work with law enforcement when:
        • Required by valid legal process
        • There is an imminent threat to life
        • A child's safety is at risk
        • A crime has been committed

        **8.2 What We Provide**
        With proper legal process, we may provide:
        • Account registration information
        • IP addresses and login records
        • Content of communications (with warrant)
        • Photos and profile information

        **8.3 User Notification**
        We notify users of law enforcement requests unless:
        • Legally prohibited from doing so
        • There is risk to life or safety
        • Doing so would impede an investigation

        **8.4 Law Enforcement Contact**
        Law enforcement should contact:
        lawenforcement@flamoral.com
        Include agency identification and legal process.

        **8.5 Emergency Requests**
        For emergencies involving imminent threats:
        Email: emergency@flamoral.com
        Available 24/7 for life-threatening situations
      `,
    },
    {
      id: 'transparency',
      title: '9. Transparency and Accountability',
      content: `
        **9.1 Transparency Reports**
        We publish semi-annual transparency reports including:
        • Number of accounts removed
        • Types of violations detected
        • Law enforcement requests received
        • Appeals processed
        • Safety improvements made

        Reports are available at flamoral.com/transparency

        **9.2 Safety Advisory Board**
        We consult with external experts including:
        • Domestic violence prevention organizations
        • Online safety researchers
        • Law enforcement advisors
        • Mental health professionals
        • Privacy and security experts

        **9.3 Continuous Improvement**
        We continuously improve safety through:
        • Regular policy reviews
        • User feedback analysis
        • Industry collaboration
        • Technology advancement
        • Safety team training

        **9.4 Feedback**
        We welcome safety suggestions at:
        safety-feedback@flamoral.com
      `,
    },
  ],

  emergencyContacts: [
    {
      region: 'United States',
      emergency: '911',
      hotlines: [
        'National Domestic Violence Hotline: 1-800-799-7233',
        'National Suicide Prevention Lifeline: 988',
        'FBI IC3 (Internet Crime): ic3.gov',
      ],
    },
    {
      region: 'United Kingdom',
      emergency: '999',
      hotlines: [
        'National Domestic Abuse Helpline: 0808 2000 247',
        'Samaritans: 116 123',
        'Action Fraud: 0300 123 2040',
      ],
    },
    {
      region: 'European Union',
      emergency: '112',
      hotlines: [
        'EU Victims Rights: ec.europa.eu/victims-rights',
      ],
    },
    {
      region: 'Canada',
      emergency: '911',
      hotlines: [
        'Canadian Anti-Fraud Centre: 1-888-495-8501',
        'Crisis Services Canada: 1-833-456-4566',
      ],
    },
    {
      region: 'Australia',
      emergency: '000',
      hotlines: [
        '1800 Respect: 1800 737 732',
        'Lifeline: 13 11 14',
        'Scamwatch: scamwatch.gov.au',
      ],
    },
  ],
};

export default trustSafetyPolicy;
