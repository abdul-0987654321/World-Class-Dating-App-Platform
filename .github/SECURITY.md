# Security Policy

## Supported Versions

We actively support security updates for the following versions of Flamoral:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Flamoral seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: **security@flamoral.com**

Include the following information in your report:
- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Full paths of source files related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability and how it could be exploited

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 7 days with an assessment
- **Resolution Timeline**:
  - Critical: 24-72 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report
2. **Communication**: We will keep you informed of our progress
3. **Resolution**: We will notify you when the vulnerability is fixed
4. **Credit**: With your permission, we will credit you in our security advisories

## Security Measures

### Infrastructure Security
- All data encrypted at rest and in transit (TLS 1.2+)
- Azure Key Vault for secrets management
- Network isolation with Virtual Networks
- Web Application Firewall (WAF) protection
- DDoS protection enabled

### Application Security
- JWT-based authentication with token rotation
- Rate limiting on all API endpoints
- Input validation and sanitization
- SQL injection and XSS prevention
- Content Security Policy (CSP) headers

### Monitoring & Detection
- Real-time security monitoring
- Automated vulnerability scanning (Trivy, Snyk, CodeQL)
- Intrusion detection systems
- Audit logging for security events

### Compliance
- GDPR compliant data handling
- SOC 2 Type II (in progress)
- Regular penetration testing
- Annual security audits

## Bug Bounty Program

We are currently developing a bug bounty program. Details will be announced soon.

## Security Best Practices for Contributors

1. Never commit secrets, API keys, or credentials
2. Use environment variables for sensitive configuration
3. Follow secure coding guidelines
4. Keep dependencies up to date
5. Report any security concerns immediately

## Contact

- **Security Team**: security@flamoral.com
- **General Inquiries**: support@flamoral.com
