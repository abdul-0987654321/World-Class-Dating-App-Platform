"""Recommendation service for generating personalized profile recommendations."""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import structlog
from sentence_transformers import SentenceTransformer

from app.config import Settings
from app.services.vector_store import VectorStore

logger = structlog.get_logger()


class RecommendationService:
    """Service for generating profile recommendations."""

    def __init__(self, settings: Settings, vector_store: VectorStore):
        self.settings = settings
        self.vector_store = vector_store
        self.embedding_model: Optional[SentenceTransformer] = None

    async def initialize(self):
        """Initialize the recommendation service."""
        logger.info("Initializing recommendation service")

        # Load embedding model
        self.embedding_model = SentenceTransformer(self.settings.EMBEDDING_MODEL)

        logger.info("Recommendation service initialized")

    async def get_recommendations(
        self,
        user_id: str,
        location: Tuple[float, float],
        preferences: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
        exclude_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get personalized recommendations for a user.

        Args:
            user_id: ID of the user requesting recommendations
            location: (latitude, longitude) tuple
            preferences: User preferences for filtering
            limit: Maximum number of recommendations
            offset: Pagination offset
            exclude_ids: List of user IDs to exclude

        Returns:
            Dict with recommendations and metadata
        """
        logger.info("Getting recommendations", user_id=user_id, limit=limit)

        # Get user's embedding
        user_embedding = await self.vector_store.get_embedding(user_id)

        if user_embedding is None:
            # Generate embedding from profile if not cached
            profile = await self._get_user_profile(user_id)
            if profile:
                user_embedding = await self._generate_embedding(profile)
                await self.vector_store.store_embedding(user_id, user_embedding, profile)

        # Build filter for vector search
        filters = self._build_filters(user_id, preferences, exclude_ids)

        # Query vector store for similar profiles
        candidates = await self.vector_store.search(
            query_vector=user_embedding,
            filters=filters,
            limit=limit * 3,  # Get more candidates for re-ranking
            location=location
        )

        # Score and rank candidates
        scored_candidates = await self._score_candidates(
            user_id=user_id,
            candidates=candidates,
            location=location,
            preferences=preferences
        )

        # Apply pagination
        paginated = scored_candidates[offset:offset + limit]

        # Format results
        recommendations = []
        for candidate in paginated:
            recommendations.append({
                "user_id": candidate["user_id"],
                "compatibility_score": round(candidate["score"], 2),
                "distance_km": candidate.get("distance_km"),
                "common_interests": candidate.get("common_interests", []),
                "match_reasons": self._generate_match_reasons(candidate)
            })

        return {
            "profiles": recommendations,
            "total": len(scored_candidates),
            "has_more": len(scored_candidates) > offset + limit
        }

    async def calculate_compatibility(
        self,
        user_id_a: str,
        user_id_b: str
    ) -> Dict[str, Any]:
        """
        Calculate detailed compatibility score between two users.

        Args:
            user_id_a: First user ID
            user_id_b: Second user ID

        Returns:
            Dict with overall score and breakdown
        """
        # Get profiles
        profile_a = await self._get_user_profile(user_id_a)
        profile_b = await self._get_user_profile(user_id_b)

        if not profile_a or not profile_b:
            raise ValueError("One or both profiles not found")

        # Calculate component scores
        interest_score = self._calculate_interest_overlap(profile_a, profile_b)
        lifestyle_score = self._calculate_lifestyle_match(profile_a, profile_b)
        values_score = self._calculate_values_match(profile_a, profile_b)
        goals_score = self._calculate_goals_match(profile_a, profile_b)

        # Get embeddings for semantic similarity
        embedding_a = await self.vector_store.get_embedding(user_id_a)
        embedding_b = await self.vector_store.get_embedding(user_id_b)

        semantic_score = 0
        if embedding_a is not None and embedding_b is not None:
            semantic_score = self._cosine_similarity(embedding_a, embedding_b) * 100

        # Weighted combination
        overall_score = (
            interest_score * 0.20 +
            lifestyle_score * 0.15 +
            values_score * 0.15 +
            goals_score * 0.20 +
            semantic_score * 0.30
        )

        return {
            "overall_score": round(overall_score, 2),
            "breakdown": {
                "interests": round(interest_score, 2),
                "lifestyle": round(lifestyle_score, 2),
                "values": round(values_score, 2),
                "goals": round(goals_score, 2),
                "semantic_similarity": round(semantic_score, 2)
            },
            "common_interests": self._get_common_interests(profile_a, profile_b),
            "compatibility_insights": self._generate_insights(profile_a, profile_b)
        }

    async def update_user_embedding(
        self,
        user_id: str,
        profile_data: Dict[str, Any]
    ):
        """Update a user's embedding in the vector store."""
        embedding = await self._generate_embedding(profile_data)
        await self.vector_store.store_embedding(user_id, embedding, profile_data)
        logger.info("Updated user embedding", user_id=user_id)

    async def delete_user_embedding(self, user_id: str):
        """Delete a user's embedding from the vector store."""
        await self.vector_store.delete_embedding(user_id)
        logger.info("Deleted user embedding", user_id=user_id)

    async def find_similar_profiles(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Find profiles similar to a given user."""
        embedding = await self.vector_store.get_embedding(user_id)

        if embedding is None:
            raise ValueError(f"No embedding found for user {user_id}")

        similar = await self.vector_store.search(
            query_vector=embedding,
            filters={"user_id": {"$ne": user_id}},
            limit=limit
        )

        return [
            {
                "user_id": s["user_id"],
                "similarity_score": round(s["score"], 2)
            }
            for s in similar
        ]

    async def batch_update_embeddings(
        self,
        user_ids: List[str]
    ) -> Dict[str, Any]:
        """Batch update embeddings for multiple users."""
        updated = []
        failed = []

        for user_id in user_ids:
            try:
                profile = await self._get_user_profile(user_id)
                if profile:
                    embedding = await self._generate_embedding(profile)
                    await self.vector_store.store_embedding(user_id, embedding, profile)
                    updated.append(user_id)
                else:
                    failed.append({"user_id": user_id, "reason": "Profile not found"})
            except Exception as e:
                failed.append({"user_id": user_id, "reason": str(e)})

        return {"updated": updated, "failed": failed}

    # Private methods

    async def _get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from database."""
        # This would connect to your profile database
        # For now, return mock data
        return {
            "user_id": user_id,
            "bio": "Sample bio",
            "interests": ["hiking", "music", "travel"],
            "lifestyle": {
                "smoking": "never",
                "drinking": "socially",
                "exercise": "active"
            },
            "values": {
                "religion": "spiritual",
                "politics": "moderate"
            },
            "dating": {
                "looking_for": "relationship",
                "relationship_type": "monogamous"
            }
        }

    async def _generate_embedding(
        self,
        profile: Dict[str, Any]
    ) -> np.ndarray:
        """Generate embedding from profile data."""
        # Combine profile fields into text
        text_parts = []

        if profile.get("bio"):
            text_parts.append(profile["bio"])

        if profile.get("interests"):
            text_parts.append(f"Interests: {', '.join(profile['interests'])}")

        if profile.get("prompts"):
            for prompt in profile["prompts"]:
                text_parts.append(f"{prompt.get('question', '')}: {prompt.get('answer', '')}")

        if profile.get("lifestyle"):
            lifestyle = profile["lifestyle"]
            lifestyle_text = " ".join([f"{k}: {v}" for k, v in lifestyle.items()])
            text_parts.append(f"Lifestyle: {lifestyle_text}")

        if profile.get("dating"):
            dating = profile["dating"]
            text_parts.append(f"Looking for: {dating.get('looking_for', '')}")

        combined_text = " ".join(text_parts)

        # Generate embedding
        embedding = self.embedding_model.encode(combined_text)
        return embedding

    def _build_filters(
        self,
        user_id: str,
        preferences: Optional[Dict[str, Any]],
        exclude_ids: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Build filters for vector search."""
        filters = {
            "user_id": {"$ne": user_id}
        }

        if exclude_ids:
            filters["user_id"]["$nin"] = exclude_ids

        if preferences:
            if preferences.get("min_age"):
                filters["age"] = {"$gte": preferences["min_age"]}
            if preferences.get("max_age"):
                filters.setdefault("age", {})["$lte"] = preferences["max_age"]
            if preferences.get("genders"):
                filters["gender"] = {"$in": preferences["genders"]}
            if preferences.get("verified_only"):
                filters["is_verified"] = True

        return filters

    async def _score_candidates(
        self,
        user_id: str,
        candidates: List[Dict[str, Any]],
        location: Tuple[float, float],
        preferences: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Score and rank candidates."""
        scored = []
        now = datetime.utcnow()

        for candidate in candidates:
            score = 0

            # Base compatibility from vector similarity
            compatibility_score = candidate.get("score", 0) * 100
            score += compatibility_score * self.settings.COMPATIBILITY_WEIGHT

            # Recency score (recently active users rank higher)
            last_active = candidate.get("last_active_at")
            if last_active:
                hours_since_active = (now - last_active).total_seconds() / 3600
                recency_score = max(0, 100 - hours_since_active)
                score += recency_score * self.settings.RECENCY_WEIGHT

            # Activity score (profile completeness, engagement)
            activity_score = candidate.get("activity_score", 50)
            score += activity_score * self.settings.ACTIVITY_WEIGHT

            # Verification bonus
            if candidate.get("is_verified"):
                score += 100 * self.settings.VERIFICATION_WEIGHT

            # New user boost (first 7 days)
            created_at = candidate.get("created_at")
            if created_at and (now - created_at).days <= 7:
                score += 100 * self.settings.NEW_USER_WEIGHT

            # Active boost bonus
            if candidate.get("has_active_boost"):
                score += 100 * self.settings.BOOST_WEIGHT

            # Add some randomization for variety
            score += np.random.uniform(0, 10)

            candidate["score"] = score
            scored.append(candidate)

        # Sort by score descending
        scored.sort(key=lambda x: x["score"], reverse=True)

        return scored

    def _calculate_interest_overlap(
        self,
        profile_a: Dict[str, Any],
        profile_b: Dict[str, Any]
    ) -> float:
        """Calculate interest overlap score (0-100)."""
        interests_a = set(profile_a.get("interests", []))
        interests_b = set(profile_b.get("interests", []))

        if not interests_a or not interests_b:
            return 50  # Neutral score if no data

        common = interests_a & interests_b
        total = interests_a | interests_b

        return (len(common) / len(total)) * 100 if total else 50

    def _calculate_lifestyle_match(
        self,
        profile_a: Dict[str, Any],
        profile_b: Dict[str, Any]
    ) -> float:
        """Calculate lifestyle compatibility score (0-100)."""
        lifestyle_a = profile_a.get("lifestyle", {})
        lifestyle_b = profile_b.get("lifestyle", {})

        if not lifestyle_a or not lifestyle_b:
            return 50

        matches = 0
        total = 0

        for key in set(lifestyle_a.keys()) | set(lifestyle_b.keys()):
            if key in lifestyle_a and key in lifestyle_b:
                total += 1
                if lifestyle_a[key] == lifestyle_b[key]:
                    matches += 1

        return (matches / total) * 100 if total else 50

    def _calculate_values_match(
        self,
        profile_a: Dict[str, Any],
        profile_b: Dict[str, Any]
    ) -> float:
        """Calculate values alignment score (0-100)."""
        values_a = profile_a.get("values", {})
        values_b = profile_b.get("values", {})

        if not values_a or not values_b:
            return 50

        matches = 0
        total = 0

        for key in set(values_a.keys()) | set(values_b.keys()):
            if key in values_a and key in values_b:
                total += 1
                if values_a[key] == values_b[key]:
                    matches += 1

        return (matches / total) * 100 if total else 50

    def _calculate_goals_match(
        self,
        profile_a: Dict[str, Any],
        profile_b: Dict[str, Any]
    ) -> float:
        """Calculate relationship goals match score (0-100)."""
        dating_a = profile_a.get("dating", {})
        dating_b = profile_b.get("dating", {})

        if not dating_a or not dating_b:
            return 50

        score = 0

        # Check looking_for match
        if dating_a.get("looking_for") == dating_b.get("looking_for"):
            score += 50

        # Check relationship_type match
        if dating_a.get("relationship_type") == dating_b.get("relationship_type"):
            score += 50

        return score

    def _cosine_similarity(
        self,
        vec_a: np.ndarray,
        vec_b: np.ndarray
    ) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)

        if norm_a == 0 or norm_b == 0:
            return 0

        return dot_product / (norm_a * norm_b)

    def _get_common_interests(
        self,
        profile_a: Dict[str, Any],
        profile_b: Dict[str, Any]
    ) -> List[str]:
        """Get list of common interests."""
        interests_a = set(profile_a.get("interests", []))
        interests_b = set(profile_b.get("interests", []))
        return list(interests_a & interests_b)

    def _generate_insights(
        self,
        profile_a: Dict[str, Any],
        profile_b: Dict[str, Any]
    ) -> List[str]:
        """Generate human-readable compatibility insights."""
        insights = []

        common_interests = self._get_common_interests(profile_a, profile_b)
        if len(common_interests) >= 3:
            insights.append(f"You share {len(common_interests)} interests")

        lifestyle_a = profile_a.get("lifestyle", {})
        lifestyle_b = profile_b.get("lifestyle", {})

        if lifestyle_a.get("exercise") == lifestyle_b.get("exercise"):
            insights.append("Similar exercise habits")

        dating_a = profile_a.get("dating", {})
        dating_b = profile_b.get("dating", {})

        if dating_a.get("looking_for") == dating_b.get("looking_for"):
            insights.append("Looking for the same type of relationship")

        return insights

    def _generate_match_reasons(
        self,
        candidate: Dict[str, Any]
    ) -> List[str]:
        """Generate reasons why this profile is recommended."""
        reasons = []

        if candidate.get("common_interests"):
            interests = candidate["common_interests"][:3]
            reasons.append(f"Shares your interest in {', '.join(interests)}")

        if candidate.get("is_verified"):
            reasons.append("Verified profile")

        if candidate.get("distance_km") and candidate["distance_km"] < 10:
            reasons.append("Lives nearby")

        if candidate.get("score", 0) > 80:
            reasons.append("High compatibility")

        return reasons
