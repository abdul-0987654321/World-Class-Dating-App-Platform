"""Profile optimization service."""

import logging
import json
from typing import List, Dict, Any
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class ProfileAnalyzerService:
    """Service for analyzing and providing profile improvement tips."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize profile analyzer service."""
        self.ai_provider = ai_provider

    async def analyze_profile(
        self,
        profile_data: Dict[str, Any],
        photos: List[Dict[str, Any]] = None,
        prompts: List[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze profile and provide optimization tips.

        Args:
            profile_data: User's profile data
            photos: User's photos metadata
            prompts: User's prompts and answers

        Returns:
            Dictionary with profile analysis and tips
        """
        try:
            # Calculate completeness
            completeness = self._calculate_completeness(profile_data, photos, prompts)

            # Build prompts
            system_prompt = self._build_system_prompt()
            user_prompt = self._build_user_prompt(profile_data, photos, prompts, completeness)

            # Generate analysis
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.6,
            )

            # Parse response
            result = json.loads(response)

            # Calculate overall score
            overall_score = self._calculate_overall_score(profile_data, completeness, result)

            return {
                "overall_score": overall_score,
                "tips": result.get("tips", []),
                "strengths": result.get("strengths", []),
                "quick_wins": result.get("quick_wins", []),
                "profile_completeness": completeness,
            }

        except Exception as e:
            logger.error(f"Failed to analyze profile: {e}")
            return self._get_fallback_analysis(profile_data)

    def _calculate_completeness(
        self,
        profile: Dict[str, Any],
        photos: List[Dict[str, Any]],
        prompts: List[Dict[str, Any]],
    ) -> float:
        """Calculate profile completeness score."""
        score = 0.0
        weights = {
            "bio": 0.15,
            "photos": 0.25,
            "prompts": 0.20,
            "interests": 0.15,
            "basics": 0.15,
            "preferences": 0.10,
        }

        # Bio
        if profile.get("bio") and len(profile["bio"]) >= 50:
            score += weights["bio"]

        # Photos
        if photos:
            photo_score = min(len(photos) / 6, 1.0)  # 6 photos = full score
            score += weights["photos"] * photo_score

        # Prompts
        if prompts:
            answered_prompts = sum(1 for p in prompts if p.get("answer"))
            prompt_score = min(answered_prompts / 3, 1.0)  # 3 prompts = full score
            score += weights["prompts"] * prompt_score

        # Interests
        if profile.get("interests") and len(profile["interests"]) >= 5:
            score += weights["interests"]

        # Basics (height, occupation, education, etc.)
        basic_fields = ["height", "occupation", "education", "location"]
        filled_basics = sum(1 for field in basic_fields if profile.get(field))
        score += weights["basics"] * (filled_basics / len(basic_fields))

        # Preferences
        if profile.get("preferences"):
            score += weights["preferences"]

        return round(score, 2)

    def _calculate_overall_score(
        self,
        profile: Dict[str, Any],
        completeness: float,
        analysis: Dict[str, Any],
    ) -> float:
        """Calculate overall profile score (0-100)."""
        # Base score from completeness
        base_score = completeness * 60

        # Quality factors
        quality_score = 0

        # Bio quality
        bio = profile.get("bio", "")
        if len(bio) >= 100:
            quality_score += 10
        elif len(bio) >= 50:
            quality_score += 5

        # Number of tips (inverse - fewer tips = better profile)
        tips_count = len(analysis.get("tips", []))
        if tips_count <= 2:
            quality_score += 15
        elif tips_count <= 4:
            quality_score += 10
        else:
            quality_score += 5

        # Strengths
        strengths_count = len(analysis.get("strengths", []))
        quality_score += min(strengths_count * 5, 15)

        return round(min(base_score + quality_score, 100), 1)

    def _build_system_prompt(self) -> str:
        """Build system prompt for profile analysis."""
        return """You are an expert dating profile consultant with years of experience helping people create compelling profiles.

Analyze the profile and provide specific, actionable feedback in these categories:

TIPS: Concrete improvements with priority levels (high/medium/low)
- Focus on what's missing or could be better
- Be specific about how to improve
- Prioritize changes by impact

STRENGTHS: What's working well in the profile
- Highlight effective elements
- Note authentic or unique aspects

QUICK WINS: Easy changes with high impact
- Simple improvements they can make immediately
- Changes that will significantly improve attractiveness

Be honest, constructive, and specific. Focus on authenticity over trying to be someone you're not."""

    def _build_user_prompt(
        self,
        profile: Dict[str, Any],
        photos: List[Dict[str, Any]],
        prompts: List[Dict[str, Any]],
        completeness: float,
    ) -> str:
        """Build user prompt for profile analysis."""
        # Profile summary
        bio = profile.get("bio", "No bio")
        interests = ", ".join(profile.get("interests", [])[:5])
        occupation = profile.get("occupation", "Not specified")

        # Photos summary
        photo_count = len(photos) if photos else 0
        photo_contexts = []
        if photos:
            for photo in photos[:3]:
                if photo.get("context"):
                    photo_contexts.append(photo["context"])

        # Prompts summary
        prompt_answers = []
        if prompts:
            for prompt in prompts[:3]:
                if prompt.get("answer"):
                    prompt_answers.append(f"Q: {prompt.get('question', 'Prompt')}\nA: {prompt['answer']}")

        return f"""Analyze this dating profile and provide improvement tips:

BIO: {bio}

INTERESTS: {interests or "None listed"}

OCCUPATION: {occupation}

PHOTOS: {photo_count} photos
{chr(10).join(f"- {ctx}" for ctx in photo_contexts) if photo_contexts else "No context available"}

PROMPTS:
{chr(10).join(prompt_answers) if prompt_answers else "No prompts answered"}

COMPLETENESS: {completeness * 100:.0f}%

OTHER DETAILS:
- Height: {profile.get('height', 'Not specified')}
- Education: {profile.get('education', 'Not specified')}
- Location: {profile.get('location', 'Not specified')}

Provide analysis in JSON format:
{{
    "tips": [
        {{
            "category": "photos/bio/prompts/interests",
            "priority": "high/medium/low",
            "tip": "Specific actionable advice",
            "current_value": "What they have now (if applicable)",
            "suggested_improvement": "Concrete suggestion",
            "impact_score": 0.0-1.0
        }}
    ],
    "strengths": ["strength 1", "strength 2"],
    "quick_wins": ["easy improvement 1", "easy improvement 2"]
}}

Focus on:
1. What's missing or incomplete
2. How to make bio more engaging
3. Photo variety and quality tips
4. Prompt answer improvements
5. Interest selection advice"""

    def _get_fallback_analysis(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Return fallback analysis if AI generation fails."""
        tips = []

        # Check bio
        if not profile.get("bio") or len(profile.get("bio", "")) < 50:
            tips.append({
                "category": "bio",
                "priority": "high",
                "tip": "Add a bio that's at least 50 characters",
                "current_value": profile.get("bio", "Empty"),
                "suggested_improvement": "Write about your interests, what you're looking for, or what makes you unique",
                "impact_score": 0.9,
            })

        # Check interests
        if not profile.get("interests") or len(profile.get("interests", [])) < 3:
            tips.append({
                "category": "interests",
                "priority": "high",
                "tip": "Add more interests (at least 5 recommended)",
                "current_value": str(len(profile.get("interests", []))),
                "suggested_improvement": "Select diverse interests that represent you well",
                "impact_score": 0.8,
            })

        return {
            "overall_score": 45.0,
            "tips": tips,
            "strengths": ["You've started your profile!"],
            "quick_wins": ["Complete your bio", "Add more interests", "Upload more photos"],
            "profile_completeness": 0.4,
        }
