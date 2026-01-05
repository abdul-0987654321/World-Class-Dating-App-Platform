#------------------------------------------------------------------------------
# Lambda@Edge Module for CloudFront
# Provides edge functions for request transformation, authentication, and A/B testing
#------------------------------------------------------------------------------

locals {
  function_prefix = "${var.project_name}-${var.environment}"

  # Common tags for all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "lambda-edge"
  }
}

#------------------------------------------------------------------------------
# IAM Role for Lambda@Edge Functions
#------------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_edge_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type = "Service"
      identifiers = [
        "lambda.amazonaws.com",
        "edgelambda.amazonaws.com"
      ]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_edge_role" {
  name               = "${local.function_prefix}-lambda-edge-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_edge_assume_role.json

  tags = local.common_tags
}

# Policy for CloudWatch Logs access
data "aws_iam_policy_document" "lambda_edge_logging" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:*:*:log-group:/aws/lambda/${local.function_prefix}-*",
      "arn:aws:logs:*:*:log-group:/aws/lambda/us-east-1.${local.function_prefix}-*"
    ]
  }
}

resource "aws_iam_role_policy" "lambda_edge_logging" {
  name   = "${local.function_prefix}-lambda-edge-logging"
  role   = aws_iam_role.lambda_edge_role.id
  policy = data.aws_iam_policy_document.lambda_edge_logging.json
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_edge_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

#------------------------------------------------------------------------------
# Request Transformation Lambda@Edge (Add Headers)
#------------------------------------------------------------------------------

data "archive_file" "request_transform" {
  type        = "zip"
  output_path = "${path.module}/files/request-transform.zip"

  source {
    content  = <<-EOF
'use strict';

/**
 * Lambda@Edge function for request transformation
 * Adds security headers and custom headers to requests
 */
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Add correlation ID for request tracing
  const correlationId = generateCorrelationId();
  headers['x-correlation-id'] = [{ key: 'X-Correlation-Id', value: correlationId }];

  // Add timestamp for request timing
  headers['x-request-time'] = [{ key: 'X-Request-Time', value: Date.now().toString() }];

  // Add edge location identifier
  const edgeLocation = event.Records[0].cf.config.distributionId;
  headers['x-edge-location'] = [{ key: 'X-Edge-Location', value: edgeLocation }];

  // Add custom project headers
  headers['x-project'] = [{ key: 'X-Project', value: '${var.project_name}' }];
  headers['x-environment'] = [{ key: 'X-Environment', value: '${var.environment}' }];

  // Normalize accept-encoding header for better cache hit ratio
  if (headers['accept-encoding']) {
    const acceptEncoding = headers['accept-encoding'][0].value;
    if (acceptEncoding.includes('br')) {
      headers['accept-encoding'] = [{ key: 'Accept-Encoding', value: 'br' }];
    } else if (acceptEncoding.includes('gzip')) {
      headers['accept-encoding'] = [{ key: 'Accept-Encoding', value: 'gzip' }];
    }
  }

  // Add device type detection based on User-Agent
  const userAgent = headers['user-agent'] ? headers['user-agent'][0].value : '';
  const deviceType = detectDeviceType(userAgent);
  headers['x-device-type'] = [{ key: 'X-Device-Type', value: deviceType }];

  return request;
};

/**
 * Generate a unique correlation ID for request tracing
 */
function generateCorrelationId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return 'edge-' + timestamp + '-' + randomPart;
}

/**
 * Detect device type from User-Agent string
 */
function detectDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();

  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      return 'tablet';
    }
    return 'mobile';
  }

  return 'desktop';
}
EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "request_transform" {
  filename         = data.archive_file.request_transform.output_path
  function_name    = "${local.function_prefix}-request-transform"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.request_transform.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 5
  memory_size      = 128
  publish          = true

  # Lambda@Edge must be deployed in us-east-1
  provider = aws.us_east_1

  tags = merge(local.common_tags, {
    Name     = "${local.function_prefix}-request-transform"
    Function = "request-transformation"
  })
}

