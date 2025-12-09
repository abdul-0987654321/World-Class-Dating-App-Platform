"""Content generation services for dating platform."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from openai import AsyncOpenAI
import random
from datetime import datetime

logger = structlog.get_logger()


class DateIdeaGeneratorService:
    """Service for generating date idea suggestions."""

    def __init__(self, settings):
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = getattr(settings, 'GPT_MODEL', "gpt-4-turbo-preview")

    async def initialize(self):
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if api_key:
                self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Date idea generator service initialized")
        except Exception as e:
            logger.error("Failed to initialize date idea generator", error=str(e))

    async def close(self):
        if self.client:
            await self.client.close()

    async def generate_date_ideas(
        self,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any],
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate personalized date ideas based on both profiles."""
        try:
            shared_interests = set(profile1.get("interests", [])) & set(profile2.get("interests", []))

            if not self.client:
                return self._generate_date_ideas_fallback(shared_interests, preferences)

            prompt = f"""Generate 5 creative date ideas for a couple with these profiles:

Person 1 interests: {', '.join(profile1.get('interests', []))}
Person 2 interests: {', '.join(profile2.get('interests', []))}
Shared interests: {', '.join(shared_interests) if shared_interests else 'None yet'}
Location type: {preferences.get('location_type', 'urban') if preferences else 'urban'}
Budget: {preferences.get('budget', 'moderate') if preferences else 'moderate'}
Date type: {preferences.get('date_type', 'casual') if preferences else 'casual'}

Create diverse date ideas (first date, activity, unique experience, low-key, adventurous) that:
1. Align with their interests
2. Encourage conversation
3. Are memorable
4. Fit the specified preferences

Format each as: Title | Description | Why it works"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a creative date planning expert who suggests thoughtful, personalized date ideas."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=800,
            )

            date_ideas = self._parse_date_ideas(response.choices[0].message.content)

            return {
                "success": True,
                "date_ideas": date_ideas,
                "shared_interests": list(shared_interests),
                "personalization_factors": {
                    "common_interests": len(shared_interests),
                    "total_interests": len(set(profile1.get("interests", []) + profile2.get("interests", [])))
                }
            }

        except Exception as e:
            logger.error("Date idea generation failed", error=str(e))
            return self._generate_date_ideas_fallback(shared_interests if 'shared_interests' in locals() else set(), preferences)

    def _parse_date_ideas(self, raw_text: str) -> List[Dict[str, str]]:
        """Parse date ideas from response."""
        ideas = []
        for line in raw_text.strip().split('\n'):
            if '|' in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    ideas.append({
                        "title": parts[0].lstrip('0123456789.)-• '),
                        "description": parts[1],
                        "why_it_works": parts[2]
                    })
        return ideas

    def _generate_date_ideas_fallback(self, shared_interests: set, preferences: Optional[Dict]) -> Dict[str, Any]:
        """Fallback date ideas."""
        templates = [
            {"title": "Coffee Shop Chat", "description": "Meet at a cozy local cafe for conversation", "why_it_works": "Low pressure, easy to extend or leave"},
            {"title": "Museum Visit", "description": "Explore an art or science museum together", "why_it_works": "Built-in conversation topics, shows culture"},
            {"title": "Cooking Class", "description": "Take a couples cooking class", "why_it_works": "Interactive, fun, ends with meal together"},
            {"title": "Scenic Walk", "description": "Walk in a park or botanical garden", "why_it_works": "Relaxed atmosphere, easy to talk"},
            {"title": "Live Music", "description": "Check out a local band or open mic night", "why_it_works": "Entertainment with conversation breaks"}
        ]
        return {
            "success": True,
            "date_ideas": templates[:5],
            "shared_interests": list(shared_interests),
            "fallback": True
        }


class GiftRecommendationService:
    """Service for generating gift recommendations."""

    def __init__(self, settings):
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = getattr(settings, 'GPT_MODEL', "gpt-4-turbo-preview")

    async def initialize(self):
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if api_key:
                self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Gift recommendation service initialized")
        except Exception as e:
            logger.error("Failed to initialize gift recommendation service", error=str(e))

    async def close(self):
        if self.client:
            await self.client.close()

    async def recommend_gifts(
        self,
        recipient_profile: Dict[str, Any],
        occasion: str = "casual",
        budget: str = "moderate",
        relationship_stage: str = "early"
    ) -> Dict[str, Any]:
        """Generate gift recommendations based on recipient's profile."""
        try:
            if not self.client:
                return self._recommend_gifts_fallback(recipient_profile, occasion, budget)

            prompt = f"""Suggest 5 thoughtful gift ideas for:

Interests: {', '.join(recipient_profile.get('interests', []))}
Hobbies: {', '.join(recipient_profile.get('hobbies', []))}
Occasion: {occasion}
Budget: {budget}
Relationship stage: {relationship_stage}

Suggest gifts that are:
1. Thoughtful and personal
2. Appropriate for relationship stage
3. Within budget
4. Show you pay attention
5. Not too intimate or too generic

Format: Title | Description | Price range | Why it's perfect"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a thoughtful gift suggestion expert who understands relationship dynamics."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=600,
            )

            gifts = self._parse_gifts(response.choices[0].message.content)

            return {
                "success": True,
                "gifts": gifts,
                "occasion": occasion,
                "budget": budget,
                "relationship_stage": relationship_stage,
                "tips": self._get_gift_giving_tips(relationship_stage)
            }

        except Exception as e:
            logger.error("Gift recommendation failed", error=str(e))
            return self._recommend_gifts_fallback(recipient_profile, occasion, budget)

    def _parse_gifts(self, raw_text: str) -> List[Dict[str, str]]:
        """Parse gift recommendations."""
        gifts = []
        for line in raw_text.strip().split('\n'):
            if '|' in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 4:
                    gifts.append({
                        "title": parts[0].lstrip('0123456789.)-• '),
                        "description": parts[1],
                        "price_range": parts[2],
                        "why_perfect": parts[3]
                    })
        return gifts

    def _recommend_gifts_fallback(self, profile: Dict[str, Any], occasion: str, budget: str) -> Dict[str, Any]:
        """Fallback gift recommendations."""
        interests = profile.get("interests", [])
        gifts = [
            {"title": "Book by favorite author", "description": "Thoughtful and personal", "price_range": "$15-30", "why_perfect": "Shows you listen"},
            {"title": "Experience tickets", "description": "Concert or event they'd enjoy", "price_range": "$30-100", "why_perfect": "Creates memories together"},
            {"title": "Gourmet treats", "description": "Artisan chocolates or specialty food", "price_range": "$20-50", "why_perfect": "Shareable and special"},
            {"title": "Hobby supplies", "description": f"Related to {interests[0] if interests else 'their hobbies'}", "price_range": "$25-75", "why_perfect": "Supports their passions"}
        ]
        return {
            "success": True,
            "gifts": gifts,
            "occasion": occasion,
            "budget": budget,
            "fallback": True
        }

    def _get_gift_giving_tips(self, stage: str) -> List[str]:
        """Get gift-giving tips for relationship stage."""
        tips = {
            "early": [
                "Keep it thoughtful but not too personal",
                "Avoid expensive or intimate gifts",
                "Reference something they mentioned",
                "Make it fun and lighthearted"
            ],
            "developing": [
                "Show you remember details they've shared",
                "Can be more personal but still appropriate",
                "Consider shared experiences over objects",
                "Quality over quantity"
            ],
            "established": [
                "More personal gifts are appropriate",
                "Consider meaningful or sentimental items",
                "Inside jokes or shared memories work well",
                "Can invest more in special occasions"
            ]
        }
        return tips.get(stage, tips["early"])


class ComplimentGeneratorService:
    """Service for generating genuine compliments."""

    def __init__(self, settings):
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = getattr(settings, 'GPT_MODEL', "gpt-4-turbo-preview")

    async def initialize(self):
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if api_key:
                self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Compliment generator service initialized")
        except Exception as e:
            logger.error("Failed to initialize compliment generator", error=str(e))

    async def close(self):
        if self.client:
            await self.client.close()

    async def generate_compliments(
        self,
        profile: Dict[str, Any],
        compliment_type: str = "general",
        count: int = 5
    ) -> Dict[str, Any]:
        """Generate genuine, specific compliments."""
        try:
            if not self.client:
                return self._generate_compliments_fallback(profile, compliment_type, count)

            types_map = {
                "general": "general personality and character",
                "appearance": "style and presentation (tasteful, non-objectifying)",
                "interests": "their interests and passions",
                "personality": "their personality traits and qualities",
                "accomplishments": "their achievements and growth"
            }

            prompt = f"""Generate {count} genuine, specific compliments about {types_map.get(compliment_type, 'general')}:

