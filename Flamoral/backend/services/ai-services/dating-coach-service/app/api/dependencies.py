"""API dependencies for authentication and user context."""

import logging
import httpx
from fastapi import Header, HTTPException, status
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# User service URL - should be configured via environment variable
USER_SERVICE_URL = "http://user-service:3001"  # Default, override in config


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extract and validate user from JWT token.

    This dependency validates the JWT token and fetches user details
    including subscription tier from the user service.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        Dictionary containing user information including subscription tier

    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        # Call user service to validate token and get user details
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{USER_SERVICE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5.0
            )

            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if response.status_code != 200:
                logger.error(f"User service returned status {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to validate authentication"
                )

            user_data = response.json()

            # Extract subscription tier from user data
            subscription_tier = "free"  # Default to free
            if user_data.get("data"):
                subscription = user_data["data"].get("subscription")
                if subscription:
                    subscription_tier = subscription.get("tier", "free")

            return {
                "user_id": user_data["data"]["id"],
                "email": user_data["data"]["email"],
                "subscription_tier": subscription_tier,
                "is_verified": user_data["data"].get("is_verified", False),
            }

    except httpx.RequestError as e:
        logger.error(f"Error connecting to user service: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )
