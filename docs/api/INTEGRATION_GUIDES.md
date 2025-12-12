# Third-Party Integration Guides

## Table of Contents

- [Stripe Payment Integration](#stripe-payment-integration)
- [Agora Video Calling Integration](#agora-video-calling-integration)
- [Firebase Integration](#firebase-integration)
- [Social Login Integration](#social-login-integration)

---

## Stripe Payment Integration

This guide covers integrating Stripe for payment processing in the Flamoral platform.

### Overview

Flamoral uses Stripe for:
- Subscription billing (Premium, Premium Plus)
- One-time purchases (Coin packages, Boosts)
- Payment method management
- Webhook handling for payment events

### Setup

#### 1. Create Stripe Account

1. Sign up at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete business verification
3. Enable payment methods (cards, Apple Pay, Google Pay)

#### 2. Get API Keys

Navigate to **Developers > API Keys** and copy:
- **Publishable Key** (starts with `pk_`)
- **Secret Key** (starts with `sk_`)

**Environment Variables:**
```bash
# Production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 3. Create Products

In Stripe Dashboard > **Products**:

**Subscription Products:**
```
Premium Monthly
- Price: $9.99/month
- Product ID: premium_monthly
- Recurring: Monthly

Premium Plus Monthly
- Price: $19.99/month
- Product ID: premium_plus_monthly
- Recurring: Monthly

Premium Yearly
- Price: $99.99/year
- Product ID: premium_yearly
- Recurring: Yearly
```

**Coin Products:**
```
100 Coins
- Price: $0.99
- Product ID: coins_100

500 Coins
- Price: $4.99
- Product ID: coins_500

1000 Coins
- Price: $8.99
- Product ID: coins_1000
```

### Client Integration

#### Web (React)

**Install Stripe.js:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Setup:**
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...');

function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
```

**Payment Flow:**
```javascript
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create payment intent on backend
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: 'premium_monthly',
          productType: 'subscription'
        })
      });

      const { clientSecret } = await response.json();

      // 2. Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: 'John Doe',
              email: 'john@example.com'
            }
          }
        }
      );

      if (error) {
        console.error('Payment failed:', error.message);
        showError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        console.log('Payment successful!');
        showSuccess('Subscribed to Premium!');
        // Refresh user subscription status
        await refreshSubscription();
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}
      />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Subscribe to Premium'}
      </button>
    </form>
  );
}
```

#### iOS (Swift)

**Install Stripe SDK:**
```ruby
pod 'Stripe'
```

**Setup:**
```swift
import Stripe

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    StripeAPI.defaultPublishableKey = "pk_test_..."
    return true
}
```

**Payment Flow:**
```swift
import Stripe

class PaymentViewController: UIViewController, STPPaymentContextDelegate {
    let paymentContext: STPPaymentContext

    override func viewDidLoad() {
        super.viewDidLoad()

        // Setup payment context
        let customerContext = STPCustomerContext(keyProvider: StripeKeyProvider())
        paymentContext = STPPaymentContext(customerContext: customerContext)
        paymentContext.delegate = self
        paymentContext.hostViewController = self
    }

    func subscribe(to productId: String) {
        // 1. Create payment intent
        Task {
            do {
                let paymentIntent = try await createPaymentIntent(productId: productId)

                // 2. Request payment
                paymentContext.requestPayment()
            } catch {
                print("Failed to create payment intent:", error)
            }
        }
    }

    func createPaymentIntent(productId: String) async throws -> PaymentIntent {
        let url = URL(string: "https://api.flamoral.com/api/payments/create-intent")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "productId": productId,
            "productType": "subscription"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(PaymentIntent.self, from: data)
    }

    // MARK: - STPPaymentContextDelegate

    func paymentContext(_ paymentContext: STPPaymentContext, didCreatePaymentResult paymentResult: STPPaymentResult, completion: @escaping STPPaymentStatusBlock) {
        // Payment successful
        completion(.success, nil)

        DispatchQueue.main.async {
            self.showSuccess("Subscribed to Premium!")
        }
    }

    func paymentContext(_ paymentContext: STPPaymentContext, didFailToLoadWithError error: Error) {
        // Handle error
        print("Payment failed:", error)
    }

    func paymentContextDidChange(_ paymentContext: STPPaymentContext) {
        // Payment method changed
    }

    func paymentContext(_ paymentContext: STPPaymentContext, didFinishWith status: STPPaymentStatus, error: Error?) {
        switch status {
        case .success:
            print("Payment completed")
        case .error:
            print("Payment failed:", error?.localizedDescription ?? "Unknown error")
        case .userCancellation:
            print("Payment cancelled")
        @unknown default:
            break
        }
    }
}
```

#### Android (Kotlin)

**Install Stripe SDK:**
```gradle
dependencies {
    implementation 'com.stripe:stripe-android:20.+'
}
```

**Setup:**
```kotlin
import com.stripe.android.PaymentConfiguration

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        PaymentConfiguration.init(
            applicationContext,
            "pk_test_..."
        )
    }
}
```

**Payment Flow:**
```kotlin
import com.stripe.android.*
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult

class PaymentActivity : AppCompatActivity() {
    private lateinit var paymentSheet: PaymentSheet

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment)

        paymentSheet = PaymentSheet(this, ::onPaymentSheetResult)

        // Setup UI
        findViewById<Button>(R.id.subscribeButton).setOnClickListener {
            subscribeToPremium()
        }
    }

    private fun subscribeToPremium() {
        lifecycleScope.launch {
            try {
                // 1. Create payment intent
                val paymentIntent = createPaymentIntent("premium_monthly")

                // 2. Present payment sheet
                paymentSheet.presentWithPaymentIntent(
                    paymentIntent.clientSecret,
                    PaymentSheet.Configuration(
                        merchantDisplayName = "Flamoral",
                        customer = PaymentSheet.CustomerConfiguration(
                            id = paymentIntent.customerId,
                            ephemeralKeySecret = paymentIntent.ephemeralKey
                        )
                    )
                )
            } catch (e: Exception) {
                Log.e("Payment", "Failed to create payment intent", e)
                Toast.makeText(this@PaymentActivity, "Payment failed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private suspend fun createPaymentIntent(productId: String): PaymentIntentResponse {
        val url = "https://api.flamoral.com/api/payments/create-intent"
        val request = Request.Builder()
            .url(url)
            .post(
                JSONObject(mapOf(
                    "productId" to productId,
                    "productType" to "subscription"
                )).toString().toRequestBody("application/json".toMediaType())
            )
            .addHeader("Authorization", "Bearer $accessToken")
            .build()

        val response = httpClient.newCall(request).execute()
        val json = JSONObject(response.body!!.string())

        return PaymentIntentResponse(
            clientSecret = json.getString("clientSecret"),
            customerId = json.getString("customerId"),
            ephemeralKey = json.getString("ephemeralKey")
        )
    }

    private fun onPaymentSheetResult(paymentResult: PaymentSheetResult) {
        when (paymentResult) {
            is PaymentSheetResult.Completed -> {
                Toast.makeText(this, "Subscribed to Premium!", Toast.LENGTH_LONG).show()
                // Refresh subscription status
                refreshSubscription()
            }
            is PaymentSheetResult.Canceled -> {
                Log.d("Payment", "Payment cancelled")
            }
            is PaymentSheetResult.Failed -> {
                Log.e("Payment", "Payment failed", paymentResult.error)
                Toast.makeText(this, "Payment failed: ${paymentResult.error.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}
```

### Backend Integration

#### Payment Intent Creation

```typescript
// payment-service/src/api/controllers/payment.controller.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createPaymentIntent(req: Request, res: Response) {
  try {
    const { productId, productType } = req.body;
    const userId = req.user.id;

    // Get product details
    const product = await getProduct(productId, productType);

    // Create or get Stripe customer
    let customer = await getStripeCustomer(userId);
    if (!customer) {
      customer = await stripe.customers.create({
        metadata: {
          userId,
        },
      });
      await saveStripeCustomer(userId, customer.id);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.amount,
      currency: 'usd',
      customer: customer.id,
      metadata: {
        userId,
        productId,
        productType,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create ephemeral key for mobile clients
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-10-16' }
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      ephemeralKey: ephemeralKey.secret,
    });
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}
```

#### Webhook Handling

```typescript
// payment-service/src/api/routes/webhook.routes.ts
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSuccess(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailure(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata.userId;
  const productId = paymentIntent.metadata.productId;
  const productType = paymentIntent.metadata.productType;

  console.log(`Payment succeeded for user ${userId}`);

  // Grant access based on product type
  if (productType === 'subscription') {
    await upgradeSubscription(userId, productId);
  } else if (productType === 'coins') {
    await addCoins(userId, productId);
  }

  // Send confirmation email
  await sendPaymentConfirmationEmail(userId, paymentIntent);

  // Send push notification
  await sendPushNotification(userId, {
    title: 'Payment Successful',
    body: 'Your payment has been processed successfully',
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);

  const tier = getSubscriptionTier(subscription.items.data[0].price.id);

  await updateUserSubscription(userId, {
    tier,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  console.log(`Subscription updated for user ${userId}: ${tier}`);
}
```

### Webhook Configuration

1. Go to Stripe Dashboard > **Developers > Webhooks**
2. Click **Add endpoint**
3. Enter endpoint URL: `https://api.flamoral.com/api/payments/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Testing

Use Stripe CLI for local testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3003/api/payments/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

**Test Cards:**
```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

---

## Agora Video Calling Integration

Integration guide for Agora RTC (Real-Time Communication) for video calling.

### Overview

Agora provides:
- High-quality video/audio calling
- Screen sharing
- Recording
- Real-time messaging
- Call analytics

### Setup

#### 1. Create Agora Account

1. Sign up at [https://console.agora.io](https://console.agora.io)
2. Create a new project
3. Enable features:
   - Real-Time Communication
   - Real-Time Messaging
   - Cloud Recording

#### 2. Get Credentials

From project dashboard:
- **App ID**: Unique project identifier
- **App Certificate**: For token generation
- **Customer ID**: For server API
- **Customer Secret**: For server API

**Environment Variables:**
```bash
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_app_certificate
AGORA_CUSTOMER_ID=your_customer_id
AGORA_CUSTOMER_SECRET=your_customer_secret
```

### Client Integration

#### Web (React)

**Install Agora SDK:**
```bash
npm install agora-rtc-sdk-ng
```

**Video Call Component:**
```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useState, useEffect, useRef } from 'react';

const APP_ID = 'your_app_id';

function VideoCall({ channelName, userId, onCallEnd }) {
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [client] = useState(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    initCall();
    return () => leaveCall();
  }, []);

  async function initCall() {
    try {
      // Get RTC token from backend
      const token = await fetchRTCToken(channelName, userId);

      // Join channel
      await client.join(APP_ID, channelName, token, userId);

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 30,
            bitrateMin: 600,
            bitrateMax: 1000,
          },
        },
        {
          encoderConfig: {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 1000,
            bitrateMax: 3000,
          },
        }
      );

      setLocalTracks([audioTrack, videoTrack]);

      // Play local video
      videoTrack.play(localVideoRef.current);

      // Publish tracks
      await client.publish([audioTrack, videoTrack]);

      // Listen for remote users
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);

      console.log('Call started successfully');
    } catch (error) {
      console.error('Failed to start call:', error);
      onCallEnd();
    }
  }

  async function handleUserPublished(user, mediaType) {
    // Subscribe to remote user
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
      setRemoteUsers(prev => ({ ...prev, [user.uid]: user }));

      // Play remote video
      setTimeout(() => {
        user.videoTrack?.play(remoteVideoRef.current);
      }, 100);
    }

    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
  }

  function handleUserUnpublished(user, mediaType) {
    if (mediaType === 'video') {
      setRemoteUsers(prev => {
        const updated = { ...prev };
        delete updated[user.uid];
        return updated;
      });
    }
  }

  function handleUserLeft(user) {
    setRemoteUsers(prev => {
      const updated = { ...prev };
      delete updated[user.uid];
      return updated;
    });
  }

  async function leaveCall() {
    // Stop local tracks
    localTracks.forEach(track => {
      track.stop();
      track.close();
    });

    // Leave channel
    await client.leave();

    onCallEnd();
  }

  async function toggleMute() {
    const audioTrack = localTracks.find(track => track.trackMediaType === 'audio');
    if (audioTrack) {
      await audioTrack.setEnabled(!audioTrack.enabled);
    }
  }

  async function toggleVideo() {
    const videoTrack = localTracks.find(track => track.trackMediaType === 'video');
    if (videoTrack) {
      await videoTrack.setEnabled(!videoTrack.enabled);
    }
  }

  return (
    <div className="video-call">
      <div className="remote-video" ref={remoteVideoRef}></div>
      <div className="local-video" ref={localVideoRef}></div>

      <div className="controls">
        <button onClick={toggleMute}>Mute/Unmute</button>
        <button onClick={toggleVideo}>Video On/Off</button>
        <button onClick={leaveCall}>End Call</button>
      </div>
    </div>
  );
}

async function fetchRTCToken(channelName, userId) {
  const response = await fetch('/api/video/token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ channelName, userId })
  });

  const { token } = await response.json();
  return token;
}
```

#### iOS (Swift)

**Install Agora SDK:**
```ruby
pod 'AgoraRtcEngine_iOS'
```

**Video Call Implementation:**
```swift
import AgoraRtcKit

class VideoCallViewController: UIViewController {
    var agoraKit: AgoraRtcEngineKit!
    var localView: UIView!
    var remoteView: UIView!

    let appId = "your_app_id"
    var channelName: String!
    var token: String!

    override func viewDidLoad() {
        super.viewDidLoad()

        setupUI()
        initializeAgoraEngine()
        joinChannel()
    }

    func setupUI() {
        // Setup local and remote video views
        localView = UIView(frame: CGRect(x: 0, y: 0, width: 120, height: 160))
        localView.backgroundColor = .black
        view.addSubview(localView)

        remoteView = UIView(frame: view.bounds)
        remoteView.backgroundColor = .black
        view.insertSubview(remoteView, at: 0)
    }

    func initializeAgoraEngine() {
        agoraKit = AgoraRtcEngineKit.sharedEngine(withAppId: appId, delegate: self)
        agoraKit.enableVideo()
        agoraKit.enableAudio()

        // Set video configuration
        let videoConfig = AgoraVideoEncoderConfiguration(
            size: CGSize(width: 1280, height: 720),
            frameRate: .fps30,
            bitrate: AgoraVideoBitrateStandard,
            orientationMode: .adaptative
        )
        agoraKit.setVideoEncoderConfiguration(videoConfig)
    }

    func joinChannel() {
        // Setup local video
        let videoCanvas = AgoraRtcVideoCanvas()
        videoCanvas.uid = 0
        videoCanvas.view = localView
        videoCanvas.renderMode = .hidden
        agoraKit.setupLocalVideo(videoCanvas)
        agoraKit.startPreview()

        // Join channel
        agoraKit.joinChannel(
            byToken: token,
            channelId: channelName,
            info: nil,
            uid: 0
        ) { [weak self] (channel, uid, elapsed) in
            print("Joined channel: \(channel), uid: \(uid)")
        }
    }

    func leaveChannel() {
        agoraKit.leaveChannel(nil)
        agoraKit.stopPreview()
        dismiss(animated: true)
    }

    @IBAction func toggleMute(_ sender: UIButton) {
        let isMuted = agoraKit.muteLocalAudioStream(!sender.isSelected)
        sender.isSelected = isMuted
    }

    @IBAction func toggleVideo(_ sender: UIButton) {
        let isVideoOff = agoraKit.muteLocalVideoStream(!sender.isSelected)
        sender.isSelected = isVideoOff
    }

    @IBAction func endCall(_ sender: UIButton) {
        leaveChannel()
    }
}

extension VideoCallViewController: AgoraRtcEngineDelegate {
    func rtcEngine(_ engine: AgoraRtcEngineKit, didJoinedOfUid uid: UInt, elapsed: Int) {
        print("Remote user joined: \(uid)")

        // Setup remote video
        let videoCanvas = AgoraRtcVideoCanvas()
        videoCanvas.uid = uid
        videoCanvas.view = remoteView
        videoCanvas.renderMode = .hidden
        agoraKit.setupRemoteVideo(videoCanvas)
    }

    func rtcEngine(_ engine: AgoraRtcEngineKit, didOfflineOfUid uid: UInt, reason: AgoraUserOfflineReason) {
        print("Remote user left: \(uid)")
        remoteView.subviews.forEach { $0.removeFromSuperview() }
    }
}
```

### Backend Integration

#### Token Generation

```typescript
// user-service/src/api/controllers/video.controller.ts
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const APP_ID = process.env.AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

export async function generateRTCToken(req: Request, res: Response) {
  try {
    const { channelName } = req.body;
    const userId = req.user.id;

    // Generate unique UID for user
    const uid = generateNumericUid(userId);

    // Token expires in 24 hours
    const expirationTime = Math.floor(Date.now() / 1000) + 86400;

    // Generate RTC token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expirationTime
    );

    // Save call record
    await createCallRecord({
      callId: channelName,
      callerId: userId,
      channelName,
      startedAt: new Date(),
    });

    res.json({
      token,
      uid,
      channelName,
      expiresAt: new Date(expirationTime * 1000),
    });
  } catch (error) {
    console.error('Failed to generate RTC token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}

function generateNumericUid(userId: string): number {
  // Convert string userId to numeric UID
  // Agora requires numeric UID
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}
```

---

This documentation continues with Firebase and Social Login integration guides. The full documentation provides comprehensive integration instructions for all third-party services used in the Flamoral platform.