Profile:
Bio: {profile.get('bio', '')}
Interests: {', '.join(profile.get('interests', []))}

Create compliments that:
1. Are specific and genuine (not generic)
2. Reference actual profile details
3. Are respectful and appropriate
4. Make someone feel seen and appreciated
5. Avoid clichés

One compliment per line."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert at giving genuine, thoughtful compliments that make people feel truly seen and appreciated."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=400,
            )

            compliments = [
                c.strip().lstrip('0123456789.)-• ')
                for c in response.choices[0].message.content.strip().split('\n')
                if c.strip()
            ]

            return {
                "success": True,
                "compliments": compliments[:count],
                "compliment_type": compliment_type,
                "tips": [
                    "Deliver compliments with sincerity",
                    "Be specific rather than generic",
                    "Focus on character over appearance",
                    "Make it about what you genuinely appreciate",
                    "Timing matters - find natural moments"
                ]
            }

        except Exception as e:
            logger.error("Compliment generation failed", error=str(e))
            return self._generate_compliments_fallback(profile, compliment_type, count)

    def _generate_compliments_fallback(self, profile: Dict[str, Any], compliment_type: str, count: int) -> Dict[str, Any]:
        """Fallback compliment generation."""
        interests = profile.get("interests", [])
        templates = {
            "general": [
                "Your energy is really positive and infectious",
                "I appreciate how genuine you seem to be",
                "Your perspective on things is really interesting",
                "You have a great sense of humor",
                "I love how passionate you are about your interests"
            ],
            "interests": [
                f"It's inspiring how dedicated you are to {interests[0] if interests else 'your hobbies'}",
                "Your enthusiasm for your interests really shows",
                "I admire how you pursue what you're passionate about",
                "Your diverse interests make you really interesting"
            ],
            "personality": [
                "You seem like such a thoughtful person",
                "I really appreciate how open-minded you are",
                "Your positive outlook is refreshing",
                "You have a really great way of expressing yourself"
            ]
        }

        compliments = templates.get(compliment_type, templates["general"])
        return {
            "success": True,
            "compliments": random.sample(compliments, min(count, len(compliments))),
            "compliment_type": compliment_type,
            "fallback": True
        }


