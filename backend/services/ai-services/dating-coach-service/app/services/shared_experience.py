"""Shared Experience Generator service for AI-curated virtual activities."""

import logging
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class SharedExperienceService:
    """
    Service for generating personalized shared experiences for matches.

    Generates virtual activities, conversation games, creative challenges,
    learning activities, and watch parties tailored to both users' interests.
    """

    # Experience category templates for fallback and inspiration
    EXPERIENCE_TEMPLATES = {
        "virtual_activity": [
            {
                "title": "Virtual Museum Tour",
                "description": "Explore a world-famous museum together using Google Arts & Culture",
                "duration": "45-60 minutes",
                "materials_needed": ["Computer or phone", "Google Arts & Culture app/website"],
                "difficulty": "easy",
            },
            {
                "title": "Online Multiplayer Game Session",
                "description": "Play a fun online game together like Skribbl.io, Codenames Online, or Among Us",
                "duration": "30-60 minutes",
                "materials_needed": ["Computer or phone", "Chosen game app"],
                "difficulty": "easy",
            },
            {
                "title": "Virtual Cooking Challenge",
                "description": "Cook the same recipe together over video call, then rate each other's results",
                "duration": "1-2 hours",
                "materials_needed": ["Ingredients for chosen recipe", "Video call app", "Kitchen"],
                "difficulty": "medium",
            },
            {
                "title": "Virtual Escape Room",
                "description": "Solve puzzles together in an online escape room experience",
                "duration": "60-90 minutes",
                "materials_needed": ["Computer", "Virtual escape room subscription"],
                "difficulty": "medium",
            },
            {
                "title": "Online Trivia Night",
                "description": "Team up and compete in an online trivia game or create your own quiz for each other",
                "duration": "30-45 minutes",
                "materials_needed": ["Computer or phone", "Trivia app or questions"],
                "difficulty": "easy",
            },
        ],
        "conversation_game": [
            {
                "title": "36 Questions to Fall in Love",
                "description": "Take turns asking and answering questions designed to foster closeness",
                "duration": "1-2 hours",
                "materials_needed": ["Question list", "Open mind"],
                "difficulty": "medium",
            },
            {
                "title": "Two Truths and a Lie",
                "description": "Share three statements about yourself - one is false. Guess which!",
                "duration": "20-30 minutes",
                "materials_needed": ["Creative imagination"],
                "difficulty": "easy",
            },
            {
                "title": "Would You Rather - Dating Edition",
                "description": "Fun hypothetical scenarios customized for getting to know each other",
                "duration": "20-30 minutes",
                "materials_needed": ["List of scenarios"],
                "difficulty": "easy",
            },
            {
                "title": "Desert Island Questions",
                "description": "If you were stranded on a desert island... explore priorities and values together",
                "duration": "30-45 minutes",
                "materials_needed": ["Question prompts"],
                "difficulty": "easy",
            },
            {
                "title": "Story Building Game",
                "description": "Create a story together, each person adding a sentence at a time",
                "duration": "20-30 minutes",
                "materials_needed": ["Creativity", "Sense of humor"],
                "difficulty": "easy",
            },
        ],
        "creative_challenge": [
            {
                "title": "Draw Each Other",
                "description": "Using a drawing app or paper, create portraits of each other and reveal at the same time",
                "duration": "30-45 minutes",
                "materials_needed": ["Drawing app or paper and pencils", "Video call"],
                "difficulty": "medium",
            },
            {
                "title": "Playlist Exchange",
                "description": "Each create a 10-song playlist for the other based on their personality",
                "duration": "1-2 hours (async)",
                "materials_needed": ["Spotify or music streaming app"],
                "difficulty": "easy",
            },
            {
                "title": "Photo Challenge",
                "description": "Take photos based on prompts and share - 'Something that makes you happy', 'Your view right now'",
                "duration": "30-60 minutes (async)",
                "materials_needed": ["Phone camera"],
                "difficulty": "easy",
            },
            {
                "title": "Poetry Slam",
                "description": "Write short poems about each other or a shared topic, then share",
                "duration": "45-60 minutes",
                "materials_needed": ["Paper/notes app", "Courage"],
                "difficulty": "challenging",
            },
            {
                "title": "Bucket List Collaboration",
                "description": "Create a shared bucket list of experiences you'd want to do together",
                "duration": "30-45 minutes",
                "materials_needed": ["Shared document or notes"],
                "difficulty": "easy",
            },
        ],
        "learning_together": [
            {
                "title": "Language Exchange",
                "description": "Teach each other phrases in different languages you know",
                "duration": "30-45 minutes",
                "materials_needed": ["Language knowledge to share"],
                "difficulty": "medium",
            },
            {
                "title": "Skill Share Session",
                "description": "Each person teaches the other a skill they're good at",
                "duration": "45-60 minutes",
                "materials_needed": ["Materials for the skill being taught"],
                "difficulty": "medium",
            },
            {
                "title": "Documentary Watch & Discuss",
                "description": "Watch a documentary together (synced) and discuss afterward",
                "duration": "1.5-2 hours",
                "materials_needed": ["Streaming service", "Watch party app"],
                "difficulty": "easy",
            },
            {
                "title": "Online Course Together",
                "description": "Take a fun online course together - cooking, photography, or a new skill",
                "duration": "Variable",
                "materials_needed": ["Course platform access", "Course materials"],
                "difficulty": "medium",
            },
            {
                "title": "TED Talk Discussion",
                "description": "Each pick a TED talk, watch them together, and discuss ideas",
                "duration": "45-60 minutes",
                "materials_needed": ["TED website/app"],
                "difficulty": "easy",
            },
        ],
        "watch_party": [
            {
                "title": "Movie Night Sync",
                "description": "Watch a movie together using Teleparty or similar sync app",
                "duration": "2-3 hours",
                "materials_needed": ["Streaming service", "Teleparty extension"],
                "difficulty": "easy",
            },
            {
                "title": "TV Series Pilot Marathon",
                "description": "Each pick a show pilot to watch together and decide which to continue",
                "duration": "1-2 hours",
                "materials_needed": ["Streaming services", "Watch party app"],
                "difficulty": "easy",
            },
            {
                "title": "YouTube Deep Dive",
                "description": "Take turns sharing favorite YouTube videos and reacting together",
                "duration": "30-60 minutes",
                "materials_needed": ["YouTube", "Video call with screen share"],
                "difficulty": "easy",
            },
            {
                "title": "Live Concert Stream",
                "description": "Watch a live or recorded concert stream together",
                "duration": "1-2 hours",
                "materials_needed": ["Concert stream access", "Good audio setup"],
                "difficulty": "easy",
            },
            {
                "title": "Reality Show Watch Party",
                "description": "Watch a reality show together and commentate/judge along",
                "duration": "1-2 hours",
                "materials_needed": ["Streaming service", "Watch party app"],
                "difficulty": "easy",
            },
        ],
    }

    # Interest to activity mapping
    INTEREST_ACTIVITY_MAP = {
        "art": ["virtual_activity", "creative_challenge"],
        "music": ["watch_party", "creative_challenge"],
        "movies": ["watch_party"],
        "cooking": ["virtual_activity", "learning_together"],
        "travel": ["virtual_activity", "learning_together"],
        "gaming": ["virtual_activity"],
        "reading": ["learning_together", "conversation_game"],
        "fitness": ["learning_together", "creative_challenge"],
        "photography": ["creative_challenge"],
        "technology": ["learning_together", "virtual_activity"],
        "languages": ["learning_together"],
        "comedy": ["watch_party", "conversation_game"],
        "nature": ["creative_challenge", "watch_party"],
        "science": ["learning_together", "watch_party"],
        "history": ["virtual_activity", "learning_together"],
    }

    # Time-appropriate activities
    TIME_APPROPRIATE = {
        "morning": ["learning_together", "conversation_game", "creative_challenge"],
        "afternoon": ["virtual_activity", "creative_challenge", "learning_together"],
        "evening": ["watch_party", "virtual_activity", "conversation_game"],
        "night": ["watch_party", "conversation_game"],
    }

    def __init__(self, ai_provider: AIProviderService):
        """Initialize shared experience service."""
        self.ai_provider = ai_provider
        self._feedback_store: Dict[str, List[Dict[str, Any]]] = {}

    async def generate_experiences(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        count: int = 3,
        experience_type: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None,
        distance_km: Optional[float] = None,
        time_of_day: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate personalized shared experiences for a match.

        Args:
            user_profile: User's profile data
            match_profile: Match's profile data
            count: Number of experiences to generate
            experience_type: Specific type of experience (optional)
            preferences: Additional preferences
            distance_km: Distance between users (affects virtual vs in-person suggestions)
            time_of_day: Current time of day for appropriate activities

        Returns:
            Dictionary with experiences and personalization notes
        """
        try:
            # Find shared interests
            shared_interests = self._find_shared_interests(user_profile, match_profile)

            # Determine preferred experience types
            preferred_types = self._get_preferred_types(
                shared_interests,
                experience_type,
                distance_km,
                time_of_day,
            )

            # Build AI prompts
            system_prompt = self._build_experience_system_prompt(preferred_types)
            user_prompt = self._build_experience_user_prompt(
                user_profile,
                match_profile,
                shared_interests,
                count,
                preferred_types,
                preferences,
                time_of_day,
            )

            # Generate with AI
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.8,
            )

            result = json.loads(response)

            # Add unique IDs to experiences
            experiences = result.get("experiences", [])
            for exp in experiences:
                exp["id"] = f"exp_{uuid.uuid4().hex[:12]}"

            return {
                "experiences": experiences,
                "shared_interests_used": shared_interests,
                "personalization_notes": result.get(
                    "personalization_notes",
                    "Experiences tailored based on your shared interests and profiles."
                ),
            }

        except Exception as e:
            logger.error(f"Failed to generate experiences: {e}")
            return self._get_fallback_experiences(
                count,
                experience_type,
                shared_interests if 'shared_interests' in dir() else [],
            )

    async def get_experience_by_interests(
        self,
        shared_interests: List[str],
        count: int = 3,
    ) -> Dict[str, Any]:
        """
        Get experience suggestions based on shared interests.

        Args:
            shared_interests: List of shared interests
            count: Number of experiences to return

        Returns:
            Dictionary with interest-matched experiences
        """
        try:
            # Map interests to activity types
            activity_types = set()
            for interest in shared_interests:
                interest_lower = interest.lower()
                for key, types in self.INTEREST_ACTIVITY_MAP.items():
                    if key in interest_lower or interest_lower in key:
                        activity_types.update(types)

            # If no matches, use all types
            if not activity_types:
                activity_types = set(self.EXPERIENCE_TEMPLATES.keys())

            # Collect relevant templates
            experiences = []
            for activity_type in activity_types:
                templates = self.EXPERIENCE_TEMPLATES.get(activity_type, [])
                for template in templates[:2]:  # Take up to 2 per type
                    exp = self._template_to_experience(template, activity_type)
                    exp["why_it_works"] = f"This activity matches your shared interest in {', '.join(shared_interests[:3])}"
                    experiences.append(exp)

            # Shuffle and limit
            import random
            random.shuffle(experiences)
            experiences = experiences[:count]

            return {
                "experiences": experiences,
                "shared_interests_used": shared_interests,
                "personalization_notes": f"Experiences selected based on interests: {', '.join(shared_interests)}",
            }

        except Exception as e:
            logger.error(f"Failed to get interest-based experiences: {e}")
            return self._get_fallback_experiences(count, None, shared_interests)

    async def create_custom_conversation_game(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        game_type: str = "36_questions",
        question_count: int = 10,
        depth_level: str = "medium",
    ) -> Dict[str, Any]:
        """
        Create a personalized conversation game with custom questions.

        Args:
            user_profile: User's profile
            match_profile: Match's profile
            game_type: Type of game (36_questions, two_truths, would_you_rather, custom)
            question_count: Number of questions to generate
            depth_level: How deep the questions should be (surface, medium, deep)

        Returns:
            Dictionary with game details and personalized questions
        """
        try:
            # Extract relevant profile info
            shared_interests = self._find_shared_interests(user_profile, match_profile)

            system_prompt = self._build_game_system_prompt(game_type, depth_level)
            user_prompt = self._build_game_user_prompt(
                user_profile,
                match_profile,
                shared_interests,
                game_type,
                question_count,
            )

            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.85,
            )

            result = json.loads(response)

            return {
                "game_title": result.get("game_title", f"Personalized {game_type.replace('_', ' ').title()}"),
                "game_description": result.get("game_description", "A fun conversation game tailored for you both"),
                "questions": result.get("questions", []),
                "instructions": result.get("instructions", "Take turns asking questions. Listen actively and share openly."),
                "estimated_duration": result.get("estimated_duration", f"{question_count * 3}-{question_count * 5} minutes"),
            }

        except Exception as e:
            logger.error(f"Failed to create conversation game: {e}")
            return self._get_fallback_conversation_game(game_type, question_count)

    async def track_experience_completion(
        self,
        experience_id: str,
        user_id: str,
        match_id: str,
        feedback: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Track experience completion and feedback.

        Args:
            experience_id: ID of the completed experience
            user_id: User providing feedback
            match_id: Match involved
            feedback: Feedback data (rating, enjoyment, notes, etc.)

        Returns:
            Dictionary with confirmation and recommendations
        """
        try:
            # Store feedback (in production, this would go to a database)
            feedback_record = {
                "experience_id": experience_id,
                "user_id": user_id,
                "match_id": match_id,
                "rating": feedback.get("rating", 0),
                "completed": feedback.get("completed", False),
                "enjoyment_level": feedback.get("enjoyment_level"),
                "conversation_quality": feedback.get("conversation_quality"),
                "would_recommend": feedback.get("would_recommend"),
                "notes": feedback.get("notes"),
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Store in memory (replace with database in production)
            pair_key = f"{min(user_id, match_id)}_{max(user_id, match_id)}"
            if pair_key not in self._feedback_store:
                self._feedback_store[pair_key] = []
            self._feedback_store[pair_key].append(feedback_record)

            logger.info(f"Tracked experience feedback: {experience_id} by {user_id}")

            # Generate recommendations based on feedback
            recommendations = self._get_recommendations_from_feedback(feedback_record)

            return {
                "success": True,
                "next_recommendations": recommendations,
            }

        except Exception as e:
            logger.error(f"Failed to track experience: {e}")
            return {
                "success": False,
                "next_recommendations": [],
            }

    def _find_shared_interests(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> List[str]:
        """Find shared interests between two profiles."""
        user_interests = set(user_profile.get("interests", []))
        match_interests = set(match_profile.get("interests", []))

        # Direct matches
        shared = list(user_interests.intersection(match_interests))

        # Check for related interests
        interest_groups = {
            "entertainment": {"movies", "music", "concerts", "theater", "comedy", "tv shows", "gaming"},
            "outdoor": {"hiking", "camping", "nature", "outdoors", "travel", "beach", "mountains"},
            "food": {"cooking", "food", "restaurants", "wine", "coffee", "baking", "foodie"},
            "fitness": {"gym", "fitness", "sports", "yoga", "running", "cycling", "wellness"},
            "creative": {"art", "photography", "painting", "writing", "crafts", "design", "music"},
            "intellectual": {"reading", "books", "podcasts", "learning", "science", "history", "documentaries"},
        }

        for group_name, keywords in interest_groups.items():
            user_in_group = any(i.lower() in keywords for i in user_interests)
            match_in_group = any(i.lower() in keywords for i in match_interests)
            if user_in_group and match_in_group and group_name not in shared:
                shared.append(group_name)

        return shared[:10]  # Limit to top 10

    def _get_preferred_types(
        self,
        shared_interests: List[str],
        explicit_type: Optional[str],
        distance_km: Optional[float],
        time_of_day: Optional[str],
    ) -> List[str]:
        """Determine preferred experience types based on context."""
        if explicit_type:
            return [explicit_type]

        preferred = set()

        # Add types based on interests
        for interest in shared_interests:
            interest_lower = interest.lower()
            for key, types in self.INTEREST_ACTIVITY_MAP.items():
                if key in interest_lower:
                    preferred.update(types)

        # Add types based on time of day
        if time_of_day and time_of_day in self.TIME_APPROPRIATE:
            preferred.update(self.TIME_APPROPRIATE[time_of_day])

        # If long distance, prioritize virtual activities
        if distance_km and distance_km > 50:
            preferred = preferred.union({"virtual_activity", "watch_party", "conversation_game"})

        # If no preferences determined, include all
        if not preferred:
            preferred = set(self.EXPERIENCE_TEMPLATES.keys())

        return list(preferred)

    def _build_experience_system_prompt(self, preferred_types: List[str]) -> str:
        """Build system prompt for experience generation."""
        types_desc = ", ".join(t.replace("_", " ") for t in preferred_types)

        return f"""You are an expert dating coach specializing in creating meaningful shared experiences for couples.

Your task is to generate personalized virtual activities that matches can do together to:
- Build connection and rapport
- Create shared memories
- Discover more about each other
- Have fun together

Focus on these experience types: {types_desc}

For each experience, provide:
1. A catchy, specific title
2. Detailed description of how to do the activity
3. Realistic duration estimate
4. Any materials or apps needed
5. 3 conversation prompts related to the activity
6. Difficulty level (easy, medium, challenging)
7. Why this works for this specific match
8. Tips for success
9. Follow-up activity ideas

Be creative, specific, and personalize based on the profiles provided.
Consider practicality - activities should be doable remotely."""

    def _build_experience_user_prompt(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        shared_interests: List[str],
        count: int,
        preferred_types: List[str],
        preferences: Optional[Dict[str, Any]],
        time_of_day: Optional[str],
    ) -> str:
        """Build user prompt for experience generation."""
        user_name = user_profile.get("first_name", "User")
        match_name = match_profile.get("first_name", "Match")

        user_interests = ", ".join(user_profile.get("interests", [])[:7])
        match_interests = ", ".join(match_profile.get("interests", [])[:7])
        shared_str = ", ".join(shared_interests) if shared_interests else "exploring new things together"

        user_bio = user_profile.get("bio", "")[:200]
        match_bio = match_profile.get("bio", "")[:200]

        time_context = f"\nTime of day: {time_of_day}" if time_of_day else ""
        pref_context = f"\nPreferences: {json.dumps(preferences)}" if preferences else ""

        return f"""Generate {count} personalized shared experiences for this match:

{user_name.upper()}'S PROFILE:
- Interests: {user_interests}
- Bio snippet: {user_bio}

{match_name.upper()}'S PROFILE:
- Interests: {match_interests}
- Bio snippet: {match_bio}

SHARED INTERESTS: {shared_str}

PREFERRED TYPES: {", ".join(preferred_types)}{time_context}{pref_context}

Return JSON:
{{
    "experiences": [
        {{
            "title": "Specific experience title",
            "description": "Detailed description of the activity",
            "type": "virtual_activity|conversation_game|creative_challenge|learning_together|watch_party",
            "duration": "Estimated duration",
            "materials_needed": ["item 1", "item 2"],
            "conversation_prompts": ["prompt 1", "prompt 2", "prompt 3"],
            "difficulty": "easy|medium|challenging",
            "why_it_works": "Why this activity suits {user_name} and {match_name}",
            "tips_for_success": ["tip 1", "tip 2"],
            "follow_up_ideas": ["next activity 1", "next activity 2"]
        }}
    ],
    "personalization_notes": "How these experiences were personalized for this match"
}}

Make each experience unique, specific, and engaging. Reference their actual interests."""

    def _build_game_system_prompt(self, game_type: str, depth_level: str) -> str:
        """Build system prompt for conversation game creation."""
        depth_desc = {
            "surface": "light, fun questions good for early conversations",
            "medium": "thoughtful questions that reveal personality and values",
            "deep": "vulnerable questions that build deep emotional connection",
        }

        game_desc = {
            "36_questions": "the famous 36 Questions to Fall in Love format - questions designed to increase interpersonal closeness",
            "two_truths": "Two Truths and a Lie game - create statements that are personal and interesting",
            "would_you_rather": "Would You Rather scenarios - personalized hypothetical choices",
            "custom": "a mix of question styles that foster connection",
        }

        return f"""You are an expert relationship psychologist creating a personalized conversation game.

Game type: {game_desc.get(game_type, game_desc['custom'])}
Depth level: {depth_desc.get(depth_level, depth_desc['medium'])}

Guidelines:
- Personalize questions based on both profiles
- Reference their interests, hobbies, or background when relevant
- Progress from lighter to deeper questions
- Include a mix of:
  * Getting to know you questions
  * Playful/fun questions
  * Value-exploring questions
  * Future-oriented questions
- Make questions open-ended to encourage discussion
- Avoid yes/no questions
- Include follow-up prompts where appropriate

For each question, explain why it was chosen for this specific pair."""

    def _build_game_user_prompt(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        shared_interests: List[str],
        game_type: str,
        question_count: int,
    ) -> str:
        """Build user prompt for conversation game creation."""
        user_name = user_profile.get("first_name", "Person A")
        match_name = match_profile.get("first_name", "Person B")

        user_interests = ", ".join(user_profile.get("interests", [])[:5])
        match_interests = ", ".join(match_profile.get("interests", [])[:5])
        shared_str = ", ".join(shared_interests) if shared_interests else "getting to know each other"

        return f"""Create a personalized {game_type.replace('_', ' ')} game for:

{user_name}: Interests include {user_interests}
{match_name}: Interests include {match_interests}
Shared interests: {shared_str}

Generate {question_count} questions.

Return JSON:
{{
    "game_title": "Creative game title",
    "game_description": "Brief description of the game",
    "questions": [
        {{
            "question": "The question text",
            "category": "getting_to_know|deeper_connection|playful|hypothetical",
            "follow_up": "Optional follow-up question",
            "why_personalized": "Why this question was chosen for {user_name} and {match_name}"
        }}
    ],
    "instructions": "How to play the game together",
    "estimated_duration": "How long it will take"
}}

Make questions specific and personalized, referencing their interests where natural."""

    def _template_to_experience(self, template: Dict[str, Any], exp_type: str) -> Dict[str, Any]:
        """Convert a template to a full experience object."""
        return {
            "id": f"exp_{uuid.uuid4().hex[:12]}",
            "title": template["title"],
            "description": template["description"],
            "type": exp_type,
            "duration": template["duration"],
            "materials_needed": template["materials_needed"],
            "conversation_prompts": [
                "How did you find this experience?",
                "Would you want to try this again?",
                "What was your favorite part?",
            ],
            "difficulty": template["difficulty"],
            "why_it_works": "A fun activity to try together!",
            "tips_for_success": ["Be present and engaged", "Have fun with it!"],
            "follow_up_ideas": ["Try a similar activity next time", "Share what you learned"],
        }

    def _get_fallback_experiences(
        self,
        count: int,
        experience_type: Optional[str],
        shared_interests: List[str],
    ) -> Dict[str, Any]:
        """Return fallback experiences when AI generation fails."""
        experiences = []

        if experience_type:
            templates = self.EXPERIENCE_TEMPLATES.get(experience_type, [])
            for template in templates[:count]:
                experiences.append(self._template_to_experience(template, experience_type))
        else:
            # Get a variety
            for exp_type, templates in self.EXPERIENCE_TEMPLATES.items():
                if templates and len(experiences) < count:
                    experiences.append(self._template_to_experience(templates[0], exp_type))

        return {
            "experiences": experiences[:count],
            "shared_interests_used": shared_interests,
            "personalization_notes": "These are general suggestions that work for most couples.",
        }

    def _get_fallback_conversation_game(
        self,
        game_type: str,
        question_count: int,
    ) -> Dict[str, Any]:
        """Return fallback conversation game when AI generation fails."""
        default_questions = [
            {
                "question": "What's something you're really passionate about that you don't get to talk about often?",
                "category": "getting_to_know",
                "follow_up": "How did you discover this passion?",
                "why_personalized": "Great for discovering hidden interests",
            },
            {
                "question": "If you could have dinner with anyone, living or dead, who would it be and why?",
                "category": "hypothetical",
                "follow_up": "What would you ask them?",
                "why_personalized": "Reveals values and interests",
            },
            {
                "question": "What's the most spontaneous thing you've ever done?",
                "category": "playful",
                "follow_up": "Would you do it again?",
                "why_personalized": "Shows adventurous side",
            },
            {
                "question": "What does your ideal weekend look like?",
                "category": "getting_to_know",
                "follow_up": "How often do you get to have that kind of weekend?",
                "why_personalized": "Reveals lifestyle preferences",
            },
            {
                "question": "What's something you've changed your mind about over the years?",
                "category": "deeper_connection",
                "follow_up": "What caused the change?",
                "why_personalized": "Shows growth and self-awareness",
            },
            {
                "question": "If you could instantly become an expert in something, what would you choose?",
                "category": "hypothetical",
                "follow_up": "What would you do with that expertise?",
                "why_personalized": "Reveals hidden interests",
            },
            {
                "question": "What's a small thing that makes your day better?",
                "category": "getting_to_know",
                "follow_up": "How often does that happen?",
                "why_personalized": "Reveals appreciation style",
            },
            {
                "question": "What's the best advice you've ever received?",
                "category": "deeper_connection",
                "follow_up": "How has it shaped your life?",
                "why_personalized": "Shows values and influences",
            },
            {
                "question": "What's something you're looking forward to in the next year?",
                "category": "getting_to_know",
                "follow_up": "What steps are you taking toward it?",
                "why_personalized": "Reveals goals and aspirations",
            },
            {
                "question": "What's a belief you hold that most people might disagree with?",
                "category": "deeper_connection",
                "follow_up": "How did you come to that belief?",
                "why_personalized": "Encourages authentic sharing",
            },
        ]

        return {
            "game_title": f"Personalized {game_type.replace('_', ' ').title()}",
            "game_description": "A conversation game designed to help you connect on a deeper level",
            "questions": default_questions[:question_count],
            "instructions": "Take turns asking questions. Listen actively, share openly, and enjoy getting to know each other better.",
            "estimated_duration": f"{question_count * 3}-{question_count * 5} minutes",
        }

    def _get_recommendations_from_feedback(self, feedback: Dict[str, Any]) -> List[str]:
        """Generate next experience recommendations based on feedback."""
        recommendations = []

        rating = feedback.get("rating", 3)
        enjoyment = feedback.get("enjoyment_level", "")

        if rating >= 4 or enjoyment == "loved_it":
            recommendations = [
                "Try a longer version of a similar activity",
                "Explore other activities in the same category",
                "Plan something more challenging together",
            ]
        elif rating >= 3 or enjoyment == "liked_it":
            recommendations = [
                "Try a different category next time",
                "Keep the same duration but change the activity",
                "Add a competitive element for more fun",
            ]
        else:
            recommendations = [
                "Try something completely different",
                "Consider a shorter, lighter activity",
                "Focus on conversation-based activities",
            ]

        return recommendations
