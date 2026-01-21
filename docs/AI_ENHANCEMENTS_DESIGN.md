# Flamoral AI Enhancements Design Document

**Version:** 1.0.0
**Date:** 2026-01-19
**Author:** Agent C - AI Capability Architect
**Status:** Design Complete

---

## Executive Summary

This document outlines AI-native enhancements for the Flamoral dating platform, leveraging the existing AWS Bedrock, OpenAI/Anthropic, and AWS Rekognition infrastructure. Each enhancement includes feature specifications, technical approach, data requirements, API contracts, privacy considerations, cost estimates, and implementation priority.

### Current AI Stack Assessment

Based on codebase analysis, Flamoral has a mature AI foundation:

| Service | Status | Technology |
|---------|--------|------------|
| AWS Rekognition | Active | Photo analysis, deepfake detection, face verification |
| AWS Bedrock | Active | Profile recommendations, matching |
| OpenAI/Anthropic | Active | Dating coach, icebreakers, conversation analysis |
| Custom ML | Active | Hybrid recommender, collaborative filtering, content-based filtering |
| NLP Service | Active | Sentiment analysis, scam detection, toxicity detection |
| Fraud Detection | Active | Device fingerprinting, velocity checks, location analysis |

---

## 1. PERSONALIZATION ENHANCEMENTS

### 1.1 Intelligent Profile Recommendations with Contextual Awareness

**Feature Description:**
Enhance the existing hybrid recommender with real-time contextual signals including time of day, recent activity patterns, mood indicators from messaging, and event-based context (holidays, weekends).

**AI/ML Approach:**
- **Model Type:** Multi-Armed Bandit with contextual features (LinUCB)
- **Framework:** Extend existing `HybridRecommender` class
- **Features:**
  - Temporal: hour, day_of_week, is_weekend, is_holiday
  - Behavioral: session_duration, swipe_velocity, message_response_rate
  - Mood: derived from NLP sentiment of recent messages
  - Engagement: boost_active, recently_matched

**Data Requirements:**
```python
ContextualFeatures = {
    "user_id": str,
    "timestamp": datetime,
    "session_context": {
        "duration_minutes": int,
        "swipe_count": int,
        "messages_sent": int,
        "current_mood_score": float  # from NLP
    },
    "temporal_context": {
        "local_hour": int,
        "is_weekend": bool,
        "is_evening": bool
    },
    "recent_preferences": List[str]  # last 20 swipe decisions
}
```

**API Contract:**
```yaml
POST /api/v1/recommendations/contextual
Request:
  user_id: string
  session_id: string
  context:
    mood_indicator: string (optional)
    time_budget_minutes: integer (optional)
Response:
  recommendations:
    - user_id: string
      score: float
      match_reasons: string[]
      context_boost: float
      optimal_interaction_time: string
  personalization_factors:
    - factor: string
      weight: float
```

**Privacy/Security Considerations:**
- Mood inference is derived only from user's own messages (not match conversations)
- Contextual data is ephemeral (24-hour retention)
- Users can opt-out of contextual personalization in settings
- No cross-user behavioral correlation stored

**Cost Estimate:**
- AWS Bedrock (Claude Haiku for context summarization): ~$0.001 per recommendation batch
- Additional compute for real-time feature extraction: ~$50/month for 100K daily active users
- **Total incremental cost:** ~$200-300/month

**Implementation Priority:** HIGH
- Builds directly on existing `HybridRecommender`
- High user impact with moderate implementation effort

---

### 1.2 Adaptive Discovery Algorithms with Exploration/Exploitation Balance

**Feature Description:**
Implement Thompson Sampling to balance showing users profiles they're likely to match with (exploitation) versus discovering new preference patterns (exploration). Dynamically adjusts based on user engagement.

**AI/ML Approach:**
- **Algorithm:** Thompson Sampling with Beta distributions
- **Exploration Rate:** Adaptive (increases after prolonged same-pattern swiping)
- **Feedback Loop:** Real-time reward signal from matches, conversations, dates

**Data Requirements:**
```python
ExplorationState = {
    "user_id": str,
    "segment_preferences": Dict[str, BetaDistribution],
    "exploration_budget": float,  # 0.1 - 0.3
    "last_exploration_success": datetime,
    "preference_stability_score": float
}
```

**API Contract:**
```yaml
GET /api/v1/discovery/feed
Parameters:
  user_id: string
  mode: enum (explore | balanced | focused)
  limit: integer (default: 20)
Response:
  profiles:
    - user_id: string
      discovery_type: enum (exploitation | exploration)
      exploration_reason: string (optional)
      predicted_match_probability: float
```

**Privacy/Security Considerations:**
- Exploration decisions are not exposed to other users
- Preference segment data is aggregated, not individual profile tracking

**Cost Estimate:**
- Primarily compute-based, minimal external API calls
- **Total:** ~$100/month additional infrastructure

**Implementation Priority:** MEDIUM
- Enhances existing discovery without replacing it

---

### 1.3 Personalized Conversation Starters with Learning