resource "aws_cloudwatch_log_group" "request_transform" {
  name              = "/aws/lambda/${aws_lambda_function.request_transform.function_name}"
  retention_in_days = var.log_retention_days

  provider = aws.us_east_1

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# Authentication Lambda@Edge
#------------------------------------------------------------------------------

data "archive_file" "auth_edge" {
  count       = var.enable_auth_edge ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/files/auth-edge.zip"

  source {
    content  = <<-EOF
'use strict';

/**
 * Lambda@Edge function for authentication at the edge
 * Validates JWT tokens and API keys before requests reach origin
 */
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Skip authentication for public paths
  const publicPaths = [
    '/health',
    '/api/v1/public',
    '/static',
    '/favicon.ico',
    '/robots.txt',
    '/.well-known'
  ];

  const uri = request.uri;
  const isPublicPath = publicPaths.some(path => uri.startsWith(path));

  if (isPublicPath) {
    return request;
  }

  // Check for Authorization header
  const authHeader = headers['authorization'];
  const apiKeyHeader = headers['x-api-key'];

  // Validate JWT token if present
  if (authHeader && authHeader[0]) {
    const token = authHeader[0].value;

    if (token.startsWith('Bearer ')) {
      const jwt = token.substring(7);
      const validationResult = validateJWT(jwt);

      if (!validationResult.valid) {
        return generateUnauthorizedResponse('Invalid or expired token');
      }

      // Add user info headers for downstream services
      headers['x-user-id'] = [{ key: 'X-User-Id', value: validationResult.userId || 'unknown' }];
      headers['x-auth-type'] = [{ key: 'X-Auth-Type', value: 'jwt' }];

      return request;
    }
  }

  // Validate API key if present
  if (apiKeyHeader && apiKeyHeader[0]) {
    const apiKey = apiKeyHeader[0].value;
    const isValidApiKey = validateApiKey(apiKey);

    if (!isValidApiKey) {
      return generateUnauthorizedResponse('Invalid API key');
    }

    headers['x-auth-type'] = [{ key: 'X-Auth-Type', value: 'api-key' }];
    return request;
  }

  // No valid authentication found
  return generateUnauthorizedResponse('Authentication required');
};

/**
 * Basic JWT validation (structure check)
 * In production, use proper JWT library with signature verification
 */
function validateJWT(token) {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return { valid: false };
    }

    // Decode payload (base64url)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: 'expired' };
    }

    // Check not before
    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: 'not_yet_valid' };
    }

    return {
      valid: true,
      userId: payload.sub || payload.user_id,
      claims: payload
    };
  } catch (error) {
    return { valid: false, reason: 'parse_error' };
  }
}

/**
 * Validate API key format and structure
 * In production, validate against a database or secrets manager
 */
function validateApiKey(apiKey) {
  // Check basic format: prefix_key format
  const apiKeyPattern = /^${var.project_name}_[a-zA-Z0-9]{32,64}$/;
  return apiKeyPattern.test(apiKey);
}

/**
 * Generate 401 Unauthorized response
 */
function generateUnauthorizedResponse(message) {
  return {
    status: '401',
    statusDescription: 'Unauthorized',
    headers: {
      'content-type': [{ key: 'Content-Type', value: 'application/json' }],
      'cache-control': [{ key: 'Cache-Control', value: 'no-store, no-cache' }],
      'www-authenticate': [{ key: 'WWW-Authenticate', value: 'Bearer realm="api"' }]
    },
    body: JSON.stringify({
      error: 'Unauthorized',
      message: message,
      timestamp: new Date().toISOString()
    })
  };
}
EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "auth_edge" {
  count            = var.enable_auth_edge ? 1 : 0
  filename         = data.archive_file.auth_edge[0].output_path
  function_name    = "${local.function_prefix}-auth-edge"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.auth_edge[0].output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 5
  memory_size      = 128
  publish          = true

  provider = aws.us_east_1

  tags = merge(local.common_tags, {
    Name     = "${local.function_prefix}-auth-edge"
    Function = "authentication"
  })
}

resource "aws_cloudwatch_log_group" "auth_edge" {
  count             = var.enable_auth_edge ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.auth_edge[0].function_name}"
  retention_in_days = var.log_retention_days

  provider = aws.us_east_1

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# A/B Testing Routing Lambda@Edge
#------------------------------------------------------------------------------

