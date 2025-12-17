"""Language translation support service."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from transformers import pipeline, MarianMTModel, MarianTokenizer
import langdetect
from langdetect import detect, detect_langs
import torch

from app.config import Settings

logger = structlog.get_logger()


class TranslationService:
    """Service for language translation and detection."""

    def __init__(self, settings: Settings):
        """Initialize the translation service."""
        self.settings = settings
        self.translation_models = {}
        self.language_detector = None
        self.supported_languages = settings.SUPPORTED_LANGUAGES

    async def initialize(self):
        """Initialize translation models."""
        try:
            # Initialize language detection
            # langdetect is pre-loaded, no initialization needed

            logger.info("Translation service initialized", supported_languages=len(self.supported_languages))

        except Exception as e:
            logger.error("Failed to initialize translation service", error=str(e))

    async def close(self):
        """Cleanup resources."""
        self.translation_models.clear()

    async def translate_text(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Translate text to target language.

        Args:
            text: Text to translate
            target_language: Target language code (e.g., 'es', 'fr', 'de')
            source_language: Optional source language (auto-detected if not provided)

        Returns:
            Translation result with metadata
        """
        try:
            if not text or not text.strip():
                return {
                    "success": False,
                    "error": "Empty text"
                }

            # Detect source language if not provided
            if not source_language:
                detected = await self.detect_language(text)
                source_language = detected["language"]

            # Check if translation is needed
            if source_language == target_language:
                return {
                    "success": True,
                    "original_text": text,
                    "translated_text": text,
                    "source_language": source_language,
                    "target_language": target_language,
                    "translation_needed": False
                }

            # Validate language support
            if target_language not in self.supported_languages:
                return {
                    "success": False,
                    "error": f"Target language '{target_language}' not supported",
                    "supported_languages": self.supported_languages
                }

            # Perform translation
            translated_text = await self._translate(text, source_language, target_language)

            return {
                "success": True,
                "original_text": text,
                "translated_text": translated_text,
                "source_language": source_language,
                "target_language": target_language,
                "translation_needed": True,
                "character_count": len(text),
                "translated_character_count": len(translated_text)
            }

        except Exception as e:
            logger.error("Translation failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "original_text": text
            }

    async def translate_conversation(
        self,
        messages: List[Dict[str, Any]],
        target_language: str
    ) -> Dict[str, Any]:
        """
        Translate entire conversation to target language.

        Args:
            messages: List of messages to translate
            target_language: Target language code

        Returns:
            Translated messages with metadata
        """
        try:
            if not messages:
                return {
                    "success": False,
                    "error": "No messages provided"
                }

            translated_messages = []
            languages_detected = set()

            for message in messages:
                content = message.get("content", "")
                if not content:
                    translated_messages.append(message)
                    continue

                # Translate message
                translation_result = await self.translate_text(content, target_language)

                if translation_result["success"]:
                    translated_message = message.copy()
                    translated_message["content"] = translation_result["translated_text"]
                    translated_message["original_content"] = content
                    translated_message["source_language"] = translation_result["source_language"]
                    translated_message["translated"] = translation_result["translation_needed"]

                    translated_messages.append(translated_message)
                    languages_detected.add(translation_result["source_language"])
                else:
                    # Keep original if translation fails
                    translated_messages.append(message)

            return {
                "success": True,
                "message_count": len(messages),
                "translated_messages": translated_messages,
                "target_language": target_language,
                "source_languages": list(languages_detected),
                "multilingual": len(languages_detected) > 1
            }

        except Exception as e:
            logger.error("Conversation translation failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def detect_language(
        self,
        text: str,
        include_alternatives: bool = False
    ) -> Dict[str, Any]:
        """
        Detect language of text.

        Args:
            text: Text to analyze
            include_alternatives: Whether to include alternative language predictions

        Returns:
            Detected language with confidence
        """
        try:
            if not text or not text.strip():
                return {
                    "success": False,
                    "error": "Empty text"
                }

            # Detect language
            detected_lang = detect(text)

            result = {
                "success": True,
                "text": text[:100] + "..." if len(text) > 100 else text,
                "language": detected_lang,
                "language_name": self._get_language_name(detected_lang),
                "supported": detected_lang in self.supported_languages
            }

            # Include alternative predictions if requested
            if include_alternatives:
                alternatives = detect_langs(text)
                result["alternatives"] = [
                    {
                        "language": lang.lang,
                        "language_name": self._get_language_name(lang.lang),
                        "probability": round(lang.prob, 3)
                    }
                    for lang in alternatives[:5]
                ]

            return result

        except langdetect.LangDetectException as e:
            logger.error("Language detection failed", error=str(e))
            return {
                "success": False,
                "error": "Unable to detect language",
                "text": text[:100] + "..." if len(text) > 100 else text
            }
        except Exception as e:
            logger.error("Language detection failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def analyze_multilingual_profile(
        self,
        profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze language usage in profile.

        Args:
            profile_data: User profile data

        Returns:
            Language analysis and recommendations
        """
        try:
            languages_found = {}

            # Analyze bio
            bio = profile_data.get("bio", "")
            if bio:
                bio_lang = await self.detect_language(bio)
                if bio_lang["success"]:
                    languages_found["bio"] = bio_lang["language"]

            # Analyze prompts
            prompts = profile_data.get("prompts", [])
            for idx, prompt in enumerate(prompts):
                answer = prompt.get("answer", "")
                if answer:
                    prompt_lang = await self.detect_language(answer)
                    if prompt_lang["success"]:
                        languages_found[f"prompt_{idx}"] = prompt_lang["language"]

            # Determine primary language
            if languages_found:
                lang_counts = {}
                for lang in languages_found.values():
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1

                primary_language = max(lang_counts.items(), key=lambda x: x[1])[0]
                is_multilingual = len(set(languages_found.values())) > 1

                return {
                    "success": True,
                    "primary_language": primary_language,
                    "primary_language_name": self._get_language_name(primary_language),
                    "is_multilingual": is_multilingual,
                    "languages_detected": list(set(languages_found.values())),
                    "language_distribution": lang_counts,
                    "sections_analyzed": len(languages_found),
                    "recommendations": self._get_language_recommendations(
                        primary_language,
                        is_multilingual,
                        lang_counts
                    )
                }
            else:
                return {
                    "success": True,
                    "primary_language": "unknown",
                    "is_multilingual": False,
                    "message": "No text content found to analyze"
                }

        except Exception as e:
            logger.error("Multilingual profile analysis failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def get_translation_suggestions(
        self,
        user_language: str,
        match_language: str
    ) -> Dict[str, Any]:
        """
        Get suggestions for cross-language communication.

        Args:
            user_language: User's primary language
            match_language: Match's primary language

        Returns:
            Communication suggestions and tips
        """
        try:
            translation_needed = user_language != match_language

            suggestions = {
                "success": True,
                "user_language": user_language,
                "match_language": match_language,
                "translation_needed": translation_needed,
                "both_supported": (
                    user_language in self.supported_languages and
                    match_language in self.supported_languages
                ),
                "suggestions": []
            }

            if translation_needed:
                if suggestions["both_supported"]:
                    suggestions["suggestions"] = [
                        "Real-time translation is available for your conversations",
                        "Try sending messages in your native language - they'll be automatically translated",
                        "Important: Translation may not capture all nuances, so be clear and specific",
                        "Use simple sentences for better translation accuracy",
                        "Emoji can help bridge language gaps 😊"
                    ]
                    suggestions["auto_translate_available"] = True
                else:
                    suggestions["suggestions"] = [
                        f"Consider learning basic phrases in {self._get_language_name(match_language)}",
                        "Use simple, clear English as a common language",
                        "Be patient with language differences",
                        "Use emoji to express emotions across language barriers"
                    ]
                    suggestions["auto_translate_available"] = False

                # Add language learning resources
                suggestions["language_tips"] = self._get_language_learning_tips(
                    user_language,
                    match_language
                )
            else:
                suggestions["suggestions"] = [
                    "You both speak the same language - communicate naturally!",
                    "Feel free to use local expressions and cultural references"
                ]

            return suggestions

        except Exception as e:
            logger.error("Failed to get translation suggestions", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def _translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> str:
        """
        Perform actual translation.

        Note: This is a placeholder. In production, integrate with:
        - Google Cloud Translation API
        - DeepL API
        - Azure Translator
        - Or self-hosted models like MarianMT
        """
        # For now, return a mock translation
        # In production, implement actual translation
        logger.info(
            "Translation requested",
            source=source_lang,
            target=target_lang,
            length=len(text)
        )

        # Mock translation for demonstration
        # Replace with actual API calls in production
        return f"[Translated from {source_lang} to {target_lang}]: {text}"

    def _get_language_name(self, code: str) -> str:
        """Get full language name from code."""
        language_names = {
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "nl": "Dutch",
            "ru": "Russian",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese",
            "ar": "Arabic",
            "hi": "Hindi",
            "tr": "Turkish",
            "pl": "Polish",
            "sv": "Swedish",
            "no": "Norwegian",
            "da": "Danish",
            "fi": "Finnish"
        }
        return language_names.get(code, code.upper())

    def _get_language_recommendations(
        self,
        primary_language: str,
        is_multilingual: bool,
        lang_distribution: Dict[str, int]
    ) -> List[str]:
        """Get recommendations based on language analysis."""
        recommendations = []

        if is_multilingual:
            recommendations.append(
                "Your profile shows multilingual content - this can attract international matches!"
            )
            recommendations.append(
                "Consider adding your language preferences to help find compatible matches"
            )
        else:
            recommendations.append(
                f"Your profile is in {self._get_language_name(primary_language)}"
            )

        if primary_language not in self.supported_languages:
            recommendations.append(
                f"Note: {self._get_language_name(primary_language)} translation may have limited support"
            )

        return recommendations

    def _get_language_learning_tips(
        self,
        user_language: str,
        match_language: str
    ) -> List[str]:
        """Get language learning tips for cross-language matches."""
        tips = [
            f"Basic {self._get_language_name(match_language)} phrases to learn:",
            "- Hello / Hi",
            "- How are you?",
            "- Thank you",
            "- I would like to...",
            "- Tell me about..."
        ]

        # Add language-specific resources
        tips.append(f"Try using language learning apps like Duolingo or Babbel for {self._get_language_name(match_language)}")

        return tips

    async def batch_translate(
        self,
        texts: List[str],
        target_language: str,
        source_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Translate multiple texts in batch for efficiency.

        Args:
            texts: List of texts to translate
            target_language: Target language code
            source_language: Optional source language

        Returns:
            Batch translation results
        """
        try:
            if not texts:
                return {
                    "success": False,
                    "error": "No texts provided"
                }

            # Translate all texts
            results = []
            for text in texts:
                result = await self.translate_text(text, target_language, source_language)
                results.append(result)

            successful = [r for r in results if r.get("success")]
            failed = [r for r in results if not r.get("success")]

            return {
                "success": True,
                "total_count": len(texts),
                "successful_count": len(successful),
                "failed_count": len(failed),
                "results": results,
                "target_language": target_language
            }

        except Exception as e:
            logger.error("Batch translation failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def translate_profile_for_international_matching(
        self,
        profile_data: Dict[str, Any],
        target_languages: List[str]
    ) -> Dict[str, Any]:
        """
        Translate profile to multiple languages for international matching.

        Args:
            profile_data: User profile data
            target_languages: List of target language codes

        Returns:
            Multi-language profile translations
        """
        try:
            translations = {}

            for lang in target_languages:
                lang_translation = {}

                # Translate bio
                if "bio" in profile_data and profile_data["bio"]:
                    bio_result = await self.translate_text(
                        profile_data["bio"],
                        lang
                    )
                    if bio_result["success"]:
                        lang_translation["bio"] = bio_result["translated_text"]

                # Translate prompts
                if "prompts" in profile_data:
                    translated_prompts = []
                    for prompt in profile_data["prompts"]:
                        if "answer" in prompt:
                            prompt_result = await self.translate_text(
                                prompt["answer"],
                                lang
                            )
                            if prompt_result["success"]:
                                translated_prompt = prompt.copy()
                                translated_prompt["answer"] = prompt_result["translated_text"]
                                translated_prompts.append(translated_prompt)

                    if translated_prompts:
                        lang_translation["prompts"] = translated_prompts

                if lang_translation:
                    translations[lang] = lang_translation

            return {
                "success": True,
                "source_profile": profile_data,
                "translations": translations,
                "languages": list(translations.keys()),
                "language_count": len(translations)
            }

        except Exception as e:
            logger.error("Profile translation for international matching failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