**Feature Description:**
Evolve the existing `IcebreakerGeneratorService` to learn from user editing patterns and response success rates, creating increasingly personalized openers.

**AI/ML Approach:**
- **Model:** Fine-tuned embedding model for user communication style
- **Training:** Supervised learning on successful conversations (those leading to dates)
- **Inference:** AWS Bedrock Claude with user-style-conditioned prompts

**Data Requirements:**
```python
ConversationStarterFeedback = {
    "user_id": str,
    "generated_starter": str,
    "user_edited_version": str (nullable),
    "was_sent": bool,
    "response_received": bool,
    "response_time_hours": float,
    "conversation_continued": bool,
    "led_to_date": bool
}
```

**API Contract:**
```yaml
POST /api/v1/icebreakers/personalized
Request:
  user_id: string
  match_profile:
    bio: string
    interests: string[]
    prompts: object[]
  style_preference: enum (witty | sincere | playful | intellectual)
  count: integer
Response:
  icebreakers:
    - message: string
      confidence: float
      style_match: float
      personalization_level: enum (high | medium | template)
      based_on:
        - type: string
          detail: string
```

**Privacy/Security Considerations:**
- User communication patterns are stored encrypted
- Users can delete their style profile at any time
- No sharing of learned patterns between users

**Cost Estimate:**
- AWS Bedrock Claude Haiku: ~$0.0005 per generation
- At 50 generations/user/month: ~$0.025/user/month
- **Total for 100K users:** ~$2,500/month

**Implementation Priority:** HIGH
- Direct improvement to user experience
- Clear success metrics (response rates)

---

### 1.4 Learning User Preferences with Implicit Feedback

**Feature Description:**
Extend the `BehavioralLearner` to capture nuanced preferences from swipe patterns, profile dwell time, photo zoom behavior, and return visits.

**AI/ML Approach:**
- **Model Type:** Implicit feedback matrix factorization
- **Signals:**
  - Dwell time per profile (>5s = interest)
  - Photo navigation patterns
  - Return views (strong signal)
  - Super-like vs regular like
  - Message initiation rate

**Data Requirements:**
```python
ImplicitFeedbackEvent = {
    "user_id": str,
    "target_user_id": str,
    "event_type": Enum["view", "dwell", "photo_next", "return_view", "swipe"],
    "dwell_time_ms": int,
    "photos_viewed": int,
    "bio_expanded": bool,
    "timestamp": datetime
}
```

**API Contract:**
```yaml
POST /api/v1/preferences/implicit
Request:
  user_id: string
  events: ImplicitFeedbackEvent[]
Response:
  learned_preferences:
    preference_updates:
      - dimension: string
        old_weight: float
        new_weight: float
        confidence: float
    inferred_interests: string[]
```

**Privacy/Security Considerations:**
- Dwell time is not shared with profile owners
- Implicit data is used only for recommendations, never displayed
- All tracking is transparent in privacy policy

**Cost Estimate:**
- Event ingestion via Kinesis: ~$50/month
- ML training (daily batch): ~$100/month
- **Total:** ~$150/month

**Implementation Priority:** HIGH
- Significantly improves recommendation quality with minimal user effort

---

## 2. CONVERSATIONAL AI ENHANCEMENTS

### 2.1 AI Dating Coach with Proactive Guidance

**Feature Description:**
Extend the existing `DatingCoachChatbot` with proactive intervention capabilities - detecting conversation lulls, suggesting when to ask for a date, and providing real-time feedback.

**AI/ML Approach:**
- **Model:** AWS Bedrock Claude Sonnet for nuanced coaching
- **Triggers:**
  - Conversation stagnation (>48h since last message)
  - High momentum detected (rapid exchanges)
  - Sentiment decline in conversation
  - User explicitly seeks advice

**Data Requirements:**
```python
CoachingContext = {
    "user_id": str,
    "conversation_id": str,
    "recent_messages": List[Message],  # last 20
    "conversation_health_score": float,
    "meeting_readiness_score": float,
    "user_communication_style": str,
    "coaching_history": List[CoachingInteraction]
}
```

**API Contract:**
```yaml
POST /api/v1/coach/proactive-advice
Request:
  user_id: string
  conversation_id: string
  trigger: enum (stagnation | momentum | sentiment_drop | user_request)
Response:
  advice:
    headline: string
    detailed_guidance: string
    suggested_actions:
      - action: string
        message_template: string (optional)
        urgency: enum (now | soon | whenever)
    conversation_health:
      score: float
      trend: enum (improving | stable | declining)

WebSocket Event: coach.proactive_nudge
Payload:
  conversation_id: string
  nudge_type: string
  message: string
```

**Privacy/Security Considerations:**
- Coach only accesses user's side of conversations by default
- Explicit user consent required for full conversation analysis
- Coaching history stored for 90 days max
- No human review of coaching sessions

**Cost Estimate:**
- AWS Bedrock Claude Sonnet: ~$0.003 per coaching interaction
- Proactive monitoring compute: ~$100/month
- Assuming 5 coaching interactions/user/month for 50K active users: ~$750/month
- **Total:** ~$850/month