data "archive_file" "ab_testing" {
  count       = var.enable_ab_testing ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/files/ab-testing.zip"

  source {
    content  = <<-EOF
'use strict';

/**
 * Lambda@Edge function for A/B testing routing
 * Routes users to different origins or versions based on consistent hashing
 */

// A/B test configurations
const AB_TESTS = {
  'homepage-redesign': {
    enabled: true,
    variants: [
      { name: 'control', weight: 50, path: null },
      { name: 'variant-a', weight: 25, path: '/v2' },
      { name: 'variant-b', weight: 25, path: '/v3' }
    ],
    targetPaths: ['/'],
    cookieName: 'ab_homepage'
  },
  'checkout-flow': {
    enabled: true,
    variants: [
      { name: 'control', weight: 70, path: null },
      { name: 'streamlined', weight: 30, path: '/checkout-v2' }
    ],
    targetPaths: ['/checkout', '/cart'],
    cookieName: 'ab_checkout'
  },
  'api-version': {
    enabled: true,
    variants: [
      { name: 'v1', weight: 80, origin: 'api-v1' },
      { name: 'v2', weight: 20, origin: 'api-v2' }
    ],
    targetPaths: ['/api/'],
    cookieName: 'ab_api'
  }
};

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const uri = request.uri;

  // Get or generate user ID for consistent bucketing
  const userId = getUserId(headers);

  // Process each active A/B test
  for (const [testName, testConfig] of Object.entries(AB_TESTS)) {
    if (!testConfig.enabled) continue;

    // Check if request matches test target paths
    const matchesPath = testConfig.targetPaths.some(path => uri.startsWith(path));
    if (!matchesPath) continue;

    // Get existing variant from cookie or assign new one
    let variant = getVariantFromCookie(headers, testConfig.cookieName);

    if (!variant) {
      variant = assignVariant(userId, testName, testConfig.variants);
    }

    // Apply variant modifications
    const selectedVariant = testConfig.variants.find(v => v.name === variant);

    if (selectedVariant) {
      // Add test headers for tracking
      headers['x-ab-test'] = [{ key: 'X-AB-Test', value: testName }];
      headers['x-ab-variant'] = [{ key: 'X-AB-Variant', value: variant }];

      // Modify path if variant specifies one
      if (selectedVariant.path) {
        request.uri = selectedVariant.path + uri;
      }

      // Set origin if variant specifies one
      if (selectedVariant.origin) {
        headers['x-target-origin'] = [{ key: 'X-Target-Origin', value: selectedVariant.origin }];
      }

      // Set cookie for consistent experience
      if (!headers['set-cookie']) {
        headers['x-set-ab-cookie'] = [{
          key: 'X-Set-AB-Cookie',
          value: testConfig.cookieName + '=' + variant + '; Path=/; Max-Age=2592000; SameSite=Lax'
        }];
      }
    }

    // Only apply first matching test
    break;
  }

  // Add user bucket ID for downstream analytics
  headers['x-user-bucket'] = [{ key: 'X-User-Bucket', value: userId }];

  return request;
};

/**
 * Get or generate consistent user ID from cookies or create new one
 */
function getUserId(headers) {
  const cookies = parseCookies(headers);

  if (cookies['user_bucket']) {
    return cookies['user_bucket'];
  }

  // Generate deterministic ID from available headers
  const clientIp = headers['x-forwarded-for'] ? headers['x-forwarded-for'][0].value : '';
  const userAgent = headers['user-agent'] ? headers['user-agent'][0].value : '';

  return hashString(clientIp + userAgent + Date.now().toString());
}

/**
 * Parse cookies from request headers
 */
function parseCookies(headers) {
  const cookies = {};

  if (headers.cookie) {
    headers.cookie[0].value.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = parts[1];
      }
    });
  }

  return cookies;
}

/**
 * Get variant assignment from existing cookie
 */
function getVariantFromCookie(headers, cookieName) {
  const cookies = parseCookies(headers);
  return cookies[cookieName] || null;
}

/**
 * Assign variant based on consistent hashing
 */
function assignVariant(userId, testName, variants) {
  const hash = hashString(userId + testName);
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.name;
    }
  }

  // Fallback to first variant
  return variants[0].name;
}

