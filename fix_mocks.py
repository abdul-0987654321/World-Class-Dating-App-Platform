import re

# Fix photo-verification.service.ts
with open('backend/services/user-service/src/domain/services/photo-verification.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove first fallback (liveness detection)
old1 = """      // Fallback: basic validation
      // In development mode, accept all photos
      if (process.env.NODE_ENV === 'development') {
        return {
          live: true,
          confidence: 0.90,
        };
      }

      return {
        live: true,
        confidence: 0.80,
      };"""
new1 = """      // Azure Face API is required for liveness detection
      throw new Error('Azure Face API credentials not configured. Please set AZURE_FACE_API_KEY and AZURE_FACE_API_ENDPOINT environment variables.');"""
content = content.replace(old1, new1)

# Remove second fallback (pose verification)
old2 = """      // Fallback for development
      if (process.env.NODE_ENV === 'development') {
        return {
          matched: true,
          confidence: 0.85,
        };
      }

      return {
        matched: true,
        confidence: 0.75,
      };"""
new2 = """      // Azure Face API is required for pose verification
      throw new Error('Azure Face API credentials not configured. Please set AZURE_FACE_API_KEY and AZURE_FACE_API_ENDPOINT environment variables.');"""
content = content.replace(old2, new2)

# Remove third fallback (face matching)
old3 = """      // Fallback for development
      if (process.env.NODE_ENV === 'development') {
        return {
          matched: true,
          confidence: 0.92,
        };
      }

      return {
        matched: true,
        confidence: 0.85,
      };"""
new3 = """      // Azure Face API is required for face matching
      throw new Error('Azure Face API credentials not configured. Please set AZURE_FACE_API_KEY and AZURE_FACE_API_ENDPOINT environment variables.');"""
content = content.replace(old3, new3)

with open('backend/services/user-service/src/domain/services/photo-verification.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("photo-verification.service.ts updated")

# Fix webhook.routes.ts
with open('backend/services/payment-service/src/api/routes/webhook.routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_webhook = """/**
 * Webhook test endpoint (for development only)
 * POST /api/webhooks/test
 *
 * Use Stripe CLI to test webhooks locally:
 * stripe listen --forward-to localhost:3003/api/webhooks/stripe
 * stripe trigger payment_intent.succeeded
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', express.json(), async (req, res) => {
    logger.info('Test webhook received:', req.body);
    res.status(200).json({ received: true, message: 'Test webhook received' });
  });
}

export default router;"""

new_webhook = """export default router;"""

content = content.replace(old_webhook, new_webhook)

with open('backend/services/payment-service/src/api/routes/webhook.routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("webhook.routes.ts updated")