**Implementation Priority:** HIGH
- Major differentiator from competitors
- Directly impacts user success metrics

---

### 2.2 Smart Reply Suggestions with Tone Matching

**Feature Description:**
Enhance the existing `SmartReplySuggestions` to match the communication style and tone of both the user and their match, creating more natural-feeling suggested replies.

**AI/ML Approach:**
- **Style Extraction:** Embedding-based style fingerprint from message history
- **Tone Matching:** Claude generates replies conditioned on both styles
- **Categories:** witty, flirty, sincere, curious, playful

**Data Requirements:**
```python
StyleProfile = {
    "user_id": str,
    "avg_message_length": float,
    "emoji_frequency": float,
    "question_ratio": float,
    "exclamation_usage": float,
    "vocabulary_complexity": float,
    "humor_indicators": float,
    "formality_score": float
}
```

**API Contract:**
```yaml
POST /api/v1/messaging/smart-replies
Request:
  conversation_id: string
  last_message: string
  message_history: Message[] (last 10)
  preferred_tone: string (optional)
Response:
  suggestions:
    - text: string
      tone: string
      confidence: float
      style_match_score: float
    - text: string
      tone: string
      confidence: float
      style_match_score: float
    - text: string
      tone: string
      confidence: float
      style_match_score: float
```

**Privacy/Security Considerations:**
- Style profiles are computed locally, not stored persistently
- Users can disable smart replies entirely
- No style data shared between users

**Cost Estimate:**
- AWS Bedrock Claude Haiku: ~$0.0003 per suggestion set
- At 20 suggestion requests/user/day for 50K active users: ~$9,000/month
- Caching common patterns can reduce by 60%: ~$3,600/month
- **Total:** ~$3,600/month

**Implementation Priority:** MEDIUM
- Nice-to-have but not critical path

---

### 2.3 Icebreaker Generator with Mutual Interest Focus

**Feature Description:**
Create icebreakers specifically highlighting mutual interests and shared experiences, using semantic similarity to find non-obvious connections.

**AI/ML Approach:**
- **Embedding Model:** AWS Bedrock Titan Embeddings
- **Similarity:** Cosine similarity on interest embeddings
- **Generation:** Claude generates openers based on top shared vectors

**Data Requirements:**
```python
MutualInterestContext = {
    "user_profile": {
        "interests": List[str],
        "bio_embedding": float[],
        "prompt_answers": List[str]
    },
    "match_profile": {
        "interests": List[str],
        "bio_embedding": float[],
        "prompt_answers": List[str]
    },
    "semantic_overlaps": List[{
        "topic": str,
        "user_context": str,
        "match_context": str,
        "similarity_score": float
    }]
}
```

**API Contract:**
```yaml
POST /api/v1/icebreakers/mutual-focus
Request:
  user_id: string
  match_user_id: string
  count: integer (default: 5)
Response:
  icebreakers:
    - message: string
      based_on:
        shared_topic: string
        user_angle: string
        match_angle: string
      uniqueness_score: float
  mutual_connections:
    - topic: string
      strength: float
      conversation_potential: enum (high | medium | low)
```

**Privacy/Security Considerations:**
- Embeddings are derived, not raw profile data
- No storage of match profile data beyond session

**Cost Estimate:**
- Titan Embeddings: ~$0.0001 per embedding pair
- Claude Haiku generation: ~$0.0005 per set
- **Total for 100K match pairs/month:** ~$60/month

**Implementation Priority:** MEDIUM
- Enhances existing icebreaker functionality

---

### 2.4 Conversation Flow Assistance with Stall Detection

**Feature Description:**
Proactively detect when conversations are stalling and provide actionable suggestions to revive engagement, including topic pivots and escalation timing.

**AI/ML Approach:**
- **Stall Detection:** Time-series analysis of message frequency and length
- **Topic Modeling:** LDA on conversation to identify exhausted topics
- **Revival Suggestions:** Claude-generated pivots to fresh topics

**Data Requirements:**
```python
ConversationFlowState = {
    "conversation_id": str,
    "messages_per_hour": List[float],  # time series
    "avg_message_length_trend": float,  # slope
    "topics_discussed": List[str],
    "questions_unanswered": List[str],
    "sentiment_trend": float,
    "last_substantive_exchange": datetime
}
```

**API Contract:**
```yaml
GET /api/v1/conversation/{conversation_id}/flow-analysis
Response:
  health_score: float
  status: enum (thriving | stable | stalling | stalled)
  stall_indicators:
    - indicator: string
      severity: float
  revival_suggestions:
    - type: enum (topic_pivot | question | callback | escalation)
      suggestion: string
      sample_message: string
      timing: string
```

**Privacy/Security Considerations:**
- Analysis only triggered for user requesting it
- No proactive push without user opt-in
- Data retained only during active conversation

**Cost Estimate:**
- Compute for flow analysis: ~$50/month
- Claude suggestions on-demand: ~$200/month
- **Total:** ~$250/month

