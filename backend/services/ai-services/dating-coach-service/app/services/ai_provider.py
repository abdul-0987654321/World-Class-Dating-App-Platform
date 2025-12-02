"""AI Provider service for interacting with OpenAI and Anthropic."""

import logging
from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from app.config import settings

logger = logging.getLogger(__name__)


class AIProviderService:
    """Service for AI interactions."""

    def __init__(self):
        """Initialize AI provider."""
        self.provider = settings.AI_PROVIDER
        self.openai_client: Optional[AsyncOpenAI] = None
        self.anthropic_client: Optional[AsyncAnthropic] = None

    async def initialize(self):
        """Initialize the AI clients."""
        try:
            if self.provider == "openai" and settings.OPENAI_API_KEY:
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialized")
            elif self.provider == "anthropic" and settings.ANTHROPIC_API_KEY:
                self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
                logger.info("Anthropic client initialized")
            else:
                logger.error(f"No API key found for provider: {self.provider}")
                raise ValueError(f"Missing API key for {self.provider}")
        except Exception as e:
            logger.error(f"Failed to initialize AI provider: {e}")
            raise

    async def close(self):
        """Close AI clients."""
        if self.openai_client:
            await self.openai_client.close()
        if self.anthropic_client:
            await self.anthropic_client.close()

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = None,
        max_tokens: int = None,
    ) -> str:
        """
        Generate a completion from the AI provider.

        Args:
            system_prompt: System instructions
            user_prompt: User message
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text
        """
        temp = temperature if temperature is not None else settings.TEMPERATURE
        tokens = max_tokens if max_tokens is not None else settings.MAX_TOKENS

        try:
            if self.provider == "openai":
                return await self._openai_completion(system_prompt, user_prompt, temp, tokens)
            elif self.provider == "anthropic":
                return await self._anthropic_completion(system_prompt, user_prompt, temp, tokens)
            else:
                raise ValueError(f"Unsupported AI provider: {self.provider}")
        except Exception as e:
            logger.error(f"AI completion failed: {e}")
            raise

    async def _openai_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Generate completion using OpenAI."""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")

        response = await self.openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return response.choices[0].message.content.strip()

    async def _anthropic_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Generate completion using Anthropic Claude."""
        if not self.anthropic_client:
            raise ValueError("Anthropic client not initialized")

        response = await self.anthropic_client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        return response.content[0].text.strip()

    async def generate_structured_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        output_format: str = "json",
        temperature: float = None,
        max_tokens: int = None,
    ) -> str:
        """
        Generate a structured completion (JSON, list, etc.).

        Args:
            system_prompt: System instructions
            user_prompt: User message
            output_format: Expected format (json, list, etc.)
            temperature: Sampling temperature
            max_tokens: Maximum tokens

        Returns:
            Generated structured text
        """
        format_instruction = f"\n\nIMPORTANT: Respond ONLY with valid {output_format.upper()}. No explanations or extra text."
        enhanced_system = system_prompt + format_instruction

        return await self.generate_completion(
            enhanced_system,
            user_prompt,
            temperature,
            max_tokens,
        )

    def get_status(self) -> Dict[str, Any]:
        """Get AI provider status."""
        return {
            "provider": self.provider,
            "model": settings.OPENAI_MODEL if self.provider == "openai" else settings.ANTHROPIC_MODEL,
            "initialized": (self.openai_client is not None) or (self.anthropic_client is not None),
        }
