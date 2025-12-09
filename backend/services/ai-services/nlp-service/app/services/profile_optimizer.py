"""Profile optimization and suggestion service."""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import structlog
from openai import AsyncOpenAI

from app.config import Settings

logger = structlog.get_logger()


class ProfileOptimizerService:
    """Service for analyzing and optimizing user profiles."""

    def __init__(self, settings: Settings):
        """Initialize the profile optimizer service."""
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = getattr(settings, 'GPT_MODEL', "gpt-4-turbo-preview")

    async def initialize(self):
        """Initialize the service."""
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if api_key:
                self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Profile optimizer service initialized")
        except Exception as e:
            logger.error("Failed to initialize profile optimizer", error=str(e))

    async def close(self):
        """Cleanup resources."""
        if self.client:
            await self.client.close()

    async def analyze_profile_completeness(
        self,
        profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze profile completeness and suggest improvements.

        Args:
            profile_data: Complete profile data

        Returns:
            Completeness score and suggestions
        """
        try:
            # Calculate completeness score
            score_breakdown = {
                "bio": self._score_bio(profile_data.get("bio", "")),
                "photos": self._score_photos(profile_data.get("photos", [])),
                "interests": self._score_interests(profile_data.get("interests", [])),
                "prompts": self._score_prompts(profile_data.get("prompts", [])),
                "preferences": self._score_preferences(profile_data.get("preferences", {})),
                "verification": self._score_verification(profile_data.get("verification", {}))
            }

            total_score = sum(score_breakdown.values()) / len(score_breakdown)

            # Generate suggestions
            suggestions = self._generate_suggestions(profile_data, score_breakdown)

            # Calculate profile strength
            strength = self._calculate_profile_strength(profile_data, score_breakdown)

            return {
                "success": True,
                "overall_score": round(total_score, 1),
                "score_breakdown": score_breakdown,
                "profile_strength": strength,
                "suggestions": suggestions,
                "priority_actions": self._get_priority_actions(suggestions),
                "estimated_match_improvement": self._estimate_match_improvement(total_score),
                "analyzed_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error("Profile analysis failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def optimize_profile_visibility(
        self,
        profile_data: Dict[str, Any],
        target_audience: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Provide suggestions to optimize profile for better visibility and matches.

        Args:
            profile_data: User profile data
            target_audience: Optional target audience preference

        Returns:
            Optimization recommendations
        """
        if not self.client:
            return self._optimize_visibility_fallback(profile_data)

        try:
            prompt = self._build_visibility_prompt(profile_data, target_audience)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a dating app optimization expert who helps users improve their profile visibility and attract quality matches."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.6,
                max_tokens=800,
            )

            recommendations = response.choices[0].message.content.strip()

            return {
                "success": True,
                "recommendations": recommendations,
                "optimization_areas": self._parse_optimization_areas(recommendations),
                "quick_wins": self._identify_quick_wins(profile_data),
                "advanced_tips": self._get_advanced_tips(profile_data),
                "metadata": {
                    "model": self.model,
                    "tokens_used": response.usage.total_tokens if response.usage else 0
                }
            }

        except Exception as e:
            logger.error("Profile optimization failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "fallback": self._optimize_visibility_fallback(profile_data)
            }

    async def generate_profile_insights(
        self,
        profile_data: Dict[str, Any],
        interaction_stats: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate insights about profile performance and attractiveness.

        Args:
            profile_data: User profile data
            interaction_stats: Optional interaction statistics

        Returns:
            Profile insights and analytics
        """
        try:
            insights = {
                "profile_type": self._determine_profile_type(profile_data),
                "attraction_factors": self._analyze_attraction_factors(profile_data),
                "uniqueness_score": self._calculate_uniqueness(profile_data),
                "approachability_score": self._calculate_approachability(profile_data),
                "conversation_starters": self._identify_conversation_starters(profile_data)
            }

            if interaction_stats:
                insights["performance_analysis"] = self._analyze_performance(
                    profile_data,
                    interaction_stats
                )

            # Get AI-powered insights if available
            if self.client:
                ai_insights = await self._get_ai_insights(profile_data, insights)
                insights["ai_recommendations"] = ai_insights

            return {
                "success": True,
                "insights": insights,
                "generated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error("Failed to generate profile insights", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def compare_with_successful_profiles(
        self,
        profile_data: Dict[str, Any],
        demographic: str = "general"
    ) -> Dict[str, Any]:
        """
        Compare profile with successful profiles in the same demographic.

        Args:
            profile_data: User profile data
            demographic: Target demographic for comparison

        Returns:
            Comparison results and improvement suggestions
        """
        try:
            # Benchmark metrics (would come from database in production)
            benchmarks = self._get_demographic_benchmarks(demographic)

            comparison = {
                "bio_length": {
                    "user": len(profile_data.get("bio", "")),
                    "benchmark": benchmarks["bio_length"],
                    "recommendation": self._compare_metric(
                        len(profile_data.get("bio", "")),
                        benchmarks["bio_length"]
                    )
                },
                "photo_count": {
                    "user": len(profile_data.get("photos", [])),
                    "benchmark": benchmarks["photo_count"],
                    "recommendation": self._compare_metric(
                        len(profile_data.get("photos", [])),
                        benchmarks["photo_count"]
                    )
                },
                "interests_count": {
                    "user": len(profile_data.get("interests", [])),
                    "benchmark": benchmarks["interests_count"],
                    "recommendation": self._compare_metric(
                        len(profile_data.get("interests", [])),
                        benchmarks["interests_count"]
                    )
                },
                "prompt_completion": {
                    "user": len(profile_data.get("prompts", [])),
                    "benchmark": benchmarks["prompt_completion"],
                    "recommendation": self._compare_metric(
                        len(profile_data.get("prompts", [])),
                        benchmarks["prompt_completion"]
                    )
                }
            }

            return {
                "success": True,
                "demographic": demographic,
                "comparison": comparison,
                "overall_ranking": self._calculate_ranking(comparison),
                "top_improvements": self._suggest_improvements_from_comparison(comparison),
                "success_factors": benchmarks.get("success_factors", [])
            }

        except Exception as e:
            logger.error("Profile comparison failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    def _score_bio(self, bio: str) -> float:
        """Score bio completeness and quality."""
        if not bio:
            return 0.0

        score = 0.0

        # Length check
        if 50 <= len(bio) <= 500:
            score += 40
        elif len(bio) > 20:
            score += 20

        # Has multiple sentences
        if len(bio.split(".")) >= 2:
            score += 20

        # Has specific details
        if any(word in bio.lower() for word in ["love", "enjoy", "passion", "interest"]):
            score += 20

        # Has question or call to action
        if "?" in bio or any(word in bio.lower() for word in ["let's", "message", "ask", "tell"]):
            score += 20

        return min(score, 100)

    def _score_photos(self, photos: List[Dict]) -> float:
        """Score photo completeness."""
        if not photos:
            return 0.0

        count = len(photos)
        score = min(count * 20, 80)  # Up to 4 photos

        # Bonus for variety
        if count >= 3:
            score += 10

        # Bonus for verified photos
        verified_count = sum(1 for p in photos if p.get("verified", False))
        if verified_count > 0:
            score += 10

        return min(score, 100)

    def _score_interests(self, interests: List[str]) -> float:
        """Score interests completeness."""
        count = len(interests)

        if count == 0:
            return 0
        elif count < 3:
            return 30
        elif count < 5:
            return 60
        elif count < 8:
            return 85
        else:
            return 100

    def _score_prompts(self, prompts: List[Dict]) -> float:
        """Score prompt answers."""
        if not prompts:
            return 0.0

        score = min(len(prompts) * 33, 90)  # Up to 3 prompts

        # Quality bonus
        quality_count = sum(
            1 for p in prompts
            if len(p.get("answer", "")) > 20
        )
        if quality_count > 0:
            score += 10

        return min(score, 100)

    def _score_preferences(self, preferences: Dict) -> float:
        """Score preferences completeness."""
        if not preferences:
            return 0.0

        important_fields = ["age_range", "distance", "interests", "dealbreakers"]
        completed = sum(1 for field in important_fields if preferences.get(field))

        return (completed / len(important_fields)) * 100

    def _score_verification(self, verification: Dict) -> float:
        """Score verification status."""
        score = 0

        if verification.get("email_verified"):
            score += 30
        if verification.get("phone_verified"):
            score += 30
        if verification.get("photo_verified"):
            score += 40

        return score

    def _generate_suggestions(
        self,
        profile_data: Dict[str, Any],
        score_breakdown: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Generate improvement suggestions."""
        suggestions = []

        # Bio suggestions
        if score_breakdown["bio"] < 70:
            suggestions.append({
                "category": "bio",
                "priority": "high",
                "title": "Improve Your Bio",
                "description": "Add more details about your interests and what makes you unique",
                "impact": "high",
                "estimated_improvement": "25-40% more profile views"
            })

        # Photo suggestions
        if score_breakdown["photos"] < 70:
            suggestions.append({
                "category": "photos",
                "priority": "high",
                "title": "Add More Photos",
                "description": "Profiles with 4-6 photos get 3x more matches",
                "impact": "very_high",
                "estimated_improvement": "50-70% more matches"
            })

        # Interest suggestions
        if score_breakdown["interests"] < 60:
            suggestions.append({
                "category": "interests",
                "priority": "medium",
                "title": "Add More Interests",
                "description": "Share 5-7 interests to help find better matches",
                "impact": "medium",
                "estimated_improvement": "20-30% better match quality"
            })

        # Prompt suggestions
        if score_breakdown["prompts"] < 60:
            suggestions.append({
                "category": "prompts",
                "priority": "medium",
                "title": "Answer Profile Prompts",
                "description": "Prompts give conversation starters and show personality",
                "impact": "medium",
                "estimated_improvement": "30-40% more conversations"
            })

        # Verification suggestions
        if score_breakdown["verification"] < 80:
            suggestions.append({
                "category": "verification",
                "priority": "low",
                "title": "Complete Verification",
                "description": "Verified profiles get 2x more trust and engagement",
                "impact": "medium",
                "estimated_improvement": "40-50% more trust signals"
            })

        return suggestions

    def _calculate_profile_strength(
        self,
        profile_data: Dict[str, Any],
        score_breakdown: Dict[str, float]
    ) -> str:
        """Calculate overall profile strength."""
        avg_score = sum(score_breakdown.values()) / len(score_breakdown)

        if avg_score >= 85:
            return "excellent"
        elif avg_score >= 70:
            return "strong"
        elif avg_score >= 50:
            return "moderate"
        else:
            return "needs_improvement"

    def _get_priority_actions(self, suggestions: List[Dict]) -> List[Dict]:
        """Get top priority actions."""
        high_priority = [s for s in suggestions if s.get("priority") == "high"]
        return high_priority[:3]

    def _estimate_match_improvement(self, current_score: float) -> str:
        """Estimate potential match improvement."""
        if current_score >= 85:
            return "5-15% (already optimized)"
        elif current_score >= 70:
            return "20-35%"
        elif current_score >= 50:
            return "40-60%"
        else:
            return "70-100%"

    def _build_visibility_prompt(
        self,
        profile_data: Dict[str, Any],
        target_audience: Optional[str]
    ) -> str:
        """Build prompt for visibility optimization."""
        bio = profile_data.get("bio", "")
        interests = profile_data.get("interests", [])
        photo_count = len(profile_data.get("photos", []))

        prompt = f"""Analyze this dating profile and provide specific recommendations to improve visibility and attract quality matches:

Bio: "{bio}"
Interests: {', '.join(interests)}
Photo Count: {photo_count}
{f'Target Audience: {target_audience}' if target_audience else ''}

Provide:
1. Top 3 specific changes to make immediately
2. Bio optimization suggestions
3. Photo strategy recommendations
4. Interest selection advice
5. Overall profile positioning strategy

Focus on actionable, specific recommendations."""

        return prompt

    def _parse_optimization_areas(self, recommendations: str) -> List[str]:
        """Parse optimization areas from recommendations."""
        # Simple parsing - in production use more sophisticated NLP
        areas = []
        if "bio" in recommendations.lower():
            areas.append("bio")
        if "photo" in recommendations.lower():
            areas.append("photos")
        if "interest" in recommendations.lower():
            areas.append("interests")
        return areas

    def _identify_quick_wins(self, profile_data: Dict[str, Any]) -> List[Dict]:
        """Identify quick wins for profile improvement."""
        quick_wins = []

        if len(profile_data.get("photos", [])) < 3:
            quick_wins.append({
                "action": "Add 2-3 more photos",
                "time": "5 minutes",
                "impact": "high"
            })

        if not profile_data.get("bio") or len(profile_data.get("bio", "")) < 50:
            quick_wins.append({
                "action": "Expand your bio to 100-200 characters",
                "time": "3 minutes",
                "impact": "high"
            })

        return quick_wins

    def _get_advanced_tips(self, profile_data: Dict[str, Any]) -> List[str]:
        """Get advanced optimization tips."""
        return [
            "Update your profile regularly to appear in 'Recently Active' feeds",
            "Use specific examples in your bio instead of generic statements",
            "Include photos that show your interests in action",
            "Answer prompts that invite conversation",
            "Keep your bio positive and forward-looking"
        ]

    def _optimize_visibility_fallback(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback visibility optimization."""
        return {
            "success": True,
            "recommendations": "Focus on completing all profile sections, adding quality photos, and writing a detailed bio.",
            "quick_wins": self._identify_quick_wins(profile_data),
            "fallback": True
        }

    def _determine_profile_type(self, profile_data: Dict[str, Any]) -> str:
        """Determine profile personality type."""
        bio = profile_data.get("bio", "").lower()

        if any(word in bio for word in ["adventure", "travel", "explore"]):
            return "adventurous"
        elif any(word in bio for word in ["creative", "art", "music", "design"]):
            return "creative"
        elif any(word in bio for word in ["fitness", "gym", "health", "active"]):
            return "active"
        else:
            return "balanced"

    def _analyze_attraction_factors(self, profile_data: Dict[str, Any]) -> List[str]:
        """Analyze what makes profile attractive."""
        factors = []

        if len(profile_data.get("photos", [])) >= 4:
            factors.append("Good photo variety")

        bio = profile_data.get("bio", "")
        if len(bio) >= 100:
            factors.append("Detailed bio")

        if len(profile_data.get("interests", [])) >= 5:
            factors.append("Well-defined interests")

        return factors

    def _calculate_uniqueness(self, profile_data: Dict[str, Any]) -> float:
        """Calculate how unique the profile is."""
        score = 50.0  # Base score

        bio = profile_data.get("bio", "")
        if len(bio) > 100:
            score += 20

        if len(profile_data.get("prompts", [])) >= 2:
            score += 15

        if len(profile_data.get("interests", [])) >= 7:
            score += 15

        return min(score, 100)

    def _calculate_approachability(self, profile_data: Dict[str, Any]) -> float:
        """Calculate how approachable the profile appears."""
        score = 50.0

        bio = profile_data.get("bio", "")
        if "?" in bio:
            score += 20

        if any(word in bio.lower() for word in ["friendly", "fun", "easy-going", "open"]):
            score += 15

        if len(profile_data.get("prompts", [])) > 0:
            score += 15

        return min(score, 100)

    def _identify_conversation_starters(self, profile_data: Dict[str, Any]) -> List[str]:
        """Identify good conversation starters from profile."""
        starters = []

        interests = profile_data.get("interests", [])
        if interests:
            starters.append(f"Ask about their interest in {interests[0]}")

        prompts = profile_data.get("prompts", [])
        if prompts:
            starters.append(f"Comment on their prompt answer")

        return starters

    async def _get_ai_insights(
        self,
        profile_data: Dict[str, Any],
        basic_insights: Dict[str, Any]
    ) -> str:
        """Get AI-powered insights."""
        try:
            if not self.client:
                return "AI insights unavailable"

            prompt = f"""Provide 3 key insights about this dating profile:

Profile Type: {basic_insights.get('profile_type')}
Uniqueness Score: {basic_insights.get('uniqueness_score')}
Approachability: {basic_insights.get('approachability_score')}

Bio: {profile_data.get('bio', '')}

Provide brief, actionable insights."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=300,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error("Failed to get AI insights", error=str(e))
            return "Unable to generate AI insights"

    def _analyze_performance(
        self,
        profile_data: Dict[str, Any],
        stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze profile performance."""
        return {
            "view_rate": stats.get("views", 0),
            "match_rate": stats.get("matches", 0),
            "response_rate": stats.get("response_rate", 0),
            "performance_summary": "Performing well" if stats.get("matches", 0) > 10 else "Room for improvement"
        }

    def _get_demographic_benchmarks(self, demographic: str) -> Dict[str, Any]:
        """Get benchmark data for demographic."""
        # In production, fetch from database
        return {
            "bio_length": 150,
            "photo_count": 5,
            "interests_count": 6,
            "prompt_completion": 3,
            "success_factors": [
                "Specific interests",
                "Authentic photos",
                "Engaging bio",
                "Complete profile"
            ]
        }

    def _compare_metric(self, user_value: int, benchmark: int) -> str:
        """Compare user metric to benchmark."""
        if user_value >= benchmark:
            return "on_track"
        elif user_value >= benchmark * 0.7:
            return "needs_improvement"
        else:
            return "add_more"

    def _calculate_ranking(self, comparison: Dict[str, Any]) -> str:
        """Calculate overall ranking."""
        on_track = sum(
            1 for metric in comparison.values()
            if metric.get("recommendation") == "on_track"
        )

        total = len(comparison)

        if on_track >= total * 0.8:
            return "top_20%"
        elif on_track >= total * 0.5:
            return "top_50%"
        else:
            return "bottom_50%"

    def _suggest_improvements_from_comparison(
        self,
        comparison: Dict[str, Any]
    ) -> List[str]:
        """Suggest improvements based on comparison."""
        suggestions = []

        for metric, data in comparison.items():
            if data["recommendation"] != "on_track":
                suggestions.append(f"Improve {metric.replace('_', ' ')}")

        return suggestions[:3]