**Implementation Priority:** MEDIUM
- Complements existing conversation analyzer

---

## 3. CONTENT & SAFETY ENHANCEMENTS

### 3.1 Enhanced Photo Verification with Liveness Detection

**Feature Description:**
Upgrade the existing photo verification with advanced liveness detection using random pose challenges and 3D depth estimation to prevent photo-based spoofing.

**AI/ML Approach:**
- **Primary:** AWS Rekognition with custom challenges
- **Secondary:** MediaPipe for pose estimation
- **Tertiary:** Depth estimation from single image (monocular depth)

**Data Requirements:**
```python
VerificationSession = {
    "user_id": str,
    "session_id": str,
    "challenges": [
        {"type": "turn_left", "completed": bool, "confidence": float},
        {"type": "smile", "completed": bool, "confidence": float},
        {"type": "blink", "completed": bool, "confidence": float}
    ],
    "depth_map_consistency": float,
    "face_match_score": float,  # vs profile photos
    "device_motion_data": object  # for 3D verification
}
```

**API Contract:**
```yaml
POST /api/v1/verification/start-liveness
Request:
  user_id: string
  verification_type: enum (standard | enhanced | premium)
Response:
  session_id: string
  challenges:
    - challenge_id: string
      instruction: string
      timeout_seconds: integer

POST /api/v1/verification/submit-frame
Request:
  session_id: string
  challenge_id: string
  frame_data: base64
  device_motion: object (optional)
Response:
  challenge_result:
    passed: boolean
    confidence: float
    feedback: string (if failed)
  session_progress: float
```

**Privacy/Security Considerations:**
- Verification frames deleted after 24 hours
- Face embeddings stored separately from photos
- Users can request verification data deletion
- Challenge randomization prevents replay attacks

**Cost Estimate:**
- AWS Rekognition DetectFaces: $1 per 1,000 images
- Enhanced processing (pose, depth): ~$0.002 per verification
- At 10K verifications/month: ~$30/month Rekognition + ~$100 compute
- **Total:** ~$130/month

**Implementation Priority:** HIGH
- Critical for platform trust and safety

---

### 3.2 AI-Powered Bio Optimization Suggestions

**Feature Description:**
Analyze user bios and provide specific, actionable suggestions to improve match rates, highlighting what works for similar users.

**AI/ML Approach:**
- **Success Prediction:** XGBoost model trained on bio features vs match rates
- **A/B Insight Extraction:** Identify high-performing bio patterns
- **Suggestion Generation:** Claude with examples of successful bios

**Data Requirements:**
```python
BioAnalysis = {
    "user_id": str,
    "current_bio": str,
    "bio_features": {
        "length": int,
        "question_count": int,
        "humor_score": float,
        "specificity_score": float,
        "authenticity_indicators": float
    },
    "predicted_match_rate": float,
    "similar_successful_bios": List[str]  # anonymized patterns
}
```

**API Contract:**
```yaml
POST /api/v1/profile/bio-optimize
Request:
  user_id: string
  current_bio: string
  goals: string[] (optional, e.g., ["more_matches", "serious_relationship"])
Response:
  analysis:
    current_score: float
    predicted_improvement: float
  suggestions:
    - category: enum (length | specificity | humor | authenticity | questions)
      current_state: string
      suggestion: string
      example_improvement: string
      expected_impact: float
  rewrite_options:
    - version: string
      style: string
      predicted_score: float
```

**Privacy/Security Considerations:**
- Bio patterns are learned from aggregate data, never individual bios
- Suggestions don't reveal other users' profiles
- User can opt-out of bio data being used for training

**Cost Estimate:**
- Model training (monthly): ~$50
- Claude suggestions: ~$0.001 per analysis
- At 20K analyses/month: ~$70/month
- **Total:** ~$120/month

**Implementation Priority:** MEDIUM
- Good user value, builds on existing NLP service

---

### 3.3 Enhanced Content Moderation with Context Awareness

**Feature Description:**
Improve the existing moderation service with context-aware analysis that understands dating-app-specific nuances (flirting vs harassment, playful vs inappropriate).

**AI/ML Approach:**
- **Primary:** AWS Rekognition + Azure Content Moderator (existing)
- **Enhancement:** Claude-based context analysis for borderline cases
- **Training Data:** Human-labeled dating context examples

**Data Requirements:**
```python
ModerationContext = {
    "content_type": Enum["message", "bio", "photo_caption"],
    "relationship_stage": Enum["new_match", "chatting", "established"],
    "prior_consent_signals": bool,  # e.g., both users flirting
    "conversation_context": List[str],  # surrounding messages
    "cultural_context": str  # user locations
}
```

**API Contract:**
```yaml
POST /api/v1/moderation/analyze-contextual
Request:
  content_id: string
  content_type: string
  content: string
  context:
    conversation_id: string (optional)
    sender_id: string
    receiver_id: string
Response:
  decision: enum (allow | flag | review | block)
  confidence: float
  context_factors:
    - factor: string
      impact: enum (mitigating | aggravating | neutral)
  human_review_recommended: boolean
  explanation: string (for user if blocked)
```

