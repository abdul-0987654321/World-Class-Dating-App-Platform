"""Vector store service for managing profile embeddings."""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import structlog
from redis import asyncio as aioredis
import json

from app.config import Settings

logger = structlog.get_logger()


class VectorStore:
    """
    Vector store for profile embeddings.

    Supports Pinecone for production and Redis for development/testing.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis: Optional[aioredis.Redis] = None
        self.pinecone_index = None
        self._use_pinecone = bool(settings.PINECONE_API_KEY)

    async def initialize(self):
        """Initialize the vector store connections."""
        # Initialize Redis (used for caching in both modes)
        self.redis = await aioredis.from_url(
            self.settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

        if self._use_pinecone:
            await self._initialize_pinecone()
        else:
            logger.info("Running in Redis-only mode (no Pinecone)")

        logger.info("Vector store initialized", use_pinecone=self._use_pinecone)

    async def _initialize_pinecone(self):
        """Initialize Pinecone connection."""
        try:
            from pinecone import Pinecone

            pc = Pinecone(api_key=self.settings.PINECONE_API_KEY)

            # Check if index exists
            existing_indexes = [idx.name for idx in pc.list_indexes()]

            if self.settings.PINECONE_INDEX_NAME not in existing_indexes:
                logger.info("Creating Pinecone index", name=self.settings.PINECONE_INDEX_NAME)
                pc.create_index(
                    name=self.settings.PINECONE_INDEX_NAME,
                    dimension=self.settings.EMBEDDING_DIMENSION,
                    metric="cosine",
                    spec={
                        "serverless": {
                            "cloud": "aws",
                            "region": self.settings.PINECONE_ENVIRONMENT
                        }
                    }
                )

            self.pinecone_index = pc.Index(self.settings.PINECONE_INDEX_NAME)
            logger.info("Pinecone initialized successfully")

        except Exception as e:
            logger.error("Failed to initialize Pinecone", error=str(e))
            self._use_pinecone = False

    async def close(self):
        """Close connections."""
        if self.redis:
            await self.redis.close()

    async def is_healthy(self) -> bool:
        """Check if the vector store is healthy."""
        try:
            await self.redis.ping()
            return True
        except Exception:
            return False

    async def store_embedding(
        self,
        user_id: str,
        embedding: np.ndarray,
        metadata: Dict[str, Any]
    ):
        """
        Store a user's embedding.

        Args:
            user_id: User ID
            embedding: Embedding vector
            metadata: Profile metadata for filtering
        """
        # Store in Redis cache
        cache_key = f"embedding:{user_id}"
        cache_data = {
            "embedding": embedding.tolist(),
            "metadata": metadata
        }
        await self.redis.setex(
            cache_key,
            self.settings.CACHE_TTL,
            json.dumps(cache_data)
        )

        if self._use_pinecone:
            # Store in Pinecone
            self.pinecone_index.upsert(
                vectors=[{
                    "id": user_id,
                    "values": embedding.tolist(),
                    "metadata": self._prepare_metadata(metadata)
                }]
            )

        logger.debug("Stored embedding", user_id=user_id)

    async def get_embedding(self, user_id: str) -> Optional[np.ndarray]:
        """
        Get a user's embedding.

        Args:
            user_id: User ID

        Returns:
            Embedding vector or None if not found
        """
        # Try cache first
        cache_key = f"embedding:{user_id}"
        cached = await self.redis.get(cache_key)

        if cached:
            data = json.loads(cached)
            return np.array(data["embedding"])

        if self._use_pinecone:
            # Fetch from Pinecone
            result = self.pinecone_index.fetch(ids=[user_id])
            if user_id in result.vectors:
                embedding = np.array(result.vectors[user_id].values)
                # Cache it
                await self.redis.setex(
                    cache_key,
                    self.settings.CACHE_TTL,
                    json.dumps({"embedding": embedding.tolist(), "metadata": {}})
                )
                return embedding

        return None

    async def delete_embedding(self, user_id: str):
        """Delete a user's embedding."""
        # Delete from cache
        cache_key = f"embedding:{user_id}"
        await self.redis.delete(cache_key)

        if self._use_pinecone:
            self.pinecone_index.delete(ids=[user_id])

        logger.debug("Deleted embedding", user_id=user_id)

    async def search(
        self,
        query_vector: np.ndarray,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        location: Optional[Tuple[float, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar profiles.

        Args:
            query_vector: Query embedding vector
            filters: Metadata filters
            limit: Maximum results to return
            location: Optional (lat, lon) for distance calculation

        Returns:
            List of matching profiles with scores
        """
        if self._use_pinecone:
            return await self._search_pinecone(query_vector, filters, limit, location)
        else:
            return await self._search_redis(query_vector, filters, limit, location)

    async def _search_pinecone(
        self,
        query_vector: np.ndarray,
        filters: Optional[Dict[str, Any]],
        limit: int,
        location: Optional[Tuple[float, float]]
    ) -> List[Dict[str, Any]]:
        """Search using Pinecone."""
        pinecone_filter = self._convert_filters_to_pinecone(filters) if filters else None

        results = self.pinecone_index.query(
            vector=query_vector.tolist(),
            filter=pinecone_filter,
            top_k=limit,
            include_metadata=True
        )

        profiles = []
        for match in results.matches:
            profile = {
                "user_id": match.id,
                "score": match.score,
                **match.metadata
            }

            # Calculate distance if location provided
            if location and "latitude" in match.metadata and "longitude" in match.metadata:
                profile["distance_km"] = self._calculate_distance(
                    location,
                    (match.metadata["latitude"], match.metadata["longitude"])
                )

            profiles.append(profile)

        return profiles

    async def _search_redis(
        self,
        query_vector: np.ndarray,
        filters: Optional[Dict[str, Any]],
        limit: int,
        location: Optional[Tuple[float, float]]
    ) -> List[Dict[str, Any]]:
        """
        Search using Redis (fallback for development).

        Note: This is a simplified implementation. For production,
        use Redis Search with vector similarity.
        """
        # Get all cached embeddings
        cursor = 0
        all_embeddings = []

        while True:
            cursor, keys = await self.redis.scan(
                cursor=cursor,
                match="embedding:*",
                count=100
            )

            for key in keys:
                cached = await self.redis.get(key)
                if cached:
                    user_id = key.replace("embedding:", "")
                    data = json.loads(cached)
                    all_embeddings.append({
                        "user_id": user_id,
                        "embedding": np.array(data["embedding"]),
                        "metadata": data.get("metadata", {})
                    })

            if cursor == 0:
                break

        # Calculate similarities
        results = []
        for item in all_embeddings:
            # Apply filters
            if filters and not self._matches_filters(item["metadata"], filters):
                continue

            similarity = self._cosine_similarity(query_vector, item["embedding"])

            profile = {
                "user_id": item["user_id"],
                "score": similarity,
                **item["metadata"]
            }

            if location:
                lat = item["metadata"].get("latitude")
                lon = item["metadata"].get("longitude")
                if lat and lon:
                    profile["distance_km"] = self._calculate_distance(location, (lat, lon))

            results.append(profile)

        # Sort by score and limit
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def _cosine_similarity(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """Calculate cosine similarity."""
        dot_product = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)

        if norm_a == 0 or norm_b == 0:
            return 0

        return float(dot_product / (norm_a * norm_b))

    def _calculate_distance(
        self,
        point_a: Tuple[float, float],
        point_b: Tuple[float, float]
    ) -> float:
        """Calculate distance between two points using Haversine formula."""
        from math import radians, sin, cos, sqrt, atan2

        lat1, lon1 = point_a
        lat2, lon2 = point_b

        R = 6371  # Earth's radius in km

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c

    def _prepare_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare metadata for storage (flatten nested dicts)."""
        flat = {}
        for key, value in metadata.items():
            if isinstance(value, dict):
                for k, v in value.items():
                    flat[f"{key}_{k}"] = v
            elif isinstance(value, list):
                flat[key] = value
            else:
                flat[key] = value
        return flat

    def _convert_filters_to_pinecone(
        self,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Convert filters to Pinecone format."""
        pinecone_filter = {}

        for key, value in filters.items():
            if isinstance(value, dict):
                for op, val in value.items():
                    if op == "$ne":
                        pinecone_filter[key] = {"$ne": val}
                    elif op == "$in":
                        pinecone_filter[key] = {"$in": val}
                    elif op == "$nin":
                        pinecone_filter[key] = {"$nin": val}
                    elif op == "$gte":
                        pinecone_filter[key] = {"$gte": val}
                    elif op == "$lte":
                        pinecone_filter[key] = {"$lte": val}
            else:
                pinecone_filter[key] = {"$eq": value}

        return pinecone_filter

    def _matches_filters(
        self,
        metadata: Dict[str, Any],
        filters: Dict[str, Any]
    ) -> bool:
        """Check if metadata matches filters (for Redis fallback)."""
        for key, condition in filters.items():
            value = metadata.get(key)

            if isinstance(condition, dict):
                for op, expected in condition.items():
                    if op == "$ne" and value == expected:
                        return False
                    elif op == "$in" and value not in expected:
                        return False
                    elif op == "$nin" and value in expected:
                        return False
                    elif op == "$gte" and (value is None or value < expected):
                        return False
                    elif op == "$lte" and (value is None or value > expected):
                        return False
            elif value != condition:
                return False

        return True
