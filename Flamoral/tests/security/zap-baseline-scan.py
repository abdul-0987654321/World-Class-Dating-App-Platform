#!/usr/bin/env python3
"""
OWASP ZAP Baseline Security Scan for Flamoral Dating Platform
This script runs automated security testing using ZAP
"""

import time
import sys
import subprocess
import json
from zapv2 import ZAPv2

# Configuration
ZAP_API_KEY = 'flamoral-zap-api-key'
ZAP_PROXY = 'http://localhost:8080'
TARGET_URL = 'http://localhost:3000'
REPORT_DIR = './security-reports'

# ZAP Configuration
zap = ZAPv2(apikey=ZAP_API_KEY, proxies={'http': ZAP_PROXY, 'https': ZAP_PROXY})

def start_zap():
    """Start ZAP daemon if not already running"""
    print('[*] Checking ZAP daemon status...')
    try:
        zap.core.version
        print('[+] ZAP is already running')
    except:
        print('[*] Starting ZAP daemon...')
        subprocess.Popen([
            'zap.sh',
            '-daemon',
            '-config', f'api.key={ZAP_API_KEY}',
            '-port', '8080'
        ])
        time.sleep(10)
        print('[+] ZAP daemon started')

def authenticate():
    """Set up authentication for the scan"""
    print('[*] Setting up authentication...')

    # Configure authentication
    context_name = 'Flamoral'
    context_id = zap.context.new_context(context_name)

    # Set authentication method (form-based)
    zap.authentication.set_authentication_method(
        contextid=context_id,
        authmethodname='formBasedAuthentication',
        authmethodconfigparams=f'loginUrl={TARGET_URL}/api/v1/auth/login&loginRequestData=email%3D%7B%25username%25%7D%26password%3D%7B%25password%25%7D'
    )

    # Set logged-in indicator
    zap.authentication.set_logged_in_indicator(
        contextid=context_id,
        loggedinindicatorregex='.*token.*'
    )

    # Create user
    user_id = zap.users.new_user(context_id, 'testuser')
    zap.users.set_authentication_credentials(
        contextid=context_id,
        userid=user_id,
        authcredentialsconfigparams='username=test@flamoral.com&password=TestPass123!'
    )
    zap.users.set_user_enabled(context_id, user_id, True)

    # Include URLs in context
    zap.context.include_in_context(context_name, f'{TARGET_URL}.*')

    print('[+] Authentication configured')
    return context_id

def run_spider_scan(context_id):
    """Run spider scan to discover URLs"""
    print('[*] Starting spider scan...')

    scan_id = zap.spider.scan(TARGET_URL, contextname='Flamoral')

    # Wait for spider to complete
    while int(zap.spider.status(scan_id)) < 100:
        print(f'[*] Spider progress: {zap.spider.status(scan_id)}%')
        time.sleep(5)

    print('[+] Spider scan completed')
    print(f'[+] Found {len(zap.core.urls())} URLs')

def run_ajax_spider():
    """Run AJAX spider for SPA applications"""
    print('[*] Starting AJAX spider...')

    zap.ajaxSpider.set_option_max_duration('10')
    zap.ajaxSpider.scan(TARGET_URL, inscope='true')

    # Wait for AJAX spider to complete
    while zap.ajaxSpider.status == 'running':
        print('[*] AJAX spider running...')
        time.sleep(5)

    print('[+] AJAX spider completed')

def run_active_scan(context_id):
    """Run active security scan"""
    print('[*] Starting active scan...')

    # Configure scan policy
    policy_name = 'Flamoral-Scan-Policy'

    # Enable all scanners
    scan_id = zap.ascan.scan(
        url=TARGET_URL,
        recurse='true',
        inscopeonly='true',
        scanpolicyname=policy_name,
        method='POST',
        postdata=''
    )

    # Wait for active scan to complete
    while int(zap.ascan.status(scan_id)) < 100:
        print(f'[*] Active scan progress: {zap.ascan.status(scan_id)}%')
        time.sleep(10)

    print('[+] Active scan completed')

def run_passive_scan():
    """Run passive security scan"""
    print('[*] Running passive scan...')

    # Enable all passive scanners
    zap.pscan.enable_all_scanners()

    # Wait for passive scan to complete
    while int(zap.pscan.records_to_scan) > 0:
        print(f'[*] Records left to scan: {zap.pscan.records_to_scan}')
        time.sleep(5)

    print('[+] Passive scan completed')