**Privacy/Security Considerations:**
- Context analysis doesn't store conversation content
- Human reviewers see anonymized content
- Appeals process available for blocked content

**Cost Estimate:**
- Claude context analysis for borderline (5% of content): ~$500/month
- Additional storage for moderation logs: ~$50/month
- **Total:** ~$550/month

**Implementation Priority:** HIGH
- Reduces false positives that frustrate users
- Improves catch rate for sophisticated bad actors

---

### 3.4 Advanced Scam/Catfish Detection with Behavioral Analysis

**Feature Description:**
Extend the existing fraud detection with deep behavioral analysis including typing patterns, conversation flow anomalies, and cross-platform signal correlation.

**AI/ML Approach:**
- **Model:** Ensemble of anomaly detectors
- **Signals:**
  - Message timing patterns (bot detection)
  - Vocabulary consistency (multiple personas detection)
  - Photo reverse-search integration
  - Phone number/payment request patterns

**Data Requirements:**
```python
BehavioralSignals = {
    "user_id": str,
    "typing_pattern": {
        "avg_wpm": float,
        "variance": float,
        "correction_rate": float
    },
    "session_patterns": {
        "typical_hours": List[int],
        "session_duration_avg": float,
        "device_consistency": float
    },
    "conversation_patterns": {
        "topic_consistency": float,
        "escalation_speed": float,  # to money/personal info
        "story_consistency_score": float
    }
}
```

**API Contract:**
```yaml
POST /api/v1/safety/behavioral-analysis
Request:
  user_id: string
  analysis_depth: enum (quick | standard | deep)
Response:
  risk_assessment:
    overall_score: float (0-100)
    risk_level: enum (low | medium | high | critical)
  indicators:
    - category: string
      signal: string
      risk_contribution: float
      confidence: float
  recommended_actions:
    - action: string
      urgency: enum (immediate | soon | monitoring)
```

**Privacy/Security Considerations:**
- Behavioral signals are computed, not stored raw
- Analysis results visible only to safety team
- User notified if action taken, with appeal option
- No automated bans; human review for high-risk

**Cost Estimate:**
- Enhanced compute for behavioral modeling: ~$200/month
- Photo reverse-search API (for suspected catfish): ~$100/month
- **Total:** ~$300/month

**Implementation Priority:** HIGH
- Critical for user safety and platform reputation

---

## 4. PREDICTIVE FEATURES

### 4.1 Match Success Prediction

**Feature Description:**
Predict the likelihood of a match leading to meaningful conversation and eventual date, displayed as a "compatibility confidence" score.

**AI/ML Approach:**
- **Model:** Gradient Boosted Trees (XGBoost)
- **Features:**
  - Interest overlap vector
  - Communication style compatibility (from NLP)
  - Activity pattern alignment
  - Historical success rates for similar pairs
  - Geographic and demographic compatibility

**Data Requirements:**
```python
MatchSuccessFeatures = {
    "user_a_id": str,
    "user_b_id": str,
    "interest_overlap_score": float,
    "communication_style_similarity": float,
    "activity_pattern_correlation": float,
    "demographic_compatibility": float,
    "mutual_friend_connections": int,  # future
    "response_time_compatibility": float
}

SuccessLabels = {
    "had_conversation": bool,  # >5 messages each
    "conversation_sustained": bool,  # >24h span
    "exchanged_contacts": bool,
    "planned_date": bool,
    "confirmed_date": bool  # premium feedback
}
```

**API Contract:**
```yaml
GET /api/v1/predictions/match-success/{user_a_id}/{user_b_id}
Response:
  prediction:
    overall_success_probability: float
    conversation_probability: float
    date_probability: float
    confidence_interval: [float, float]
  contributing_factors:
    - factor: string
      impact: enum (positive | negative | neutral)
      strength: float
  compatibility_highlights:
    - highlight: string
```

**Privacy/Security Considerations:**
- Predictions shown only to the requesting user
- Model doesn't leak information about other user's history
- Predictions are advisory, don't affect visibility

**Cost Estimate:**
- Model inference: ~$0.0001 per prediction
- At 1M predictions/month: ~$100/month
- Model retraining (weekly): ~$50/month
- **Total:** ~$150/month

**Implementation Priority:** MEDIUM
- Valuable but needs good historical data

---

### 4.2 Optimal Messaging Time Prediction

**Feature Description:**
Predict the best time to send a message for maximum response probability, based on match's activity patterns and general engagement data.

**AI/ML Approach:**
- **Model:** Time-series analysis with attention mechanism
- **Personalization:** Individual user active hours + general patterns
- **Output:** Probability distribution over next 24 hours

**Data Requirements:**
```python
ActivityPattern = {
    "user_id": str,
    "hourly_activity": Dict[int, float],  # 0-23 -> activity level
    "day_of_week_pattern": Dict[str, float],
    "response_time_by_hour": Dict[int, float],
    "last_seen_times": List[datetime]  # last 7 days
}
```

