# Security Testing Tools and Configuration
**Flamoral Dating Platform**

**Version:** 1.0
**Last Updated:** December 2025
**Classification:** Confidential - Internal Use Only

---

## Table of Contents

1. [Overview](#overview)
2. [OWASP ZAP Configuration](#owasp-zap-configuration)
3. [Burp Suite Setup](#burp-suite-setup)
4. [Nuclei Templates](#nuclei-templates)
5. [SQLMap Usage](#sqlmap-usage)
6. [Nmap Scanning Procedures](#nmap-scanning-procedures)
7. [Mobile Testing Tools](#mobile-testing-tools)
8. [Additional Security Tools](#additional-security-tools)
9. [Tool Integration with CI/CD](#tool-integration-with-cicd)
10. [Reporting and Documentation](#reporting-and-documentation)

---

## Overview

This document provides comprehensive configuration and usage instructions for security testing tools used in the Flamoral platform security assessment.

### Tool Categories

- **Web Application Testing**: OWASP ZAP, Burp Suite
- **Automated Scanning**: Nuclei, Nikto
- **Database Testing**: SQLMap
- **Network Scanning**: Nmap, Masscan
- **Mobile Testing**: MobSF, Frida, Objection
- **API Testing**: Postman, REST API Fuzzer
- **Code Analysis**: SonarQube, Semgrep, Bandit
- **Container Security**: Trivy, Docker Bench

### Prerequisites

Before using these tools, ensure you have:
- ✅ Written authorization for security testing
- ✅ Testing performed only on designated environments
- ✅ Rate limiting considerations documented
- ✅ Emergency contacts established
- ✅ Backup and rollback procedures ready

---

## OWASP ZAP Configuration

**OWASP Zed Attack Proxy (ZAP)** is a free, open-source web application security scanner.

### Installation

#### Windows
```bash
# Download from official site
https://www.zaproxy.org/download/

# Or using Chocolatey
choco install zaproxy
```

#### macOS
```bash
brew install --cask owasp-zap
```

#### Linux
```bash
# Ubuntu/Debian
sudo snap install zaproxy --classic

# Or download from official site
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2_14_0_unix.sh
chmod +x ZAP_2_14_0_unix.sh
./ZAP_2_14_0_unix.sh
```

#### Docker
```bash
docker pull zaproxy/zap-stable
docker run -u zap -p 8080:8080 -p 8090:8090 -i zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

---

### Configuration

#### 1. Proxy Settings

Configure browser to use ZAP proxy:

**Manual Proxy Configuration**:
- HTTP Proxy: `localhost`
- Port: `8080`
- Use for all protocols: Yes

**Firefox Profile** (Recommended):
```bash
# Create dedicated Firefox profile for testing
firefox -P
# Name: ZAP-Testing
# Configure proxy as above
```

#### 2. SSL/TLS Certificate

Import ZAP certificate to avoid SSL errors:

```bash
# ZAP generates a certificate at:
# ~/.ZAP/owasp_zap_root_ca.cer (Linux/Mac)
# C:\Users\<username>\OWASP ZAP\owasp_zap_root_ca.cer (Windows)

# Import to Firefox
Preferences > Privacy & Security > Certificates > View Certificates >
Authorities > Import > Select owasp_zap_root_ca.cer
```

#### 3. ZAP Context Configuration

Create a context for Flamoral testing:

**File**: `flamoral_context.xml`
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<configuration>
    <context>
        <name>Flamoral</name>
        <desc>Flamoral Dating Platform Testing Context</desc>
        <inscope>true</inscope>
        <incregexes>https://staging\.flamoral\.com.*</incregexes>
        <incregexes>https://security-test\.flamoral\.com.*</incregexes>
        <tech>
            <include>Db.MongoDB</include>
            <include>Db.PostgreSQL</include>
            <include>Language.JavaScript</include>
            <include>OS.Linux</include>
            <include>SCM.Git</include>
            <include>WS.WebSockets</include>
        </tech>
        <authentication>
            <type>2</type>
            <strategy>EACH_RESP</strategy>
            <pollurl>https://staging.flamoral.com/api/auth/verify</pollurl>
            <polldata></polldata>
            <pollheaders></pollheaders>
            <pollfreq>60</pollfreq>
            <pollunits>REQUESTS</pollunits>
        </authentication>
    </context>
</configuration>
```

Import context:
```bash
# In ZAP GUI
File > Import Context > Select flamoral_context.xml
```

#### 4. Session Management

Configure authentication for automated scanning:

**Form-Based Authentication**:
```bash
# Authentication URL
https://staging.flamoral.com/api/auth/login

# POST Data
username={%username%}&password={%password%}

# Logged In Indicator (regex)
"accessToken":"[a-zA-Z0-9-_.]+"|"authenticated":true

# Logged Out Indicator
"error":"Unauthorized"|"authenticated":false
```

**JWT Token Authentication**:
```bash
# Add to Headers
Authorization: Bearer {JWT_TOKEN}

# Get JWT from login response
# ZAP will automatically include in subsequent requests
```

---

### Scanning Procedures

#### 1. Spider/Crawl

**Traditional Spider**:
```bash
# GUI Method
Tools > Spider > New Scan
# Target: https://staging.flamoral.com
# Context: Flamoral
# Recurse: Yes
# Maximum Depth: 5

# CLI Method
zap-cli spider https://staging.flamoral.com
```

**AJAX Spider** (for JavaScript-heavy apps):
```bash
# GUI Method
Tools > AJAX Spider > New Scan
# Target: https://staging.flamoral.com
# Browser: Firefox Headless
# Max Duration: 60 minutes

# CLI Method
zap-cli ajax-spider https://staging.flamoral.com
```

#### 2. Active Scan

```bash
# GUI Method
Attack > Active Scan
# Target: https://staging.flamoral.com
# Context: Flamoral
# Policy: Default Policy (or custom)
# Start Scan

# CLI Method
zap-cli active-scan --scanners all --recursive https://staging.flamoral.com

# Scan with custom policy
zap-cli active-scan --scanners sql,xss,xxe --recursive https://staging.flamoral.com
```

**Custom Scan Policy**:
```xml
<!-- File: flamoral_scan_policy.xml -->
<scanners>
    <scanner id="40018" enabled="true" level="MEDIUM" strength="HIGH">
        <name>SQL Injection</name>
    </scanner>
    <scanner id="40012" enabled="true" level="MEDIUM" strength="HIGH">
        <name>Cross Site Scripting (Reflected)</name>
    </scanner>
    <scanner id="40014" enabled="true" level="MEDIUM" strength="HIGH">
        <name>Cross Site Scripting (Persistent)</name>
    </scanner>
    <scanner id="90019" enabled="true" level="MEDIUM" strength="MEDIUM">
        <name>Server Side Code Injection</name>
    </scanner>
    <scanner id="40021" enabled="true" level="MEDIUM" strength="MEDIUM">
        <name>XML External Entity Attack</name>
    </scanner>
</scanners>
```

#### 3. Baseline Scan (Quick Assessment)

```bash
# Docker-based baseline scan
docker run -t zaproxy/zap-stable zap-baseline.py -t https://staging.flamoral.com

# Generate HTML report
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable zap-baseline.py \
    -t https://staging.flamoral.com \
    -r flamoral_baseline_report.html
```

#### 4. Full Scan (Comprehensive)

```bash
# Docker-based full scan
docker run -t zaproxy/zap-stable zap-full-scan.py -t https://staging.flamoral.com

# With authentication
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable zap-full-scan.py \
    -t https://staging.flamoral.com \
    -U test@flamoral.com \
    -P TestPassword123! \
    -r flamoral_full_report.html
```

---

### ZAP API Scanning

For API endpoints:

```bash
# Import OpenAPI/Swagger definition
# GUI: Import > Import an OpenAPI definition from a URL
# URL: https://api.staging.flamoral.com/swagger.json

# Or import from file
zap-cli open-api -f /path/to/swagger.json

# Scan API endpoints
zap-cli active-scan https://api.staging.flamoral.com
```

---

### ZAP Automation Framework

**Automation File**: `flamoral_automation.yaml`
```yaml
env:
  contexts:
    - name: "Flamoral"
      urls:
        - "https://staging.flamoral.com"
      includePaths:
        - "https://staging.flamoral.com/.*"
      excludePaths:
        - "https://staging.flamoral.com/logout.*"
      authentication:
        method: "form"
        parameters:
          loginUrl: "https://staging.flamoral.com/api/auth/login"
          loginRequestData: "username={%username%}&password={%password%}"
        verification:
          method: "response"
          loggedInRegex: "\\QaccessToken\\E"
          loggedOutRegex: "\\Qerror\\E.*\\QUnauthorized\\E"
      users:
        - name: "testuser"
          credentials:
            username: "security-test@flamoral.com"
            password: "SecureTestPass123!"

jobs:
  - type: spider
    parameters:
      context: "Flamoral"
      user: "testuser"
      maxDuration: 10

  - type: spiderAjax
    parameters:
      context: "Flamoral"
      user: "testuser"
      maxDuration: 10

  - type: passiveScan-wait
    parameters:
      maxDuration: 5

  - type: activeScan
    parameters:
      context: "Flamoral"
      user: "testuser"
      policy: "API-Scan"

  - type: report
    parameters:
      template: "traditional-html"
      reportDir: "/zap/wrk"
      reportFile: "flamoral-security-report"
      reportTitle: "Flamoral Security Test Report"
      reportDescription: "Automated security scan of Flamoral platform"
```

Run automation:
```bash
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
    zap.sh -cmd -autorun /zap/wrk/flamoral_automation.yaml
```

---

### Best Practices

1. **Rate Limiting**: Configure delays to avoid overwhelming server
   ```bash
   # In ZAP Options
   Options > Connection > Number of threads: 5
   Options > Active Scan > Delay when scanning (ms): 100
   ```

2. **Scope Management**: Always define clear scope to avoid scanning out-of-scope systems

3. **Session Persistence**: Use session scripts to maintain authentication

4. **False Positive Management**: Review and mark false positives

5. **Regular Updates**: Keep ZAP updated with latest plugins
   ```bash
   # Check for updates
   Help > Check for Updates
   ```

---

## Burp Suite Setup

**Burp Suite** is an integrated platform for security testing of web applications.

### Installation

#### Burp Suite Community Edition (Free)
```bash
# Download from
https://portswigger.net/burp/communitydownload

# Windows: Run installer
# macOS: Open DMG and drag to Applications
# Linux: java -jar burpsuite_community.jar
```

#### Burp Suite Professional (Recommended)
- License required
- Advanced scanning capabilities
- Better performance
- More features (Intruder, Scanner, Extensions)

---

### Configuration

#### 1. Proxy Setup

**Burp Proxy Listener**:
```
Proxy > Options > Proxy Listeners
- Running: Yes
- Bind to address: 127.0.0.1
- Port: 8080
- Support invisible proxying: Yes
```

**Browser Configuration** (Same as ZAP):
- HTTP Proxy: `localhost:8080`
- Use for all protocols

#### 2. SSL Certificate Installation

```bash
# Access Burp in browser
http://burp

# Download CA Certificate
# Import to browser (same process as ZAP)

# For command-line tools
export SSL_CERT_FILE=/path/to/cacert.der
```

#### 3. Target Scope

```
Target > Scope > Add
- Protocol: https
- Host or IP range: .*\.flamoral\.com
- Port: ^443$
- File: .*
```

**Advanced Scope Configuration**:
```regex
Include in scope:
  ^https://staging\.flamoral\.com.*
  ^https://security-test\.flamoral\.com.*
  ^https://api\.staging\.flamoral\.com.*
  ^wss://ws\.staging\.flamoral\.com.*

Exclude from scope:
  ^https://.*\.flamoral\.com/logout.*
  ^https://.*\.flamoral\.com/cdn-cgi/.*
  ^https://.*\.google\.com.*
  ^https://.*\.facebook\.com.*
```

#### 4. Session Handling

**Session Handling Rules**:
```
Project options > Sessions > Session Handling Rules > Add

Rule Actions:
  1. Use cookies from Burp's cookie jar
  2. Run macro to get fresh token

Macro:
  1. GET https://staging.flamoral.com/api/auth/verify
  2. Extract JWT from response
  3. Add to subsequent requests
```

**Macro Configuration**:
```
Project options > Sessions > Macros > Add

Request sequence:
1. GET https://staging.flamoral.com/
2. POST https://staging.flamoral.com/api/auth/login
   - Parameters: username=test&password=pass
   - Extract: accessToken from JSON response

Custom parameter location:
  - Header: Authorization
  - Value: Bearer [accessToken]
```

---

### Testing Procedures

#### 1. Manual Testing (Repeater)

```
1. Intercept request in Proxy
2. Right-click > Send to Repeater
3. Modify request parameters
4. Send request
5. Analyze response
6. Document findings
```

**Common Repeater Tests**:
- SQL Injection: Modify parameters with SQL payloads
- XSS: Inject JavaScript payloads
- IDOR: Change user IDs
- Authentication bypass: Modify JWT tokens

#### 2. Automated Scanning (Scanner)

```
Scanner > New Scan
- Scan type: Crawl and audit
- Scan configuration: Default
- Application login: Configure recorded login
- Start scan
```

**Custom Scan Configuration**:
```
Scanner > Scan configurations > New
- Crawl: Thorough
- Audit:
  - SQL Injection: High accuracy
  - XSS: Thorough
  - File path traversal: Enabled
  - OS command injection: Enabled
```

#### 3. Intruder (Professional Only)

**Use Cases**:
- Brute force attacks
- Fuzzing parameters
- Parameter enumeration
- Token testing

**Configuration**:
```
1. Send request to Intruder
2. Select attack type:
   - Sniper: Single payload position
   - Battering ram: Same payload in all positions
   - Pitchfork: Multiple payloads in sequence
   - Cluster bomb: All combinations
3. Configure payload:
   - Simple list
   - Numbers (sequential)
   - Custom iterator
4. Set options:
   - Threads: 5-10
   - Throttle: 100ms delay
5. Start attack
```

**Example: IDOR Testing**:
```http
GET /api/users/§1§/profile HTTP/1.1
Host: staging.flamoral.com
Authorization: Bearer eyJhbGc...

Payload:
  Numbers from 1 to 1000
  Step: 1
```

#### 4. Collaborator (Professional Only)

For testing blind vulnerabilities (SSRF, XXE, etc.):

```
1. Burp > Burp Collaborator client
2. Copy to clipboard (generates unique domain)
3. Use in payloads:
   - SSRF: http://[burp-collaborator-id].burpcollaborator.net
   - XXE: <!ENTITY xxe SYSTEM "http://[id].burpcollaborator.net">
4. Poll for interactions
```

---

### Burp Extensions

Install useful extensions:

```
Extender > BApp Store

Recommended Extensions:
  ✓ Autorize - Authorization testing
  ✓ JWT Editor - JWT manipulation
  ✓ JSON Web Tokens - JWT analysis
  ✓ Param Miner - Parameter discovery
  ✓ Upload Scanner - File upload testing
  ✓ Active Scan++ - Enhanced scanning
  ✓ Turbo Intruder - High-speed attacks
  ✓ Retire.js - Vulnerable JS library detection
  ✓ Software Version Reporter - Technology identification
```

#### Extension: Autorize

Automated authorization testing:

```
1. Install Autorize extension
2. Configure:
   - Autorize Configuration
   - Add low-privilege user token
   - Add high-privilege user token
3. Enable interception
4. Browse as high-privilege user
5. Autorize tests with low-privilege token
6. Review results for authorization bypasses
```

#### Extension: JWT Editor

JWT token manipulation:

```
1. Install JWT Editor
2. Intercept request with JWT
3. JWT Editor > JSON Web Tokens tab
4. Modify claims (e.g., role: "admin")
5. Sign with key (or use "none" algorithm)
6. Send modified request
```

---

### Burp Suite Professional Features

#### 1. Scanner (Active)

```bash
# Scan specific URLs
Scanner > New scan
- URLs to scan: https://staging.flamoral.com
- Scan configuration: Default
- Application login: Recorded sequence

# Scan from proxy history
Proxy > HTTP History
- Right-click > Scan
```

#### 2. Live Passive Crawl

```
Scanner > Live passive crawl
- From Proxy (all traffic)
- Automatically discover new endpoints
```

#### 3. Content Discovery

```
Target > Site map
- Right-click on host
- Engagement tools > Discover content
- Session token handling: Copy from suite
- Start
```

---

### Best Practices

1. **Project Files**: Save progress regularly
   ```
   Burp > Project > Save project
   ```

2. **Scope**: Always set clear scope to avoid testing out-of-scope systems

3. **Rate Limiting**: Configure resource pool to avoid overwhelming servers
   ```
   Project options > Resource Pool
   - Maximum concurrent requests: 10
   - Delay between requests: 100ms
   ```

4. **Issue Definitions**: Understand Burp's severity ratings
   - High: Critical vulnerabilities
   - Medium: Significant security issues
   - Low: Minor issues or informational
   - Information: No direct security impact

5. **False Positives**: Manually verify all findings before reporting

---

## Nuclei Templates

**Nuclei** is a fast, template-based vulnerability scanner.

### Installation

```bash
# Using Go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Using Homebrew (macOS/Linux)
brew install nuclei

# Using Docker
docker pull projectdiscovery/nuclei:latest

# Binary download
https://github.com/projectdiscovery/nuclei/releases
```

### Update Templates

```bash
# Update to latest templates
nuclei -update-templates

# Template location
~/.local/nuclei-templates/ (Linux/macOS)
C:\Users\<username>\.nuclei-templates\ (Windows)
```

---

### Basic Usage

```bash
# Scan single URL
nuclei -u https://staging.flamoral.com

# Scan multiple URLs from file
nuclei -list urls.txt

# Scan with specific severity
nuclei -u https://staging.flamoral.com -severity critical,high

# Scan with specific tags
nuclei -u https://staging.flamoral.com -tags cve,owasp

# Scan with specific templates
nuclei -u https://staging.flamoral.com -t nuclei-templates/cves/
```

---

### Advanced Usage

#### 1. Custom Templates

**File**: `flamoral-custom-checks.yaml`
```yaml
id: flamoral-api-exposure

info:
  name: Flamoral API Key Exposure
  author: security-team
  severity: high
  description: Detects exposed API keys in JavaScript files
  tags: flamoral,apikey,exposure

requests:
  - method: GET
    path:
      - "{{BaseURL}}/static/js/main.*.js"
      - "{{BaseURL}}/static/js/chunk.*.js"

    matchers-condition: and
    matchers:
      - type: regex
        regex:
          - 'api[_-]?key[\s]*[:=][\s]*["\'][a-zA-Z0-9]{32,}["\']'
          - 'secret[_-]?key[\s]*[:=][\s]*["\'][a-zA-Z0-9]{32,}["\']'
        part: body

      - type: status
        status:
          - 200

    extractors:
      - type: regex
        name: api_key
        regex:
          - 'api[_-]?key[\s]*[:=][\s]*["\']([a-zA-Z0-9]{32,})["\']'
        group: 1
```

Run custom template:
```bash
nuclei -u https://staging.flamoral.com -t flamoral-custom-checks.yaml
```

#### 2. Workflow Templates

**File**: `flamoral-workflow.yaml`
```yaml
id: flamoral-security-workflow

info:
  name: Flamoral Comprehensive Security Scan
  author: security-team

workflows:
  - template: nuclei-templates/http/technologies/tech-detect.yaml
  - template: nuclei-templates/http/exposures/
  - template: nuclei-templates/http/vulnerabilities/
  - template: nuclei-templates/http/cves/
    subtemplates:
      - tags: cve2023,cve2024
  - template: nuclei-templates/http/default-logins/
  - template: nuclei-templates/http/misconfiguration/
  - template: nuclei-templates/http/takeovers/
```

Run workflow:
```bash
nuclei -u https://staging.flamoral.com -w flamoral-workflow.yaml
```

#### 3. Rate Limited Scanning

```bash
# Limit requests per second
nuclei -u https://staging.flamoral.com -rate-limit 10

# Limit concurrent requests
nuclei -u https://staging.flamoral.com -c 5

# Add delay between requests (milliseconds)
nuclei -u https://staging.flamoral.com -rate-limit 10 -rate-limit-duration 1
```

#### 4. Authentication

```bash
# Using headers
nuclei -u https://api.staging.flamoral.com -H "Authorization: Bearer eyJhbGc..."

# Using cookie
nuclei -u https://staging.flamoral.com -H "Cookie: session=abc123..."

# Multiple headers
nuclei -u https://staging.flamoral.com \
  -H "Authorization: Bearer token" \
  -H "X-API-Key: key123"
```

---

### Flamoral-Specific Scans

#### 1. CVE Scanning
```bash
# Scan for known CVEs
nuclei -u https://staging.flamoral.com \
  -t nuclei-templates/cves/ \
  -severity critical,high \
  -o flamoral-cve-scan.txt
```

#### 2. Technology Detection
```bash
# Detect technologies in use
nuclei -u https://staging.flamoral.com \
  -t nuclei-templates/http/technologies/ \
  -json -o flamoral-tech-stack.json
```

#### 3. Misconfiguration Scanning
```bash
# Scan for misconfigurations
nuclei -u https://staging.flamoral.com \
  -t nuclei-templates/http/misconfiguration/ \
  -severity high,critical
```

#### 4. Exposed Panels
```bash
# Scan for exposed admin panels
nuclei -u https://staging.flamoral.com \
  -t nuclei-templates/http/exposed-panels/ \
  -t nuclei-templates/http/default-logins/
```

#### 5. API Security
```bash
# API-specific scanning
nuclei -u https://api.staging.flamoral.com \
  -t nuclei-templates/http/exposures/apis/ \
  -t nuclei-templates/http/vulnerabilities/generic/
```

---

### Output and Reporting

```bash
# JSON output
nuclei -u https://staging.flamoral.com -json -o results.json

# Markdown report
nuclei -u https://staging.flamoral.com -markdown-export report.md

# SARIF format (for GitHub)
nuclei -u https://staging.flamoral.com -sarif-export results.sarif

# Multiple formats
nuclei -u https://staging.flamoral.com \
  -json -o results.json \
  -markdown-export report.md \
  -sarif-export results.sarif
```

---

### Nuclei Best Practices

1. **Update Regularly**: Templates are updated frequently
   ```bash
   nuclei -update-templates
   ```

2. **Filter by Severity**: Focus on critical/high for initial scans
   ```bash
   nuclei -u URL -severity critical,high
   ```

3. **Use Rate Limiting**: Avoid overwhelming servers
   ```bash
   nuclei -u URL -rate-limit 10 -c 5
   ```

4. **Validate Results**: Many findings are informational, verify exploitability

5. **Custom Templates**: Create organization-specific checks

---

## SQLMap Usage

**SQLMap** is an automated SQL injection detection and exploitation tool.

### Installation

```bash
# Clone from GitHub
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap-dev
cd sqlmap-dev

# Run
python sqlmap.py

# Or install via package manager
apt-get install sqlmap  # Debian/Ubuntu
brew install sqlmap     # macOS
```

---

### Basic Usage

```bash
# Test URL for SQL injection
sqlmap -u "https://staging.flamoral.com/api/users?id=1"

# Test with POST data
sqlmap -u "https://staging.flamoral.com/api/auth/login" \
  --data="username=admin&password=test"

# Test specific parameter
sqlmap -u "https://staging.flamoral.com/api/users?id=1&name=test" \
  -p id
```

---

### Advanced Usage

#### 1. Authentication

**Cookie-Based**:
```bash
sqlmap -u "https://staging.flamoral.com/api/users?id=1" \
  --cookie="session=abc123xyz"
```

**JWT Token**:
```bash
sqlmap -u "https://api.staging.flamoral.com/users?id=1" \
  --headers="Authorization: Bearer eyJhbGc..."
```

**Form-Based Login**:
```bash
sqlmap -u "https://staging.flamoral.com/search?q=test" \
  --auth-type=Basic \
  --auth-cred="user:pass"
```

#### 2. Request from File (Burp Suite)

```bash
# Save request from Burp Suite
Right-click request > Copy to file > request.txt

# Test with SQLMap
sqlmap -r request.txt

# Test specific parameter
sqlmap -r request.txt -p username
```

**Example request.txt**:
```http
POST /api/auth/login HTTP/1.1
Host: staging.flamoral.com
Content-Type: application/json
Content-Length: 45

{"username":"admin","password":"test123"}
```

#### 3. Database Enumeration

```bash
# Enumerate databases
sqlmap -u "URL" --dbs

# Enumerate tables in database
sqlmap -u "URL" -D flamoral --tables

# Enumerate columns in table
sqlmap -u "URL" -D flamoral -T users --columns

# Dump table data
sqlmap -u "URL" -D flamoral -T users --dump

# Dump specific columns
sqlmap -u "URL" -D flamoral -T users -C username,email,password_hash --dump
```

#### 4. Advanced Techniques

**Time-Based Blind SQLi**:
```bash
sqlmap -u "URL" --technique=T --time-sec=5
```

**Union-Based SQLi**:
```bash
sqlmap -u "URL" --technique=U
```

**Boolean-Based Blind SQLi**:
```bash
sqlmap -u "URL" --technique=B
```

**Stacked Queries**:
```bash
sqlmap -u "URL" --technique=S
```

**All Techniques**:
```bash
sqlmap -u "URL" --technique=BEUSTQ
```

#### 5. DBMS-Specific

```bash
# Specify DBMS (faster)
sqlmap -u "URL" --dbms=PostgreSQL
sqlmap -u "URL" --dbms=MySQL
sqlmap -u "URL" --dbms=MongoDB

# OS shell (if db user has privileges)
sqlmap -u "URL" --os-shell

# SQL shell
sqlmap -u "URL" --sql-shell
```

---

### Flamoral-Specific Testing

#### 1. Authentication Endpoints
```bash
# Login endpoint
sqlmap -u "https://staging.flamoral.com/api/auth/login" \
  --data='{"username":"admin","password":"test"}' \
  --headers="Content-Type: application/json" \
  -p username,password \
  --batch --level=5 --risk=3
```

#### 2. Search Functionality
```bash
# Search injection
sqlmap -u "https://staging.flamoral.com/api/search?q=test&age=25" \
  --cookie="session=xyz" \
  -p q,age \
  --batch
```

#### 3. Profile Endpoints
```bash
# User profile
sqlmap -u "https://staging.flamoral.com/api/users/1/profile" \
  --headers="Authorization: Bearer TOKEN" \
  --batch
```

#### 4. Filter Parameters
```bash
# Match filters
sqlmap -u "https://staging.flamoral.com/api/matches?minAge=18&maxAge=35&distance=50" \
  --cookie="session=xyz" \
  -p minAge,maxAge,distance \
  --batch
```

---

### SQLMap Configuration

**Config File**: `sqlmap.conf`
```ini
[Target]
url = https://staging.flamoral.com/api/users?id=1

[Request]
cookie = session=abc123
headers = Authorization: Bearer eyJhbGc...
method = GET

[Optimization]
threads = 5
keep-alive = True

[Detection]
level = 3
risk = 2
technique = BEUST

[General]
batch = True
verbose = 1
```

Use config:
```bash
sqlmap -c sqlmap.conf
```

---

### Best Practices

1. **Start Conservative**: Begin with level=1, risk=1
   ```bash
   sqlmap -u "URL" --level=1 --risk=1
   ```

2. **Increase Gradually**: Only increase if needed
   ```bash
   sqlmap -u "URL" --level=5 --risk=3
   ```

3. **Batch Mode**: Avoid interactive prompts
   ```bash
   sqlmap -u "URL" --batch
   ```

4. **Rate Limiting**: Avoid overwhelming server
   ```bash
   sqlmap -u "URL" --delay=2 --threads=1
   ```

5. **Test Specific Parameters**: Faster and more focused
   ```bash
   sqlmap -u "URL" -p id,username
   ```

6. **Save Progress**: SQLMap caches results
   ```bash
   # Results saved in ~/.sqlmap/output/
   ```

7. **False Positives**: Manually verify findings

---

## Nmap Scanning Procedures

**Nmap** is a network discovery and security auditing tool.

### Installation

```bash
# Linux
sudo apt-get install nmap

# macOS
brew install nmap

# Windows
# Download from https://nmap.org/download.html
```

---

### Basic Scanning

```bash
# Basic port scan
nmap staging.flamoral.com

# Scan specific ports
nmap -p 80,443,8080 staging.flamoral.com

# Scan port range
nmap -p 1-1000 staging.flamoral.com

# Scan all ports
nmap -p- staging.flamoral.com
```

---

### Advanced Scanning

#### 1. Service Version Detection
```bash
# Detect service versions
nmap -sV staging.flamoral.com

# Aggressive version detection
nmap -sV --version-intensity 9 staging.flamoral.com
```

#### 2. OS Detection
```bash
# OS fingerprinting
sudo nmap -O staging.flamoral.com

# Aggressive OS detection
sudo nmap -O --osscan-guess staging.flamoral.com
```

#### 3. Script Scanning
```bash
# Default scripts
nmap -sC staging.flamoral.com

# Specific script
nmap --script=ssl-enum-ciphers -p 443 staging.flamoral.com

# Multiple scripts
nmap --script=http-title,http-headers staging.flamoral.com
```

#### 4. Comprehensive Scan
```bash
# Aggressive scan (combines many options)
sudo nmap -A staging.flamoral.com

# Custom comprehensive scan
sudo nmap -sS -sV -sC -O -p- -T4 staging.flamoral.com \
  -oA flamoral_comprehensive_scan
```

---

### Flamoral Infrastructure Scanning

#### 1. Web Server Scan
```bash
# Scan web servers
nmap -sV -p 80,443,8080,8443 \
  --script=http-title,http-headers,ssl-cert,ssl-enum-ciphers \
  staging.flamoral.com \
  -oN flamoral_web_scan.txt
```

#### 2. API Server Scan
```bash
# Scan API servers
nmap -sV -p 443,8443 \
  --script=ssl-cert,ssl-enum-ciphers,http-methods \
  api.staging.flamoral.com \
  -oN flamoral_api_scan.txt
```

#### 3. Database Server Scan (Internal Only)
```bash
# PostgreSQL (if accessible)
nmap -sV -p 5432 --script=pgsql-brute db.internal.flamoral.com

# MongoDB (if accessible)
nmap -sV -p 27017 --script=mongodb-databases,mongodb-info \
  mongodb.internal.flamoral.com
```

#### 4. SSL/TLS Security
```bash
# SSL/TLS cipher scan
nmap --script ssl-enum-ciphers -p 443 staging.flamoral.com

# SSL certificate check
nmap --script ssl-cert -p 443 staging.flamoral.com

# SSL vulnerabilities
nmap --script ssl-known-key,ssl-heartbleed,ssl-poodle \
  -p 443 staging.flamoral.com
```

---

### Nmap Scripting Engine (NSE)

#### Useful Scripts for Web Apps

```bash
# HTTP enumeration
nmap --script http-enum staging.flamoral.com

# HTTP methods
nmap --script http-methods staging.flamoral.com

# HTTP security headers
nmap --script http-security-headers -p 443 staging.flamoral.com

# HTTP CORS
nmap --script http-cors -p 443 staging.flamoral.com

# HTTP credentials
nmap --script http-default-accounts staging.flamoral.com

# Vulnerabilities
nmap --script vuln -p 443 staging.flamoral.com
```

---

### Output Formats

```bash
# Normal output
nmap staging.flamoral.com -oN scan.txt

# XML output
nmap staging.flamoral.com -oX scan.xml

# Grepable output
nmap staging.flamoral.com -oG scan.grep

# All formats
nmap staging.flamoral.com -oA flamoral_scan
```

---

### Best Practices

1. **Authorization**: Only scan authorized systems

2. **Rate Limiting**: Use timing options
   ```bash
   # Paranoid (slowest)
   nmap -T0 staging.flamoral.com

   # Polite
   nmap -T2 staging.flamoral.com

   # Normal (default)
   nmap -T3 staging.flamoral.com

   # Aggressive
   nmap -T4 staging.flamoral.com
   ```

3. **Stealth**: Use SYN scan (requires root)
   ```bash
   sudo nmap -sS staging.flamoral.com
   ```

4. **Fragmentation**: Evade basic firewalls
   ```bash
   nmap -f staging.flamoral.com
   ```

5. **Targeted Scanning**: Scan only necessary ports
   ```bash
   nmap -p 80,443 --top-ports 100 staging.flamoral.com
   ```

---

## Mobile Testing Tools

### MobSF (Mobile Security Framework)

**Purpose**: Automated mobile app security assessment

#### Installation (Docker)

```bash
# Pull MobSF image
docker pull opensecurity/mobile-security-framework-mobsf

# Run MobSF
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# Access
http://localhost:8000
```

#### Usage

1. **Upload APK/IPA**:
   - Navigate to http://localhost:8000
   - Upload Flamoral.apk or Flamoral.ipa
   - Wait for analysis to complete

2. **Review Results**:
   - Security score
   - Hardcoded secrets
   - Insecure data storage
   - Insecure communication
   - Code quality issues
   - Manifest analysis
   - Binary analysis

3. **Static Analysis**:
   - Decompiled code review
   - String analysis
   - Certificate pinning check
   - Root detection check

4. **Dynamic Analysis** (Android only):
   - Runtime instrumentation
   - Network traffic analysis
   - File system monitoring

---

### Frida

**Purpose**: Dynamic instrumentation toolkit

#### Installation

```bash
# Install Frida tools
pip install frida-tools

# Check version
frida --version
```

#### Setup for Android

```bash
# List devices
frida-ls-devices

# List apps on device
frida-ps -Uai

# Attach to Flamoral app
frida -U -n "com.flamoral.app"
```

#### Hooking Examples

**Hook Login Function**:
```javascript
// File: hook-login.js
Java.perform(function() {
    var LoginActivity = Java.use('com.flamoral.app.LoginActivity');

    LoginActivity.performLogin.implementation = function(username, password) {
        console.log('[+] Login attempt:');
        console.log('    Username: ' + username);
        console.log('    Password: ' + password);

        // Call original implementation
        return this.performLogin(username, password);
    };
});
```

Run:
```bash
frida -U -l hook-login.js -f com.flamoral.app
```

**Bypass SSL Pinning**:
```javascript
// File: bypass-ssl-pinning.js
Java.perform(function() {
    var CertificatePinner = Java.use('okhttp3.CertificatePinner');

    CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(hostname, peerCertificates) {
        console.log('[+] SSL Pinning bypass for: ' + hostname);
        return;
    };
});
```

**Dump JWT Tokens**:
```javascript
// File: dump-tokens.js
Java.perform(function() {
    var SharedPreferences = Java.use('android.content.SharedPreferences');

    SharedPreferences.getString.overload('java.lang.String', 'java.lang.String').implementation = function(key, defaultValue) {
        var value = this.getString(key, defaultValue);
        if (key.includes('token') || key.includes('jwt')) {
            console.log('[+] Token found:');
            console.log('    Key: ' + key);
            console.log('    Value: ' + value);
        }
        return value;
    };
});
```

---

### Objection

**Purpose**: Runtime mobile exploration toolkit (built on Frida)

#### Installation

```bash
pip install objection
```

#### Usage

```bash
# Start objection
objection -g com.flamoral.app explore

# Inside objection shell

# List activities
android hooking list activities

# List services
android hooking list services

# Dump keystore
android keystore list

# Bypass root detection
android root disable

# Bypass SSL pinning
android sslpinning disable

# Dump local storage
android storage list

# Read SQLite database
android sqlite connect /data/data/com.flamoral.app/databases/flamoral.db
.tables
SELECT * FROM users;

# Dump memory
memory dump all flamoral-dump

# Search memory
memory search "api_key" --string

# Watch method
android hooking watch class_method com.flamoral.app.NetworkManager.makeRequest --dump-args --dump-return
```

---

### APK Analysis Tools

#### apktool

```bash
# Install
brew install apktool  # macOS
apt-get install apktool  # Linux

# Decompile APK
apktool d Flamoral.apk -o flamoral-decompiled

# Browse resources
cd flamoral-decompiled
ls -la

# Check AndroidManifest.xml
cat AndroidManifest.xml

# Rebuild APK (after modifications)
apktool b flamoral-decompiled -o Flamoral-modified.apk
```

#### dex2jar

```bash
# Convert APK to JAR
d2j-dex2jar Flamoral.apk -o Flamoral.jar

# Decompile JAR with JD-GUI
jd-gui Flamoral.jar
```

#### jadx

```bash
# Install
brew install jadx  # macOS

# Decompile APK to Java source
jadx Flamoral.apk -d flamoral-source

# View source
cd flamoral-source
find . -name "*.java" | head
```

---

### iOS Testing Tools

#### iOS SSL Kill Switch

```bash
# Install on jailbroken device
# Add Cydia source: https://julioverne.github.io/
# Install "SSL Kill Switch 2"
# Enable in Settings
```

#### Hopper Disassembler

```bash
# Commercial tool for reverse engineering iOS apps
# Download from https://www.hopperapp.com/

# Load IPA file
# Analyze binary
# View pseudocode
```

#### iExplorer / iFunBox

```bash
# Browse iOS file system
# View app sandbox
# Extract app data
# View SQLite databases
```

---

### Mobile Security Testing Workflow

1. **Static Analysis**:
   ```bash
   # Upload to MobSF
   # Review security findings
   # Extract APK/IPA
   # Decompile with apktool/jadx
   # Review AndroidManifest.xml / Info.plist
   # Search for hardcoded secrets
   ```

2. **Dynamic Analysis**:
   ```bash
   # Setup proxy (Burp/ZAP)
   # Bypass SSL pinning (Frida/Objection)
   # Intercept traffic
   # Test authentication
   # Test authorization
   # Test data storage
   ```

3. **Runtime Instrumentation**:
   ```bash
   # Hook functions with Frida
   # Bypass security checks
   # Extract sensitive data
   # Modify app behavior
   ```

---

## Additional Security Tools

### Web Application Scanners

#### Nikto
```bash
# Install
apt-get install nikto

# Basic scan
nikto -h https://staging.flamoral.com

# Comprehensive scan
nikto -h https://staging.flamoral.com -Tuning 123bde -Format htm -output flamoral-nikto.html
```

#### WPScan (if WordPress used)
```bash
# Install
gem install wpscan

# Scan
wpscan --url https://blog.flamoral.com --enumerate u,p,t
```

---

### API Testing Tools

#### Postman

**Collection**: `Flamoral-API-Security-Tests.postman_collection.json`
```json
{
  "info": {
    "name": "Flamoral API Security Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication Tests",
      "item": [
        {
          "name": "SQL Injection in Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"admin' OR '1'='1\",\n  \"password\": \"test\"\n}"
            },
            "url": {
              "raw": "https://api.staging.flamoral.com/auth/login",
              "protocol": "https",
              "host": ["api", "staging", "flamoral", "com"],
              "path": ["auth", "login"]
            }
          }
        }
      ]
    }
  ]
}
```

#### REST API Fuzzer (RESTler)
```bash
# Install
git clone https://github.com/microsoft/restler-fuzzer
cd restler-fuzzer
python3 ./build-restler.py --dest_dir ./build

# Compile API specification
./build/Restler compile --api_spec swagger.json

# Fuzz API
./build/Restler fuzz --grammar_file Compile/grammar.py --dictionary_file Compile/dict.json
```

---

### Code Analysis Tools

#### SonarQube
```bash
# Run with Docker
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts

# Scan project
sonar-scanner \
  -Dsonar.projectKey=flamoral \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=admin
```

#### Semgrep
```bash
# Install
pip install semgrep

# Scan for security issues
semgrep --config=auto .

# Scan with specific rules
semgrep --config=p/owasp-top-ten .

# Custom rule
semgrep --config=security-rules.yaml .
```

**Custom Rule**: `security-rules.yaml`
```yaml
rules:
  - id: hardcoded-jwt-secret
    pattern: |
      jwt.sign(..., "$SECRET")
    message: Hardcoded JWT secret detected
    severity: ERROR
    languages: [javascript, typescript]
```

#### Bandit (Python)
```bash
# Install
pip install bandit

# Scan Python code
bandit -r backend/ -f json -o bandit-report.json
```

---

### Container Security Tools

#### Trivy
```bash
# Install
brew install aquasecurity/trivy/trivy

# Scan Docker image
trivy image flamoral/api:latest

# Scan with HIGH and CRITICAL only
trivy image --severity HIGH,CRITICAL flamoral/api:latest

# Generate report
trivy image --format json --output trivy-report.json flamoral/api:latest
```

#### Docker Bench Security
```bash
# Clone repo
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security

# Run
sudo sh docker-bench-security.sh
```

#### Clair
```bash
# Run Clair with Docker Compose
docker-compose up -d

# Scan image
clairctl analyze flamoral/api:latest
```

---

### Infrastructure Scanning

#### tfsec
```bash
# Install
brew install tfsec

# Scan Terraform files
tfsec infrastructure/terraform/

# Custom checks
tfsec --custom-check-dir custom-checks/ infrastructure/terraform/
```

#### Checkov
```bash
# Install
pip install checkov

# Scan Terraform
checkov -d infrastructure/terraform/

# Scan Kubernetes manifests
checkov -d infrastructure/k8s/

# Scan Docker Compose
checkov -f docker-compose.yml
```

---

## Tool Integration with CI/CD

### GitHub Actions

**File**: `.github/workflows/security-scan.yml`
```yaml
name: Security Scanning

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  nuclei-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Nuclei Scan
        uses: projectdiscovery/nuclei-action@main
        with:
          target: https://staging.flamoral.com
          templates: nuclei-templates/
          output: nuclei-results.txt

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: nuclei-results
          path: nuclei-results.txt

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test
          args: --severity-threshold=high

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Semgrep Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/owasp-top-ten

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t flamoral/api:${{ github.sha }} .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: flamoral/api:${{ github.sha }}
          severity: 'CRITICAL,HIGH'
```

---

## Reporting and Documentation

### Evidence Collection

For each vulnerability found:

1. **Screenshot**: Capture proof-of-concept
2. **Request/Response**: Save HTTP traffic
3. **Steps**: Document reproduction steps
4. **Impact**: Describe potential impact
5. **Remediation**: Suggest fixes

### Tool Output Aggregation

```bash
# Create reports directory
mkdir -p security-reports/$(date +%Y-%m-%d)

# ZAP scan
docker run -v $(pwd)/security-reports:/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-baseline.py -t https://staging.flamoral.com \
  -r zap-report-$(date +%Y%m%d).html

# Nuclei scan
nuclei -u https://staging.flamoral.com \
  -severity critical,high \
  -json -o security-reports/$(date +%Y-%m-%d)/nuclei-results.json

# Nmap scan
nmap -sV -sC -p- staging.flamoral.com \
  -oA security-reports/$(date +%Y-%m-%d)/nmap-scan

# Trivy scan
trivy image --format json --output security-reports/$(date +%Y-%m-%d)/trivy-report.json \
  flamoral/api:latest
```

### Report Generation

**Aggregated Report Script**: `generate-report.sh`
```bash
#!/bin/bash

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_DIR="security-reports/$REPORT_DATE"

mkdir -p "$REPORT_DIR"

echo "Generating Security Report for $REPORT_DATE"

# Run all scans
echo "[+] Running ZAP baseline scan..."
docker run -v $(pwd)/$REPORT_DIR:/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-baseline.py -t https://staging.flamoral.com -r zap-report.html

echo "[+] Running Nuclei scan..."
nuclei -u https://staging.flamoral.com -severity critical,high \
  -json -o $REPORT_DIR/nuclei-results.json

echo "[+] Running Nmap scan..."
nmap -sV -sC -p 80,443 staging.flamoral.com -oA $REPORT_DIR/nmap-scan

echo "[+] Running Trivy container scan..."
trivy image --format json --output $REPORT_DIR/trivy-report.json \
  flamoral/api:latest

echo "[+] Report generation complete: $REPORT_DIR"
```

---

**Document Control**

- **Version**: 1.0
- **Classification**: Confidential - Internal Use Only
- **Next Review Date**: March 2026
- **Owner**: Security Team
- **Approved By**: CISO

---

*These tools and configurations are for authorized security testing only. Unauthorized use is prohibited.*
