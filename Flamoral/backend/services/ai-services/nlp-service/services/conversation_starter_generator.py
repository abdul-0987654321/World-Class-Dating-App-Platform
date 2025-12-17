"""Conversation starter generator using NLP and user profile analysis."""

import logging
from typing import Dict, Any, List, Optional
import random
from openai import AsyncOpenAI
from datetime import datetime

logger = logging.getLogger(__name__)


class ConversationStarterTemplates:
    """Templates for conversation starters based on different categories."""

    QUESTION_TEMPLATES = {
        "interests": [
            "I noticed you're into {interest}! What got you started with that?",
            "Fellow {interest} enthusiast here! What's your favorite {aspect}?",
            "I see you enjoy {interest} - any recommendations for a beginner?",
            "Your interest in {interest} caught my eye. What do you love most about it?",
            "{interest} is awesome! Have you tried {related_activity}?"
        ],
        "travel": [
            "I saw you've been to {location}! What was the highlight of your trip?",
            "{location} looks amazing in your photos! Any hidden gems you discovered?",
            "If you could go back to one place you've visited, where would it be?",
            "What's at the top of your travel bucket list right now?",
            "I'm planning to visit {location} - any must-see spots?"
        ],
        "food": [
            "I see you're a foodie! What's the best meal you've had recently?",
            "Fellow {cuisine} lover! Have you tried {restaurant_type}?",
            "What's your go-to comfort food after a long day?",
            "If you could only eat one cuisine for the rest of your life, what would it be?",
            "Cooking or dining out? And what's your signature dish?"
        ],
        "activities": [
            "I noticed you {activity}! How long have you been doing that?",
            "Your {activity} photos are impressive! Any tips for someone wanting to try it?",
            "What's the most memorable {activity} experience you've had?",
            "I've been wanting to try {activity}! What's the best way to get started?",
            "Do you {activity} regularly? What do you love about it?"
        ],
        "profession": [
            "I see you work in {profession}! What's the most interesting part of your job?",
            "How did you get into {profession}? I'd love to hear your story!",
            "What made you choose {profession} as your career path?",
            "As a {profession}, what's something most people don't know about your field?",
            "What's your favorite project you've worked on recently?"
        ],
        "music": [
            "I saw {artist} in your anthem! Have you seen them live?",
            "Your music taste is great! What concert are you dying to go to?",
            "If you could have dinner with any musician, who would it be?",
            "What song always gets you in a good mood?",
            "I'm always looking for new music - what have you been listening to lately?"
        ],
        "movies_tv": [
            "I noticed you're a fan of {show}! What did you think of {aspect}?",
            "Have you watched {show} yet? I've been meaning to start it!",
            "Movie night or binge-watching a series? What's your current favorite?",
            "If you could live in any movie/TV show universe, which would you choose?",
            "What's a show/movie you could watch over and over?"
        ],
        "pets": [
            "Your {pet} is adorable! How long have you had them?",
            "I see you're a {pet} person! What's the best thing about having one?",
            "Tell me about your {pet}! They look like they have a big personality!",
            "Dog park or cat cafe? And what's your pet's name?",
            "Any funny stories about your {pet}?"
        ],
        "general": [
            "If you could have any superpower for a day, what would it be?",
            "What's something you're really passionate about that might surprise people?",
            "Weekend plans - adventure or relaxation?",
            "Coffee or tea? And how do you take it?",
            "What's the best advice you've ever received?",
            "If you could master any skill instantly, what would it be?",
            "What's making you happy lately?",
            "Sunrise or sunset person?"
        ]
    }

    COMPLIMENT_OPENERS = [
        "Your {profile_aspect} really caught my attention!",
        "I love your vibe from your photos!",
        "Your profile made me smile - especially {specific_detail}!",
        "I have to say, your {profile_aspect} is impressive!",
        "Your {interest} passion really comes through in your profile!"
    ]

    PLAYFUL_OPENERS = [
        "Quick question: pineapple on pizza - yes or absolutely yes? 🍕",
        "I need your expert opinion on something important: {random_topic}",
        "Plot twist: we match and actually have a real conversation. What happens next?",
        "Okay, I'll be honest - your profile was the highlight of my swiping session!",
        "Two truths and a lie: go! (I'll start...)",
        "I'm going to need your help settling a debate: {debate_topic}",
        "Your profile passed the vibe check ✓ Now let's see if we can hold a conversation 😄"
    ]

    HUMOR_BASED = [
        "I was going to use a cheesy pickup line, but I respect you more than that. How's your day going?",
        "Roses are red, violets are blue, I'm terrible at poetry, how are you?",
        "I promise I'm more interesting than this opening message suggests. Give me a chance? 😅",
        "Breaking news: Two people match on dating app, might actually have interesting conversation. Details at 11.",
        "Me: *thinks of witty opening line* Also me: ... So, how's it going? 😊"
    ]