**API Contract:**
```yaml
GET /api/v1/predictions/optimal-send-time/{conversation_id}
Response:
  optimal_times:
    - time_window: string  # "Today 7pm-9pm"
      probability: float
      reason: string
    - time_window: string
      probability: float
      reason: string
  current_time_score: float
  recommendation: string  # "Send now" or "Wait until..."
```

**Privacy/Security Considerations:**
- Active hours derived from aggregate, not exposed directly
- Users can disable activity tracking in settings
- No indication to matches that timing is optimized

**Cost Estimate:**
- Minimal compute for time predictions
- **Total:** ~$50/month

**Implementation Priority:** LOW
- Nice feature but not critical

---

### 4.3 Compatibility Scoring with Explainability

**Feature Description:**
Enhance the existing compatibility scoring with detailed, human-readable explanations of why two users are compatible, useful for user confidence and premium features.

**AI/ML Approach:**
- **Base Model:** Existing hybrid recommender
- **Explainability Layer:** SHAP values for feature importance
- **Narrative Generation:** Claude converts SHAP to natural language

**Data Requirements:**
```python
CompatibilityBreakdown = {
    "user_a_id": str,
    "user_b_id": str,
    "overall_score": float,
    "feature_contributions": {
        "shared_interests": {"score": float, "shap_value": float},
        "location_proximity": {"score": float, "shap_value": float},
        "communication_style": {"score": float, "shap_value": float},
        "life_goals_alignment": {"score": float, "shap_value": float},
        "activity_compatibility": {"score": float, "shap_value": float}
    }
}
```

**API Contract:**
```yaml
GET /api/v1/compatibility/{user_a_id}/{user_b_id}/explained
Response:
  score: float
  explanation:
    summary: string  # "You're 87% compatible because..."
    top_factors:
      - factor: string
        contribution: float
        detail: string
    potential_challenges:
      - challenge: string
        severity: enum (minor | moderate | significant)
    conversation_starters_based_on_compatibility:
      - starter: string
        based_on: string
```

**Privacy/Security Considerations:**
- Explanations don't reveal raw data about match
- Premium feature to limit API abuse
- Cached to prevent repeated Claude calls

**Cost Estimate:**
- SHAP computation: ~$0.0005 per pair
- Claude narrative: ~$0.001 per explanation
- At 50K explanations/month: ~$75/month
- **Total:** ~$75/month

**Implementation Priority:** MEDIUM
- Premium feature with good monetization potential

---

### 4.4 Churn Prediction with Intervention Triggers

**Feature Description:**
Predict users likely to become inactive and trigger proactive engagement to retain them.

**AI/ML Approach:**
- **Model:** Survival analysis with Cox Proportional Hazards
- **Features:**
  - Days since last login
  - Match rate trend
  - Conversation success rate
  - Profile completeness
  - Subscription status

**Data Requirements:**
```python
ChurnSignals = {
    "user_id": str,
    "login_frequency_trend": float,
    "swipe_rate_trend": float,
    "match_rate_7d": float,
    "messages_sent_7d": int,
    "profile_last_updated": datetime,
    "subscription_end_date": datetime,
    "frustration_signals": List[str]  # e.g., deleted matches, reported users
}
```

**API Contract:**
```yaml
Internal API (for automation service):
GET /api/v1/predictions/churn-risk
Response:
  at_risk_users:
    - user_id: string
      churn_probability_7d: float
      churn_probability_30d: float
      primary_risk_factors:
        - factor: string
          severity: float
      recommended_interventions:
        - intervention_type: enum (boost | notification | feature_highlight | discount)
          message_template: string
          expected_retention_lift: float
```

**Privacy/Security Considerations:**
- Churn predictions used only for engagement, not shared
- Users aren't aware of their churn risk score
- Interventions feel organic, not desperate

**Cost Estimate:**
- Model training: ~$100/month
- Inference (daily batch): ~$50/month
- **Total:** ~$150/month

**Implementation Priority:** HIGH
- Direct revenue impact through retention

---

## 5. AUTOMATION ENHANCEMENTS

### 5.1 Auto-Profile Completion with Guided Prompts

**Feature Description:**
Guide users through profile completion with AI-generated questions based on what's missing and what drives matches in their demographic.

**AI/ML Approach:**
- **Gap Analysis:** Rule-based detection of missing fields
- **Question Generation:** Claude generates personalized prompts
- **Completion Prediction:** ML model predicts profile strength

**Data Requirements:**
```python
ProfileCompleteness = {
    "user_id": str,
    "filled_fields": List[str],
    "missing_fields": List[str],
    "current_strength_score": float,
    "demographic_benchmarks": {
        "avg_photos": float,
        "avg_bio_length": int,
        "common_interests": List[str]
    }
}
```

**API Contract:**
```yaml
GET /api/v1/profile/completion-guide/{user_id}
Response:
  current_completeness: float
  priority_additions:
    - field: string
      importance: float
      personalized_prompt: string  # "What's your go-to weekend activity?"
      expected_impact: float
  ai_suggestions:
    - field: string
      suggested_content: string
      confidence: float
```

