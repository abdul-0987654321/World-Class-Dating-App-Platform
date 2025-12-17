"""Advanced fraud detection system for dating platform."""

import logging
from typing import Dict, Any, List, Optional, Set
import numpy as np
from datetime import datetime, timedelta
import re
from collections import Counter
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import pickle

logger = logging.getLogger(__name__)


class FraudNeuralNetwork(nn.Module):
    """Neural network for fraud detection."""

    def __init__(self, input_dim: int = 80):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.1),

            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)


class ProfileAnalyzer:
    """Analyzes user profiles for fraud indicators."""

    SUSPICIOUS_KEYWORDS = {
        'scam': ['investment', 'bitcoin', 'crypto', 'trading', 'business opportunity',
                 'wire transfer', 'western union', 'gift card', 'iTunes', 'amazon card'],
        'romance_scam': ['deployed', 'oil rig', 'engineer abroad', 'UN worker', 'military',
                         'stuck abroad', 'customs fee', 'package', 'inheritance'],
        'fake_profile': ['model', 'Instagram model', 'lonely', 'widow', 'widower',
                        'looking for serious', 'God fearing', 'down to earth'],
        'solicitation': ['escort', 'massage', 'donations', 'sugar', 'arrangement',
                        'allowance', 'financial help', 'sponsor']
    }

    SUSPICIOUS_PATTERNS = [
        r'\b(?:whatsapp|telegram|kik|wickr)\s*[:=]?\s*\+?\d+',  # Messaging app with number
        r'\b\d{10,}\b',  # Long number sequences (phone numbers)
        r'(?:contact|text|message)\s+me\s+(?:at|on)',  # Contact me at...
        r'\$\d+',  # Money amounts
        r'\b(?:click|visit|check)\s+(?:link|here|this)',  # Link solicitation
    ]

    @staticmethod
    def analyze_bio(bio: str) -> Dict[str, Any]:
        """Analyze bio for fraud indicators."""
        if not bio:
            return {"risk_score": 0.0, "flags": []}

        bio_lower = bio.lower()
        flags = []
        risk_score = 0.0

        # Check for suspicious keywords
        for category, keywords in ProfileAnalyzer.SUSPICIOUS_KEYWORDS.items():
            matches = [kw for kw in keywords if kw in bio_lower]
            if matches:
                flags.append(f"suspicious_keywords_{category}")
                risk_score += 0.3 * len(matches)

        # Check for suspicious patterns
        for pattern in ProfileAnalyzer.SUSPICIOUS_PATTERNS:
            if re.search(pattern, bio, re.IGNORECASE):
                flags.append(f"suspicious_pattern_{pattern[:20]}")
                risk_score += 0.2

        # Check bio length (too short or too long can be suspicious)
        if len(bio) < 20:
            flags.append("bio_too_short")
            risk_score += 0.1
        elif len(bio) > 1000:
            flags.append("bio_too_long")
            risk_score += 0.05

        # Check for excessive URLs
        url_count = len(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', bio))
        if url_count > 0:
            flags.append("contains_urls")
            risk_score += 0.3 * url_count

        # Check for excessive contact info
        email_count = len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', bio))
        if email_count > 0:
            flags.append("contains_email")
            risk_score += 0.2

        return {
            "risk_score": min(1.0, risk_score),
            "flags": flags
        }

    @staticmethod
    def analyze_photos(photo_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze photos for fraud indicators."""
        flags = []
        risk_score = 0.0

        if not photo_data:
            flags.append("no_photos")
            return {"risk_score": 1.0, "flags": flags}

        photo_count = len(photo_data)

        # Too few photos
        if photo_count < 2:
            flags.append("insufficient_photos")
            risk_score += 0.3

        # Check for AI-generated or stock photos
        ai_generated_count = sum(1 for p in photo_data if p.get('is_ai_generated', False))
        if ai_generated_count > 0:
            flags.append(f"ai_generated_photos_{ai_generated_count}")
            risk_score += 0.5 * (ai_generated_count / photo_count)

        # Check for professional/stock photos
        professional_count = sum(1 for p in photo_data if p.get('is_professional', False))
        if professional_count > photo_count * 0.7:
            flags.append("mostly_professional_photos")
            risk_score += 0.3

        # Check for inconsistent faces
        has_face = sum(1 for p in photo_data if p.get('has_face', False))
        if has_face < photo_count * 0.5:
            flags.append("missing_faces")
            risk_score += 0.4

        # Check photo upload timing (all at once is suspicious)
        if photo_data:
            upload_times = [p.get('upload_time', datetime.now()) for p in photo_data]
            if isinstance(upload_times[0], str):
                upload_times = [datetime.fromisoformat(t.replace('Z', '+00:00')) for t in upload_times]

            time_span = max(upload_times) - min(upload_times)
            if time_span < timedelta(minutes=5) and photo_count > 3:
                flags.append("bulk_photo_upload")
                risk_score += 0.2

        return {
            "risk_score": min(1.0, risk_score),
            "flags": flags
        }


class BehaviorAnalyzer:
    """Analyzes user behavior for fraud patterns."""

    @staticmethod
    def analyze_messaging_behavior(
        message_history: List[Dict[str, Any]],
        user_id: str
    ) -> Dict[str, Any]:
        """Analyze messaging patterns for fraud indicators."""
        flags = []
        risk_score = 0.0

        if not message_history:
            return {"risk_score": 0.0, "flags": []}

        user_messages = [m for m in message_history if m.get('sender_id') == user_id]

        if not user_messages:
            return {"risk_score": 0.0, "flags": []}

        # Check message frequency (spam)
        message_count = len(user_messages)
        time_span = (
            datetime.fromisoformat(user_messages[-1]['timestamp'].replace('Z', '+00:00')) -
            datetime.fromisoformat(user_messages[0]['timestamp'].replace('Z', '+00:00'))
        ).total_seconds() / 3600  # hours

        if time_span > 0:
            messages_per_hour = message_count / time_span
            if messages_per_hour > 10:
                flags.append("high_message_frequency")
                risk_score += 0.3

        # Check for copy-paste messages
        message_texts = [m.get('text', '') for m in user_messages]
        unique_messages = len(set(message_texts))
        if message_count > 5 and unique_messages / message_count < 0.5:
            flags.append("repetitive_messages")
            risk_score += 0.4

        # Check for rapid contact info sharing
        first_messages = user_messages[:5] if len(user_messages) >= 5 else user_messages
        contact_info_pattern = r'(?:whatsapp|telegram|kik|phone|email|contact)'
        early_contact_share = sum(1 for m in first_messages if re.search(contact_info_pattern, m.get('text', ''), re.IGNORECASE))

        if early_contact_share > 0:
            flags.append("early_contact_info_sharing")
            risk_score += 0.5

        # Check for money-related terms
        money_pattern = r'(?:money|dollar|bitcoin|investment|loan|help|emergency)'
        money_mentions = sum(1 for m in user_messages if re.search(money_pattern, m.get('text', ''), re.IGNORECASE))

        if money_mentions > message_count * 0.2:
            flags.append("frequent_money_mentions")
            risk_score += 0.6

        return {
            "risk_score": min(1.0, risk_score),
            "flags": flags
        }

    @staticmethod
    def analyze_login_patterns(
        login_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze login patterns for suspicious activity."""
        flags = []
        risk_score = 0.0

        if not login_history:
            return {"risk_score": 0.0, "flags": []}

        # Check for logins from multiple locations
        locations = [l.get('location', 'unknown') for l in login_history]
        unique_locations = len(set(locations))

        if unique_locations > 5 and len(login_history) < 20:
            flags.append("multiple_locations")
            risk_score += 0.3

        # Check for suspicious location changes
        for i in range(len(login_history) - 1):
            time_diff = (
                datetime.fromisoformat(login_history[i+1]['timestamp'].replace('Z', '+00:00')) -
                datetime.fromisoformat(login_history[i]['timestamp'].replace('Z', '+00:00'))
            ).total_seconds() / 3600

            if time_diff < 2 and locations[i] != locations[i+1]:
                flags.append("impossible_travel")
                risk_score += 0.4
                break

        # Check for bot-like consistent login times
        if len(login_history) >= 7:
            login_hours = [
                datetime.fromisoformat(l['timestamp'].replace('Z', '+00:00')).hour
                for l in login_history
            ]
            hour_variance = np.var(login_hours)
            if hour_variance < 1.0:  # Very consistent login times
                flags.append("bot_like_consistency")
                risk_score += 0.2

        return {
            "risk_score": min(1.0, risk_score),
            "flags": flags
        }


class FraudDetector:
    """Main fraud detection service."""

    def __init__(self):
        self.nn_model: Optional[FraudNeuralNetwork] = None
        self.isolation_forest: Optional[IsolationForest] = None
        self.rf_classifier: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.profile_analyzer = ProfileAnalyzer()
        self.behavior_analyzer = BehaviorAnalyzer()

    async def initialize(self):
        """Initialize models and resources."""
        logger.info("Initializing Fraud Detector...")

        try:
            # Initialize neural network
            self.nn_model = FraudNeuralNetwork(input_dim=80)
            self.nn_model.to(self.device)
            self.nn_model.eval()

            # Initialize anomaly detection
            self.isolation_forest = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )

            # Initialize random forest classifier
            self.rf_classifier = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )

            # Initialize scaler
            self.scaler = StandardScaler()

            # Try to load pre-trained models
            try:
                self._load_models()
                logger.info("Loaded pre-trained fraud detection models")
            except FileNotFoundError:
                logger.warning("Pre-trained models not found, using initialized models")

            logger.info("Fraud Detector initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize fraud detector: {e}")
            raise

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Fraud Detector")
        if self.nn_model:
            del self.nn_model
            self.nn_model = None

    async def detect_fraud(
        self,
        user_data: Dict[str, Any],
        include_details: bool = True
    ) -> Dict[str, Any]:
        """
        Detect fraud indicators for a user.

        Args:
            user_data: User profile and activity data
            include_details: Whether to include detailed analysis

        Returns:
            Fraud detection results with risk score and flags
        """
        try:
            # Analyze different aspects
            profile_analysis = self._analyze_profile(user_data)
            behavior_analysis = self._analyze_behavior(user_data)
            anomaly_score = await self._detect_anomalies(user_data)

            # Extract features for ML models
            features = self._extract_features(user_data, profile_analysis, behavior_analysis)

            # Get predictions from models
            nn_score = await self._predict_nn(features)
            rf_score = await self._predict_rf(features)

            # Combine scores
            final_risk_score = self._combine_scores(
                profile_analysis['risk_score'],
                behavior_analysis['risk_score'],
                anomaly_score,
                nn_score,
                rf_score
            )

            # Determine risk level
            risk_level = self._get_risk_level(final_risk_score)

            # Collect all flags
            all_flags = (
                profile_analysis.get('flags', []) +
                behavior_analysis.get('flags', [])
            )

            # Generate recommendations
            recommendations = self._generate_recommendations(final_risk_score, all_flags)

            result = {
                "risk_score": round(final_risk_score * 100, 2),
                "risk_level": risk_level,
                "is_suspicious": final_risk_score >= 0.6,
                "requires_review": final_risk_score >= 0.4,
                "flags": list(set(all_flags)),
                "recommendations": recommendations,
                "timestamp": datetime.utcnow().isoformat()
            }

            if include_details:
                result["details"] = {
                    "profile_analysis": profile_analysis,
                    "behavior_analysis": behavior_analysis,
                    "anomaly_score": round(anomaly_score, 2),
                    "model_scores": {
                        "neural_network": round(nn_score, 2),
                        "random_forest": round(rf_score, 2)
                    }
                }

            return result

        except Exception as e:
            logger.error(f"Fraud detection failed: {e}")
            raise

    def _analyze_profile(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user profile for fraud indicators."""
        bio_analysis = self.profile_analyzer.analyze_bio(user_data.get('bio', ''))
        photo_analysis = self.profile_analyzer.analyze_photos(user_data.get('photos', []))

        # Combine analyses
        combined_risk = (bio_analysis['risk_score'] + photo_analysis['risk_score']) / 2

        return {
            "risk_score": combined_risk,
            "flags": bio_analysis['flags'] + photo_analysis['flags']
        }

    def _analyze_behavior(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user behavior for fraud indicators."""
        messaging_analysis = self.behavior_analyzer.analyze_messaging_behavior(
            user_data.get('message_history', []),
            user_data.get('user_id', '')
        )

        login_analysis = self.behavior_analyzer.analyze_login_patterns(
            user_data.get('login_history', [])
        )

        # Combine analyses
        combined_risk = (messaging_analysis['risk_score'] + login_analysis['risk_score']) / 2

        return {
            "risk_score": combined_risk,
            "flags": messaging_analysis['flags'] + login_analysis['flags']
        }

    async def _detect_anomalies(self, user_data: Dict[str, Any]) -> float:
        """Detect anomalous patterns using Isolation Forest."""
        try:
            # Extract numerical features
            features = self._extract_numerical_features(user_data)
            feature_vector = np.array(list(features.values())).reshape(1, -1)

            # Get anomaly score
            if self.isolation_forest:
                anomaly_score = self.isolation_forest.score_samples(feature_vector)[0]
                # Convert to 0-1 range (more negative = more anomalous)
                normalized_score = max(0, min(1, (anomaly_score + 0.5) / -1.0))
                return normalized_score

            return 0.0

        except Exception as e:
            logger.warning(f"Anomaly detection failed: {e}")
            return 0.0

    def _extract_features(
        self,
        user_data: Dict[str, Any],
        profile_analysis: Dict[str, Any],
        behavior_analysis: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract features for ML models."""
        features = {}

        # Profile features
        features['profile_risk'] = profile_analysis['risk_score']
        features['profile_flag_count'] = len(profile_analysis['flags'])
        features['bio_length'] = len(user_data.get('bio', ''))
        features['photo_count'] = len(user_data.get('photos', []))

        # Behavior features
        features['behavior_risk'] = behavior_analysis['risk_score']
        features['behavior_flag_count'] = len(behavior_analysis['flags'])
        features['message_count'] = len(user_data.get('message_history', []))
        features['match_count'] = user_data.get('match_count', 0)
        features['conversation_count'] = user_data.get('conversation_count', 0)

        # Account age features
        if 'created_at' in user_data:
            account_age = (datetime.utcnow() - datetime.fromisoformat(user_data['created_at'].replace('Z', '+00:00'))).days
            features['account_age_days'] = account_age
        else:
            features['account_age_days'] = 0

        # Activity features
        features['login_count'] = len(user_data.get('login_history', []))
        features['report_count'] = user_data.get('report_count', 0)
        features['block_count'] = user_data.get('block_count', 0)

        # Response patterns
        features['response_rate'] = user_data.get('response_rate', 0.5)
        features['average_response_time'] = user_data.get('average_response_time_minutes', 60)

        return features

    def _extract_numerical_features(self, user_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract numerical features for anomaly detection."""
        return {
            'message_count': len(user_data.get('message_history', [])),
            'photo_count': len(user_data.get('photos', [])),
            'match_count': user_data.get('match_count', 0),
            'login_count': len(user_data.get('login_history', [])),
            'bio_length': len(user_data.get('bio', '')),
            'response_rate': user_data.get('response_rate', 0.5),
            'report_count': user_data.get('report_count', 0)
        }

    async def _predict_nn(self, features: Dict[str, float]) -> float:
        """Get prediction from neural network."""
        try:
            # Convert to tensor
            feature_values = [features.get(k, 0.0) for k in sorted(features.keys())]
            # Pad to 80 dimensions
            while len(feature_values) < 80:
                feature_values.append(0.0)
            feature_values = feature_values[:80]

            feature_tensor = torch.FloatTensor(feature_values).unsqueeze(0).to(self.device)

            with torch.no_grad():
                score = self.nn_model(feature_tensor)
                return float(score.item())

        except Exception as e:
            logger.warning(f"Neural network prediction failed: {e}")
            return 0.5

    async def _predict_rf(self, features: Dict[str, float]) -> float:
        """Get prediction from random forest."""
        try:
            feature_values = [features.get(k, 0.0) for k in sorted(features.keys())]
            feature_array = np.array(feature_values).reshape(1, -1)

            if self.scaler:
                feature_array = self.scaler.transform(feature_array)

            # Get probability of fraud class
            proba = self.rf_classifier.predict_proba(feature_array)[0]
            return float(proba[1] if len(proba) > 1 else proba[0])

        except Exception as e:
            logger.warning(f"Random forest prediction failed: {e}")
            return 0.5

    def _combine_scores(
        self,
        profile_score: float,
        behavior_score: float,
        anomaly_score: float,
        nn_score: float,
        rf_score: float
    ) -> float:
        """Combine multiple scores into final risk score."""
        # Weighted combination
        weights = {
            'profile': 0.25,
            'behavior': 0.25,
            'anomaly': 0.15,
            'nn': 0.20,
            'rf': 0.15
        }

        final_score = (
            profile_score * weights['profile'] +
            behavior_score * weights['behavior'] +
            anomaly_score * weights['anomaly'] +
            nn_score * weights['nn'] +
            rf_score * weights['rf']
        )

        return max(0.0, min(1.0, final_score))

    def _get_risk_level(self, score: float) -> str:
        """Get risk level category."""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "medium"
        elif score >= 0.2:
            return "low"
        else:
            return "minimal"

    def _generate_recommendations(
        self,
        risk_score: float,
        flags: List[str]
    ) -> List[str]:
        """Generate action recommendations based on risk assessment."""
        recommendations = []

        if risk_score >= 0.8:
            recommendations.append("URGENT: Suspend account immediately pending review")
            recommendations.append("Notify security team for investigation")
        elif risk_score >= 0.6:
            recommendations.append("Flag for manual review within 24 hours")
            recommendations.append("Restrict messaging capabilities temporarily")
        elif risk_score >= 0.4:
            recommendations.append("Monitor activity closely")
            recommendations.append("Require additional verification if needed")

        # Flag-specific recommendations
        if any('money' in flag for flag in flags):
            recommendations.append("Warn user about financial scams")

        if any('contact' in flag for flag in flags):
            recommendations.append("Review early contact information sharing")

        if any('photo' in flag for flag in flags):
            recommendations.append("Request additional photo verification")

        return recommendations

    def _load_models(self):
        """Load pre-trained models."""
        # Load neural network
        nn_path = "models/fraud_nn.pth"
        self.nn_model.load_state_dict(torch.load(nn_path, map_location=self.device))

        # Load random forest
        rf_path = "models/fraud_rf.pkl"
        with open(rf_path, 'rb') as f:
            self.rf_classifier = pickle.load(f)

        # Load isolation forest
        if_path = "models/fraud_isolation_forest.pkl"
        with open(if_path, 'rb') as f:
            self.isolation_forest = pickle.load(f)

        # Load scaler
        scaler_path = "models/fraud_scaler.pkl"
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)

    def save_models(self):
        """Save models to disk."""
        torch.save(self.nn_model.state_dict(), "models/fraud_nn.pth")

        with open("models/fraud_rf.pkl", 'wb') as f:
            pickle.dump(self.rf_classifier, f)

        with open("models/fraud_isolation_forest.pkl", 'wb') as f:
            pickle.dump(self.isolation_forest, f)

        with open("models/fraud_scaler.pkl", 'wb') as f:
            pickle.dump(self.scaler, f)

        logger.info("Fraud detection models saved successfully")