/**
 * Simple hash function for consistent bucketing
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "ab_testing" {
  count            = var.enable_ab_testing ? 1 : 0
  filename         = data.archive_file.ab_testing[0].output_path
  function_name    = "${local.function_prefix}-ab-testing"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.ab_testing[0].output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 5
  memory_size      = 128
  publish          = true

  provider = aws.us_east_1

  tags = merge(local.common_tags, {
    Name     = "${local.function_prefix}-ab-testing"
    Function = "ab-testing"
  })
}

resource "aws_cloudwatch_log_group" "ab_testing" {
  count             = var.enable_ab_testing ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.ab_testing[0].function_name}"
  retention_in_days = var.log_retention_days

  provider = aws.us_east_1

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# Origin Request Handler (Custom Code)
#------------------------------------------------------------------------------

data "archive_file" "origin_request" {
  count       = var.origin_request_handler_code != "" ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/files/origin-request.zip"

  source {
    content  = var.origin_request_handler_code
    filename = "index.js"
  }
}

resource "aws_lambda_function" "origin_request" {
  count            = var.origin_request_handler_code != "" ? 1 : 0
  filename         = data.archive_file.origin_request[0].output_path
  function_name    = "${local.function_prefix}-origin-request"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.origin_request[0].output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 128
  publish          = true

  provider = aws.us_east_1

  tags = merge(local.common_tags, {
    Name     = "${local.function_prefix}-origin-request"
    Function = "origin-request"
  })
}

resource "aws_cloudwatch_log_group" "origin_request" {
  count             = var.origin_request_handler_code != "" ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.origin_request[0].function_name}"
  retention_in_days = var.log_retention_days

  provider = aws.us_east_1

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# Response Headers Lambda@Edge (Security Headers)
#------------------------------------------------------------------------------

data "archive_file" "response_headers" {
  type        = "zip"
  output_path = "${path.module}/files/response-headers.zip"

  source {
    content  = <<-EOF
'use strict';

/**
 * Lambda@Edge function for adding security headers to responses
 * Runs on origin-response or viewer-response events
 */
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  // Security headers
  headers['strict-transport-security'] = [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubdomains; preload'
  }];

  headers['x-content-type-options'] = [{
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }];

  headers['x-frame-options'] = [{
    key: 'X-Frame-Options',
    value: 'DENY'
  }];

  headers['x-xss-protection'] = [{
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }];

  headers['referrer-policy'] = [{
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }];

  // Content Security Policy
  headers['content-security-policy'] = [{
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  }];

  // Permissions Policy (formerly Feature Policy)
  headers['permissions-policy'] = [{
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self)'
  }];

  // Cache control for HTML responses
  const contentType = headers['content-type'] ? headers['content-type'][0].value : '';
  if (contentType.includes('text/html')) {
    headers['cache-control'] = [{
      key: 'Cache-Control',
      value: 'no-cache, no-store, must-revalidate'
    }];
  }

  // Add timing headers
  headers['x-response-time'] = [{
    key: 'X-Response-Time',
    value: Date.now().toString()
  }];

  // Transfer A/B testing cookie if set by request handler
  const request = event.Records[0].cf.request;
  if (request && request.headers && request.headers['x-set-ab-cookie']) {
    headers['set-cookie'] = headers['set-cookie'] || [];
    headers['set-cookie'].push({
      key: 'Set-Cookie',
      value: request.headers['x-set-ab-cookie'][0].value
    });
  }

  return response;
};
EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "response_headers" {
  filename         = data.archive_file.response_headers.output_path
  function_name    = "${local.function_prefix}-response-headers"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.response_headers.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 5
  memory_size      = 128
  publish          = true

  provider = aws.us_east_1

  tags = merge(local.common_tags, {
    Name     = "${local.function_prefix}-response-headers"
    Function = "response-headers"
  })
}

resource "aws_cloudwatch_log_group" "response_headers" {
  name              = "/aws/lambda/${aws_lambda_function.response_headers.function_name}"
  retention_in_days = var.log_retention_days

  provider = aws.us_east_1

  tags = local.common_tags
}

#------------------------------------------------------------------------------
# Lambda Permissions for CloudFront
#------------------------------------------------------------------------------

resource "aws_lambda_permission" "request_transform_cloudfront" {
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.request_transform.function_name
  principal     = "cloudfront.amazonaws.com"
  qualifier     = aws_lambda_function.request_transform.version

  provider = aws.us_east_1
}

resource "aws_lambda_permission" "auth_edge_cloudfront" {
  count         = var.enable_auth_edge ? 1 : 0
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_edge[0].function_name
  principal     = "cloudfront.amazonaws.com"
  qualifier     = aws_lambda_function.auth_edge[0].version

  provider = aws.us_east_1
}

resource "aws_lambda_permission" "ab_testing_cloudfront" {
  count         = var.enable_ab_testing ? 1 : 0
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ab_testing[0].function_name
  principal     = "cloudfront.amazonaws.com"
  qualifier     = aws_lambda_function.ab_testing[0].version

  provider = aws.us_east_1
}

resource "aws_lambda_permission" "origin_request_cloudfront" {
  count         = var.origin_request_handler_code != "" ? 1 : 0
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.origin_request[0].function_name
  principal     = "cloudfront.amazonaws.com"
  qualifier     = aws_lambda_function.origin_request[0].version

  provider = aws.us_east_1
}

resource "aws_lambda_permission" "response_headers_cloudfront" {
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.response_headers.function_name
  principal     = "cloudfront.amazonaws.com"
  qualifier     = aws_lambda_function.response_headers.version

  provider = aws.us_east_1
}