**Privacy/Security Considerations:**
- Suggestions based on aggregate patterns, not specific users
- User retains full control over what to add
- Generated content is clearly marked as AI-suggested

**Cost Estimate:**
- Claude prompts: ~$0.0005 per guide
- At 30K new users/month: ~$15/month
- **Total:** ~$15/month

**Implementation Priority:** MEDIUM
- Improves onboarding and user activation

---

### 5.2 Smart Photo Ordering with Engagement Prediction

**Feature Description:**
Automatically suggest optimal photo order based on predicted engagement, with A/B testing to continuously improve.

**AI/ML Approach:**
- **Model:** CNN feature extraction + engagement prediction
- **Optimization:** Multi-armed bandit for photo order
- **Feedback:** Swipe-right rate per photo position

**Data Requirements:**
```python
PhotoEngagementData = {
    "photo_id": str,
    "user_id": str,
    "features": {
        "face_detected": bool,
        "smile_score": float,
        "quality_score": float,
        "activity_depicted": str,
        "social_context": str  # solo, group, pet
    },
    "engagement_by_position": Dict[int, float]  # position -> swipe_right_rate
}
```

**API Contract:**
```yaml
POST /api/v1/photos/optimize-order
Request:
  user_id: string
  photo_ids: string[]
Response:
  optimized_order: string[]
  expected_improvement: float
  per_photo_insights:
    - photo_id: string
      recommended_position: int
      strengths: string[]
      potential_improvements: string[]
```

**Privacy/Security Considerations:**
- Photo analysis results not shared with other users
- Users can override auto-ordering
- Engagement data is aggregate, not individual viewer data

**Cost Estimate:**
- Photo analysis (existing Rekognition): included
- Optimization compute: ~$100/month
- **Total:** ~$100/month

**Implementation Priority:** LOW
- Enhancement to existing photo service

---

### 5.3 Automated Match Explanations

**Feature Description:**
Generate personalized explanations for why users matched, displayed when match is made to encourage conversation initiation.

**AI/ML Approach:**
- **Feature Extraction:** Pull top contributing factors from recommender
- **Narrative Generation:** Claude creates conversational explanation
- **Personalization:** Adapt tone to user's communication style

**Data Requirements:**
```python
MatchContext = {
    "user_a_id": str,
    "user_b_id": str,
    "compatibility_factors": List[{"factor": str, "score": float}],
    "shared_interests": List[str],
    "conversation_starter_hooks": List[str],
    "match_timestamp": datetime
}
```

**API Contract:**
```yaml
GET /api/v1/matches/{match_id}/explanation
Response:
  explanation:
    headline: string  # "You both love hiking and sushi!"
    detailed: string  # "Based on your profiles..."
    icebreaker_suggestions:
      - suggestion: string
        based_on: string
    fun_fact: string  # "Only 3% of users share all 5 of your top interests!"
```

**Privacy/Security Considerations:**
- Explanations symmetrical (both users see same shared interests)
- No exposure of non-shared profile data
- Cached per match to reduce costs

**Cost Estimate:**
- Claude generation: ~$0.0005 per match
- At 200K matches/month: ~$100/month
- **Total:** ~$100/month

**Implementation Priority:** MEDIUM
- Improves match-to-conversation conversion

---

### 5.4 Interest-Based Grouping with Community Detection

**Feature Description:**
Automatically identify and group users with similar interests for potential community features and targeted recommendations.

**AI/ML Approach:**
- **Algorithm:** Louvain community detection on interest graph
- **Embedding:** Interest vectors using sentence-transformers
- **Clustering:** Hierarchical clustering for nested groups

**Data Requirements:**
```python
InterestGraph = {
    "nodes": List[{"user_id": str, "interest_embedding": float[]}],
    "edges": List[{"user_a": str, "user_b": str, "shared_interests": int}]
}

DetectedCommunities = {
    "communities": List[{
        "community_id": str,
        "theme": str,
        "member_count": int,
        "defining_interests": List[str],
        "engagement_potential": float
    }]
}
```

**API Contract:**
```yaml
GET /api/v1/communities/detected
Response:
  communities:
    - id: string
      name: string  # AI-generated: "Adventure Seekers"
      description: string
      member_count: int
      sample_interests: string[]
      your_affinity: float  # for requesting user

GET /api/v1/users/{user_id}/communities
Response:
  primary_communities:
    - community_id: string
      affinity_score: float
      recommended_matches_in_community: int
```

**Privacy/Security Considerations:**
- Community membership is derived, not explicit
- Users can opt-out of community features
- Community themes are aggregate, not individual-revealing

**Cost Estimate:**
- Community detection (weekly batch): ~$100/month
- Embedding computation: ~$50/month
- **Total:** ~$150/month

**Implementation Priority:** LOW
- Foundation for future community features

---

## Implementation Roadmap

### Phase 1: Critical Enhancements (Weeks 1-4)
| Enhancement | Priority | Est. Effort | Monthly Cost |
|-------------|----------|-------------|--------------|
| 1.4 Implicit Preference Learning | HIGH | 2 weeks | $150 |
| 2.1 Proactive Dating Coach | HIGH | 3 weeks | $850 |
| 3.1 Enhanced Photo Verification | HIGH | 2 weeks | $130 |
| 3.4 Advanced Scam Detection | HIGH | 2 weeks | $300 |
| 4.4 Churn Prediction | HIGH | 2 weeks | $150 |

**Phase 1 Total Monthly Cost:** ~$1,580

### Phase 2: User Experience (Weeks 5-8)
| Enhancement | Priority | Est. Effort | Monthly Cost |
|-------------|----------|-------------|--------------|
| 1.1 Contextual Recommendations | HIGH | 2 weeks | $300 |
| 1.3 Personalized Conversation Starters | HIGH | 2 weeks | $2,500 |
| 3.2 Bio Optimization | MEDIUM | 1 week | $120 |
| 3.3 Context-Aware Moderation | HIGH | 2 weeks | $550 |
| 5.3 Match Explanations | MEDIUM | 1 week | $100 |

**Phase 2 Total Monthly Cost:** ~$3,570

### Phase 3: Differentiation (Weeks 9-12)
| Enhancement | Priority | Est. Effort | Monthly Cost |
|-------------|----------|-------------|--------------|
| 1.2 Adaptive Discovery | MEDIUM | 2 weeks | $100 |
| 2.2 Tone-Matched Smart Replies | MEDIUM | 2 weeks | $3,600 |
| 2.4 Conversation Flow Assistance | MEDIUM | 1 week | $250 |
| 4.1 Match Success Prediction | MEDIUM | 2 weeks | $150 |
| 4.3 Compatibility Explainability | MEDIUM | 1 week | $75 |

**Phase 3 Total Monthly Cost:** ~$4,175

### Phase 4: Future Enhancements (Weeks 13+)
| Enhancement | Priority | Est. Effort | Monthly Cost |
|-------------|----------|-------------|--------------|
| 2.3 Mutual Interest Icebreakers | MEDIUM | 1 week | $60 |
| 4.2 Optimal Send Time | LOW | 1 week | $50 |
| 5.1 Auto Profile Completion | MEDIUM | 1 week | $15 |
| 5.2 Smart Photo Ordering | LOW | 1 week | $100 |
| 5.4 Interest-Based Grouping | LOW | 2 weeks | $150 |

**Phase 4 Total Monthly Cost:** ~$375

---

## Total Cost Summary

| Phase | Monthly Cost | Cumulative |
|-------|-------------|------------|
| Phase 1 | $1,580 | $1,580 |
| Phase 2 | $3,570 | $5,150 |
| Phase 3 | $4,175 | $9,325 |
| Phase 4 | $375 | $9,700 |

**Total All Enhancements:** ~$9,700/month at scale

### Cost Optimization Strategies
1. **Caching:** Cache Claude responses for common patterns (60% reduction)
2. **Batching:** Batch Bedrock calls during off-peak hours
3. **Tiering:** Use Haiku for simple tasks, Sonnet only for complex analysis
4. **Edge Inference:** Move simple models to edge for real-time with Lambda@Edge

---

## Technical Integration Notes

### Extending Existing Services

1. **HybridRecommender** (`recommendation-service/app/ml/models/hybrid_recommender.py`):
   - Add `ContextualRecommender` subclass
   - Integrate contextual features into `_calculate_adaptive_weights()`

2. **IcebreakerGeneratorService** (`content-generator/app/services/icebreaker_generator.py`):
   - Add user style profile loading
   - Implement feedback loop for learning

3. **ConversationAnalyzerService** (`nlp-service/app/services/conversation_analyzer.py`):
   - Add stall detection methods
   - Integrate with coach service for proactive interventions

4. **FraudDetectorService** (`fraud-detection/services/fraud_detector.py`):
   - Add behavioral pattern analysis
   - Integrate typing pattern detection

5. **AWSRekognitionService** (`deepfake-detection/services/aws_rekognition.py`):
   - Add liveness challenge generation
   - Integrate depth estimation

### New Services Required

1. **ChurnPredictionService** - New microservice for retention predictions
2. **ExplainabilityService** - SHAP-based model explanation generator
3. **CommunityDetectionService** - Interest graph analysis (can be batch job)

---

## Success Metrics

| Enhancement Category | Primary Metric | Target |
|---------------------|----------------|--------|
| Personalization | Match-to-conversation rate | +15% |
| Conversational AI | Avg conversation length | +25% |
| Content & Safety | False positive rate | -30% |
| Predictive | 7-day retention | +10% |
| Automation | Profile completion rate | +20% |

---

**Document Prepared By:** Agent C - AI Capability Architect
**Review Status:** Ready for Technical Review
**Next Steps:** Technical feasibility review with Agent B (Backend), cost approval with stakeholders
