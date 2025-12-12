// Azure Web Application Firewall Policy for Front Door
// Provides comprehensive protection against web vulnerabilities

param frontDoorName string
param environment string
param location string = 'Global'

// WAF Policy
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = {
  name: '${frontDoorName}-waf-policy'
  location: location
  tags: {
    Environment: environment
    Application: 'Flamoral'
    Service: 'WAF'
  }
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention' // Prevention mode blocks malicious requests
      requestBodyCheck: 'Enabled'
      maxRequestBodySizeInKb: 128
      fileUploadLimitInMb: 100
      customBlockResponseStatusCode: 403
      customBlockResponseBody: base64('{"error": "Access Denied", "message": "Your request was blocked by our security system."}')
    }

    // Custom rules for Flamoral-specific protections
    customRules: {
      rules: [
        // Rate limiting rules
        {
          name: 'RateLimitAuth'
          priority: 100
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 100
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              matchValue: [
                '/api/auth/login'
                '/api/auth/register'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
          action: 'Block'
        }
        {
          name: 'RateLimitAPI'
          priority: 110
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 1000
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'BeginsWith'
              matchValue: [
                '/api/'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
          action: 'Block'
        }

        // Geographic restrictions (optional - block certain countries)
        {
          name: 'GeoBlocking'
          priority: 200
          enabledState: 'Disabled' // Enable if needed
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              matchValue: [
                'CN' // China
                'RU' // Russia
                'KP' // North Korea
              ]
            }
          ]
          action: 'Block'
        }

        // Block suspicious user agents
        {
          name: 'BlockSuspiciousUserAgents'
          priority: 300
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestHeader'
              selector: 'User-Agent'
              operator: 'Contains'
              matchValue: [
                'sqlmap'
                'nikto'
                'masscan'
                'nmap'
                'zgrab'
                'python-requests'
                'curl'
                'wget'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
          action: 'Block'
        }

        // Block requests without User-Agent
        {
          name: 'RequireUserAgent'
          priority: 310
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestHeader'
              selector: 'User-Agent'
              operator: 'Equal'
              matchValue: [
                ''
              ]
            }
          ]
          action: 'Block'
        }

        // SQL Injection protection (custom patterns)
        {
          name: 'BlockSQLInjection'
          priority: 400
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'QueryString'
              operator: 'Contains'
              matchValue: [
                'union select'
                'drop table'
                'delete from'
                'insert into'
                '1=1'
                'or 1=1'
              ]
              transforms: [
                'Lowercase'
                'UrlDecode'
              ]
            }
          ]
          action: 'Block'
        }

        // XSS protection (custom patterns)
        {
          name: 'BlockXSS'
          priority: 410
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'QueryString'
              operator: 'Contains'
              matchValue: [
                '<script'
                'javascript:'
                'onerror='
                'onload='
              ]
              transforms: [
                'Lowercase'
                'UrlDecode'
                'HtmlEntityDecode'
              ]
            }
          ]
          action: 'Block'
        }

        // Path traversal protection
        {
          name: 'BlockPathTraversal'
          priority: 420
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              matchValue: [
                '../'
                '..\\'
                '/etc/passwd'
                '/windows/system32'
              ]
              transforms: [
                'Lowercase'
                'UrlDecode'
              ]
            }
          ]
          action: 'Block'
        }

        // Block sensitive file extensions
        {
          name: 'BlockSensitiveFiles'
          priority: 430
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'EndsWith'
              matchValue: [
                '.env'
                '.config'
                '.ini'
                '.log'
                '.bak'
                '.sql'
                '.db'
                '.git'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
          action: 'Block'
        }

        // Protect admin endpoints
        {
          name: 'ProtectAdminEndpoints'
          priority: 500
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              matchValue: [
                '/admin'
                '/api/admin'
              ]
              transforms: [
                'Lowercase'
              ]
            }
            {
              matchVariable: 'RequestHeader'
              selector: 'Authorization'
              operator: 'Equal'
              matchValue: [
                ''
              ]
            }
          ]
          action: 'Block'
        }

        // Block large payloads (potential DoS)
        {
          name: 'BlockLargePayloads'
          priority: 600
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestBodySize'
              operator: 'GreaterThan'
              matchValue: [
                '10485760' // 10MB
              ]
            }
          ]
          action: 'Block'
        }

        // Block requests with suspicious headers
        {
          name: 'BlockSuspiciousHeaders'
          priority: 700
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestHeader'
              selector: 'X-Forwarded-For'
              operator: 'Contains'
              matchValue: [
                '127.0.0.1'
                'localhost'
                '0.0.0.0'
              ]
            }
          ]
          action: 'Block'
        }
      ]
    }

    // Managed rules (OWASP Core Rule Set)
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
          exclusions: []
          ruleGroupOverrides: []
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleSetAction: 'Block'
          exclusions: []
          ruleGroupOverrides: [
            {
              ruleGroupName: 'GoodBots'
              rules: [
                {
                  ruleId: 'GoodBots'
                  enabledState: 'Enabled'
                  action: 'Allow'
                }
              ]
            }
            {
              ruleGroupName: 'BadBots'
              rules: [
                {
                  ruleId: 'BadBots'
                  enabledState: 'Enabled'
                  action: 'Block'
                }
              ]
            }
            {
              ruleGroupName: 'UnknownBots'
              rules: [
                {
                  ruleId: 'UnknownBots'
                  enabledState: 'Enabled'
                  action: 'Log' // Log unknown bots for analysis
                }
              ]
            }
          ]
        }
      ]
    }
  }
}

// Diagnostic settings for WAF logs
resource wafDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'waf-diagnostics'
  scope: wafPolicy
  properties: {
    logs: [
      {
        category: 'FrontDoorWebApplicationFirewallLog'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    workspaceId: '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.OperationalInsights/workspaces/flamoral-${environment}-logs'
  }
}

output wafPolicyId string = wafPolicy.id
output wafPolicyName string = wafPolicy.name