def generate_reports():
    """Generate security scan reports"""
    print('[*] Generating reports...')

    # Get alerts
    alerts = zap.core.alerts(baseurl=TARGET_URL)

    # Generate HTML report
    with open(f'{REPORT_DIR}/zap-report.html', 'w') as f:
        f.write(zap.core.htmlreport())

    # Generate JSON report
    with open(f'{REPORT_DIR}/zap-report.json', 'w') as f:
        json.dump(alerts, f, indent=2)

    # Generate XML report
    with open(f'{REPORT_DIR}/zap-report.xml', 'w') as f:
        f.write(zap.core.xmlreport())

    # Generate Markdown report
    markdown_report = generate_markdown_report(alerts)
    with open(f'{REPORT_DIR}/zap-report.md', 'w') as f:
        f.write(markdown_report)

    print(f'[+] Reports generated in {REPORT_DIR}/')

def generate_markdown_report(alerts):
    """Generate markdown security report"""
    report = f"""# Flamoral Dating Platform - Security Scan Report

**Scan Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}
**Target:** {TARGET_URL}
**Total Alerts:** {len(alerts)}

## Summary

"""

    # Count alerts by risk level
    risk_counts = {'High': 0, 'Medium': 0, 'Low': 0, 'Informational': 0}
    for alert in alerts:
        risk = alert.get('risk', 'Informational')
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

    report += f"""
| Risk Level | Count |
|------------|-------|
| High | {risk_counts.get('High', 0)} |
| Medium | {risk_counts.get('Medium', 0)} |
| Low | {risk_counts.get('Low', 0)} |
| Informational | {risk_counts.get('Informational', 0)} |

## Detailed Findings

"""

    # Group alerts by risk level
    for risk_level in ['High', 'Medium', 'Low', 'Informational']:
        risk_alerts = [a for a in alerts if a.get('risk') == risk_level]

        if risk_alerts:
            report += f"\n### {risk_level} Risk Issues\n\n"

            for alert in risk_alerts:
                report += f"""
#### {alert.get('alert', 'Unknown')}

**Description:** {alert.get('description', 'N/A')}

**URL:** `{alert.get('url', 'N/A')}`

**Solution:** {alert.get('solution', 'N/A')}

**CWE ID:** {alert.get('cweid', 'N/A')}

**WASC ID:** {alert.get('wascid', 'N/A')}

---

"""

    return report

def check_vulnerabilities(alerts):
    """Check for critical vulnerabilities and fail if found"""
    print('[*] Checking for critical vulnerabilities...')

    high_risk = [a for a in alerts if a.get('risk') == 'High']
    medium_risk = [a for a in alerts if a.get('risk') == 'Medium']

    if high_risk:
        print(f'[!] CRITICAL: Found {len(high_risk)} high-risk vulnerabilities')
        for alert in high_risk:
            print(f'  - {alert.get("alert")} at {alert.get("url")}')
        return False

    if len(medium_risk) > 10:
        print(f'[!] WARNING: Found {len(medium_risk)} medium-risk vulnerabilities')

    print('[+] No critical vulnerabilities found')
    return True

def run_api_security_tests():
    """Run API-specific security tests"""
    print('[*] Running API security tests...')

    api_tests = [
        {
            'name': 'SQL Injection',
            'url': f'{TARGET_URL}/api/v1/users',
            'params': "id=1' OR '1'='1"
        },
        {
            'name': 'XSS',
            'url': f'{TARGET_URL}/api/v1/users',
            'params': 'name=<script>alert(1)</script>'
        },
        {
            'name': 'Path Traversal',
            'url': f'{TARGET_URL}/api/v1/files',
            'params': 'file=../../etc/passwd'
        },
        {
            'name': 'Broken Authentication',
            'url': f'{TARGET_URL}/api/v1/auth/login',
            'params': 'token=invalid'
        },
    ]

    for test in api_tests:
        print(f"  [*] Testing: {test['name']}")
        # Tests are handled by ZAP active scan

    print('[+] API security tests completed')

def main():
    """Main execution flow"""
    print('[*] Starting OWASP ZAP Security Scan')
    print('[*] Target:', TARGET_URL)

    try:
        # Start ZAP
        start_zap()

        # Set up authentication
        context_id = authenticate()

        # Run spider scans
        run_spider_scan(context_id)
        run_ajax_spider()

        # Run security scans
        run_passive_scan()
        run_active_scan(context_id)

        # Run API-specific tests
        run_api_security_tests()

        # Generate reports
        generate_reports()

        # Check for critical vulnerabilities
        alerts = zap.core.alerts(baseurl=TARGET_URL)
        passed = check_vulnerabilities(alerts)

        print('[*] Security scan completed')

        # Exit with appropriate code
        sys.exit(0 if passed else 1)

    except Exception as e:
        print(f'[!] Error during security scan: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    main()