class ConversationTopicService:
    """Service for suggesting conversation topics."""

    def __init__(self, settings):
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = getattr(settings, 'GPT_MODEL', "gpt-4-turbo-preview")

    async def initialize(self):
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if api_key:
                self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Conversation topic service initialized")
        except Exception as e:
            logger.error("Failed to initialize conversation topic service", error=str(e))

    async def close(self):
        if self.client:
            await self.client.close()

    async def suggest_topics(
        self,
        conversation_history: List[Dict[str, Any]],
        profile1: Dict[str, Any],
        profile2: Dict[str, Any],
        conversation_stage: str = "early"
    ) -> Dict[str, Any]:
        """Suggest conversation topics based on profiles and history."""
        try:
            if not self.client:
                return self._suggest_topics_fallback(profile1, profile2, conversation_stage)

            # Analyze what's been discussed
            discussed_topics = self._extract_discussed_topics(conversation_history)

            prompt = f"""Suggest 5 conversation topics for a {conversation_stage} stage conversation:

Person 1 interests: {', '.join(profile1.get('interests', []))}
Person 2 interests: {', '.join(profile2.get('interests', []))}
Shared interests: {list(set(profile1.get('interests', [])) & set(profile2.get('interests', [])))}
Already discussed: {', '.join(discussed_topics) if discussed_topics else 'Nothing yet'}

Suggest topics that:
1. Haven't been thoroughly covered yet
2. Allow both to share
3. Are appropriate for relationship stage
4. Create meaningful connection
5. Are open-ended

Format: Topic | Question to ask | Why this works"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert conversation coach who helps people have meaningful, engaging conversations."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=600,
            )

            topics = self._parse_topics(response.choices[0].message.content)

            return {
                "success": True,
                "topics": topics,
                "conversation_stage": conversation_stage,
                "discussed_topics": discussed_topics,
                "conversation_tips": self._get_conversation_tips(conversation_stage)
            }

        except Exception as e:
            logger.error("Topic suggestion failed", error=str(e))
            return self._suggest_topics_fallback(profile1, profile2, conversation_stage)

    def _extract_discussed_topics(self, history: List[Dict[str, Any]]) -> List[str]:
        """Extract topics from conversation history."""
        # Simplified topic extraction
        topics = set()
        common_topics = ['work', 'family', 'hobbies', 'travel', 'food', 'movies', 'music', 'sports']

        for message in history:
            content = message.get('content', '').lower()
            for topic in common_topics:
                if topic in content:
                    topics.add(topic)

        return list(topics)

    def _parse_topics(self, raw_text: str) -> List[Dict[str, str]]:
        """Parse topic suggestions."""
        topics = []
        for line in raw_text.strip().split('\n'):
            if '|' in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    topics.append({
                        "topic": parts[0].lstrip('0123456789.)-• '),
                        "question": parts[1],
                        "why_it_works": parts[2]
                    })
        return topics

    def _suggest_topics_fallback(self, profile1: Dict[str, Any], profile2: Dict[str, Any], stage: str) -> Dict[str, Any]:
        """Fallback topic suggestions."""
        early_topics = [
            {"topic": "Travel experiences", "question": "What's the best trip you've ever taken?", "why_it_works": "Everyone has travel stories"},
            {"topic": "Weekend activities", "question": "What's your ideal weekend look like?", "why_it_works": "Shows lifestyle and values"},
            {"topic": "Hobbies and passions", "question": "What do you love doing in your free time?", "why_it_works": "Reveals interests and enthusiasm"},
        ]

        return {
            "success": True,
            "topics": early_topics,
            "conversation_stage": stage,
            "fallback": True
        }

    def _get_conversation_tips(self, stage: str) -> List[str]:
        """Get stage-appropriate conversation tips."""
        tips = {
            "early": [
                "Ask open-ended questions",
                "Share about yourself too",
                "Listen actively and follow up",
                "Keep it light and positive",
                "Find common ground"
            ],
            "developing": [
                "Go deeper on shared interests",
                "Share personal stories",
                "Discuss values and goals",
                "Be vulnerable appropriately",
                "Plan future interactions"
            ],
            "established": [
                "Discuss meaningful topics",
                "Share dreams and aspirations",
                "Talk about relationship itself",
                "Make plans together",
                "Be authentic and open"
            ]
        }
        return tips.get(stage, tips["early"])