class ProfileAnalyzer:
    """Analyzes user profiles to extract conversation topics."""

    @staticmethod
    def extract_topics(profile: Dict[str, Any]) -> Dict[str, List[str]]:
        """Extract conversation topics from profile."""
        topics = {
            "interests": profile.get('interests', []),
            "hobbies": profile.get('hobbies', []),
            "activities": profile.get('activities', []),
            "travel_locations": profile.get('visited_places', []),
            "music_artists": profile.get('favorite_artists', []),
            "tv_shows": profile.get('favorite_shows', []),
            "pets": profile.get('pets', []),
            "profession": [profile.get('profession', '')] if profile.get('profession') else [],
            "unique_traits": profile.get('unique_traits', [])
        }

        return {k: v for k, v in topics.items() if v}

    @staticmethod
    def find_common_interests(
        user1_profile: Dict[str, Any],
        user2_profile: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        """Find common interests between two users."""
        common = {}

        fields = ['interests', 'hobbies', 'activities', 'visited_places', 'favorite_artists']

        for field in fields:
            user1_items = set(user1_profile.get(field, []))
            user2_items = set(user2_profile.get(field, []))
            common_items = list(user1_items.intersection(user2_items))

            if common_items:
                common[field] = common_items

        return common

    @staticmethod
    def get_conversation_hooks(profile: Dict[str, Any]) -> List[Dict[str, str]]:
        """Identify strong conversation hooks from profile."""
        hooks = []

        # Bio analysis
        bio = profile.get('bio', '')
        if bio:
            # Extract questions from bio
            if '?' in bio:
                hooks.append({
                    "type": "bio_question",
                    "content": bio.split('?')[0] + '?'
                })

        # Photos analysis
        photo_captions = profile.get('photo_captions', [])
        for caption in photo_captions:
            if caption:
                hooks.append({
                    "type": "photo_caption",
                    "content": caption
                })

        # Prompts
        prompts = profile.get('prompts', [])
        for prompt in prompts:
            if prompt.get('answer'):
                hooks.append({
                    "type": "prompt",
                    "prompt_text": prompt.get('question', ''),
                    "content": prompt.get('answer', '')
                })

        return hooks


class ConversationStarterGenerator:
    """Main service for generating conversation starters."""

    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
        self.templates = ConversationStarterTemplates()
        self.analyzer = ProfileAnalyzer()

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Conversation Starter Generator...")
        logger.info("Conversation Starter Generator initialized successfully")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Conversation Starter Generator")

    async def generate_starters(
        self,
        sender_profile: Dict[str, Any],
        recipient_profile: Dict[str, Any],
        count: int = 5,
        use_ai: bool = True,
        style: str = "balanced"
    ) -> List[Dict[str, Any]]:
        """
        Generate conversation starters.

        Args:
            sender_profile: Profile of the user sending the message
            recipient_profile: Profile of the user receiving the message
            count: Number of starters to generate
            use_ai: Whether to use AI for generation
            style: Style of conversation starters (balanced, playful, serious, complimentary)

        Returns:
            List of conversation starter suggestions
        """
        starters = []

        try:
            # Find common interests
            common_interests = self.analyzer.find_common_interests(
                sender_profile,
                recipient_profile
            )

            # Extract topics from recipient's profile
            topics = self.analyzer.extract_topics(recipient_profile)

            # Get conversation hooks
            hooks = self.analyzer.get_conversation_hooks(recipient_profile)

            if use_ai and self.openai_client:
                # Use AI for personalized starters
                ai_starters = await self._generate_ai_starters(
                    sender_profile,
                    recipient_profile,
                    common_interests,
                    topics,
                    hooks,
                    count,
                    style
                )
                starters.extend(ai_starters)
            else:
                # Use template-based generation
                template_starters = await self._generate_template_starters(
                    common_interests,
                    topics,
                    hooks,
                    count,
                    style
                )
                starters.extend(template_starters)

            # Score and rank starters
            for starter in starters:
                starter['score'] = self._score_starter(starter, common_interests, topics)

            # Sort by score
            starters.sort(key=lambda x: x['score'], reverse=True)

            return starters[:count]

        except Exception as e:
            logger.error(f"Conversation starter generation failed: {e}")
            raise

    async def _generate_ai_starters(
        self,
        sender_profile: Dict[str, Any],
        recipient_profile: Dict[str, Any],
        common_interests: Dict[str, List[str]],
        topics: Dict[str, List[str]],
        hooks: List[Dict[str, str]],
        count: int,
        style: str
    ) -> List[Dict[str, Any]]:
        """Generate conversation starters using AI."""
        starters = []

        try:
            prompt = self._build_ai_prompt(
                sender_profile,
                recipient_profile,
                common_interests,
                topics,
                hooks,
                style
            )

            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at creating engaging, personalized conversation starters for dating apps. Your openers should be genuine, specific, and encourage meaningful responses."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                n=min(count, 3)  # Limit API calls
            )

            for choice in response.choices:
                starter_text = choice.message.content.strip()
                # Parse if multiple starters in response
                if '\n' in starter_text:
                    individual_starters = [s.strip() for s in starter_text.split('\n') if s.strip()]
                    for s in individual_starters[:count]:
                        starters.append({
                            "text": s.lstrip('0123456789.)- '),
                            "type": "ai_generated",
                            "category": self._categorize_starter(s),
                            "reasoning": "AI-generated based on profile analysis"
                        })
                else:
                    starters.append({
                        "text": starter_text,
                        "type": "ai_generated",
                        "category": self._categorize_starter(starter_text),
                        "reasoning": "AI-generated based on profile analysis"
                    })

        except Exception as e:
            logger.error(f"AI starter generation failed: {e}")

        return starters

    async def _generate_template_starters(
        self,
        common_interests: Dict[str, List[str]],
        topics: Dict[str, List[str]],
        hooks: List[Dict[str, str]],
        count: int,
        style: str
    ) -> List[Dict[str, Any]]:
        """Generate conversation starters using templates."""
        starters = []

        # Prioritize common interests
        if common_interests:
            for category, items in common_interests.items():
                if starters and len(starters) >= count:
                    break

                for item in items:
                    if len(starters) >= count:
                        break

                    template = random.choice(self.templates.QUESTION_TEMPLATES.get(category, self.templates.QUESTION_TEMPLATES['general']))
                    starter_text = template.format(
                        interest=item,
                        activity=item,
                        location=item,
                        show=item,
                        artist=item,
                        pet=item.split()[0] if item else 'pet',
                        profession=item,
                        aspect='that',
                        related_activity='something similar',
                        cuisine=item,
                        restaurant_type='that kind of restaurant',
                        random_topic='the best pizza topping',
                        debate_topic='cats vs dogs'
                    )

                    starters.append({
                        "text": starter_text,
                        "type": "template_based",
                        "category": "common_interest",
                        "topic": item,
                        "reasoning": f"Based on shared interest in {item}"
                    })

        # Add topic-based starters
        if len(starters) < count and topics:
            for category, items in topics.items():
                if len(starters) >= count:
                    break

                if items and category in self.templates.QUESTION_TEMPLATES:
                    item = random.choice(items)
                    template = random.choice(self.templates.QUESTION_TEMPLATES[category])

                    starter_text = template.format(
                        interest=item,
                        activity=item,
                        location=item,
                        show=item,
                        artist=item,
                        pet=item.split()[0] if item else 'pet',
                        profession=item,
                        aspect='that',
                        related_activity='something similar',
                        cuisine=item,
                        restaurant_type='that type of place'
                    )

                    starters.append({
                        "text": starter_text,
                        "type": "template_based",
                        "category": category,
                        "topic": item,
                        "reasoning": f"Based on their interest in {item}"
                    })

        # Add style-specific starters
        if style == "playful" and len(starters) < count:
            playful = random.sample(
                self.templates.PLAYFUL_OPENERS,
                min(2, len(self.templates.PLAYFUL_OPENERS))
            )
            for starter_text in playful:
                starters.append({
                    "text": starter_text.format(
                        random_topic='the best pizza topping',
                        debate_topic='cats vs dogs'
                    ),
                    "type": "template_based",
                    "category": "playful",
                    "reasoning": "Playful and engaging opener"
                })

        # Add general questions if still need more
        if len(starters) < count:
            remaining = count - len(starters)
            general = random.sample(
                self.templates.QUESTION_TEMPLATES['general'],
                min(remaining, len(self.templates.QUESTION_TEMPLATES['general']))
            )
            for starter_text in general:
                starters.append({
                    "text": starter_text,
                    "type": "template_based",
                    "category": "general",
                    "reasoning": "Engaging general question"
                })

        return starters

    def _build_ai_prompt(
        self,
        sender_profile: Dict[str, Any],
        recipient_profile: Dict[str, Any],
        common_interests: Dict[str, List[str]],
        topics: Dict[str, List[str]],
        hooks: List[Dict[str, str]],
        style: str
    ) -> str:
        """Build prompt for AI conversation starter generation."""
        prompt_parts = [
            "Generate 5 personalized conversation starters for a dating app match.",
            "",
            f"Recipient's profile:",
            f"- Bio: {recipient_profile.get('bio', 'N/A')}",
            f"- Interests: {', '.join(recipient_profile.get('interests', []))}",
            f"- Hobbies: {', '.join(recipient_profile.get('hobbies', []))}",
            ""
        ]

        if common_interests:
            prompt_parts.append("Common interests:")
            for category, items in common_interests.items():
                prompt_parts.append(f"- {category}: {', '.join(items)}")
            prompt_parts.append("")

        if hooks:
            prompt_parts.append("Conversation hooks from profile:")
            for hook in hooks[:3]:
                prompt_parts.append(f"- {hook.get('content', '')}")
            prompt_parts.append("")

        style_instructions = {
            "balanced": "Mix of thoughtful questions and light humor",
            "playful": "Fun, witty, and slightly flirtatious",
            "serious": "Thoughtful and conversation-focused",
            "complimentary": "Include genuine compliments"
        }

        prompt_parts.extend([
            f"Style: {style_instructions.get(style, 'balanced')}",
            "",
            "Requirements:",
            "- Personalized and specific to their profile",
            "- Natural and conversational",
            "- Encourage detailed responses",
            "- Avoid generic openers",
            "- 1-2 sentences each",
            "- Show genuine interest",
            "",
            "Generate 5 conversation starters (one per line):"
        ])

        return "\n".join(prompt_parts)

    def _categorize_starter(self, text: str) -> str:
        """Categorize a starter based on its content."""
        text_lower = text.lower()

        if any(word in text_lower for word in ['?', 'what', 'how', 'why', 'where', 'who']):
            return "question"
        elif any(word in text_lower for word in ['love', 'great', 'awesome', 'impressive']):
            return "compliment"
        elif any(word in text_lower for word in ['😊', '😄', '😅', 'haha', 'lol']):
            return "playful"
        else:
            return "statement"

    def _score_starter(
        self,
        starter: Dict[str, Any],
        common_interests: Dict[str, List[str]],
        topics: Dict[str, List[str]]
    ) -> float:
        """Score a conversation starter based on quality indicators."""
        score = 50.0  # Base score

        # Bonus for common interests
        if starter.get('category') == 'common_interest':
            score += 30

        # Bonus for specific topics
        if starter.get('topic'):
            score += 15

        # Bonus for AI-generated (usually more personalized)
        if starter.get('type') == 'ai_generated':
            score += 10

        # Bonus for questions
        if '?' in starter.get('text', ''):
            score += 10

        # Penalty for too long
        if len(starter.get('text', '')) > 200:
            score -= 10

        # Bonus for appropriate length
        if 50 <= len(starter.get('text', '')) <= 150:
            score += 5

        return score
