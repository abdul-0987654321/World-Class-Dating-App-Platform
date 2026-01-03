"""Image loading and preprocessing utilities."""

import io
import logging
from typing import Optional

from PIL import Image
import numpy as np
import httpx

logger = logging.getLogger(__name__)


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """
    Load an image from bytes.

    Args:
        image_bytes: Raw image bytes

    Returns:
        PIL Image in RGB mode

    Raises:
        ValueError: If image cannot be loaded
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        return image
    except Exception as e:
        logger.error(f"Failed to load image from bytes: {e}")
        raise ValueError(f"Invalid image data: {e}")


async def load_image_from_url(
    url: str,
    client: Optional[httpx.AsyncClient] = None,
    timeout: float = 30.0,
) -> Image.Image:
    """
    Load an image from a URL.

    Args:
        url: Image URL
        client: Optional httpx client (will create one if not provided)
        timeout: Request timeout in seconds

    Returns:
        PIL Image in RGB mode

    Raises:
        ValueError: If image cannot be downloaded or loaded
    """
    should_close_client = client is None

    try:
        if client is None:
            client = httpx.AsyncClient(timeout=timeout)

        response = await client.get(url)
        response.raise_for_status()

        return load_image_from_bytes(response.content)

    except httpx.RequestError as e:
        logger.error(f"Failed to download image from {url}: {e}")
        raise ValueError(f"Failed to download image: {e}")

    finally:
        if should_close_client and client is not None:
            await client.aclose()


def image_to_numpy(image: Image.Image) -> np.ndarray:
    """
    Convert PIL Image to numpy array.

    Args:
        image: PIL Image

    Returns:
        Numpy array in RGB format (H, W, C)
    """
    return np.array(image)


def numpy_to_image(array: np.ndarray) -> Image.Image:
    """
    Convert numpy array to PIL Image.

    Args:
        array: Numpy array in RGB format

    Returns:
        PIL Image
    """
    return Image.fromarray(array.astype(np.uint8))


def resize_image(
    image: Image.Image,
    max_size: int = 1024,
    keep_aspect: bool = True,
) -> Image.Image:
    """
    Resize image to maximum size while optionally keeping aspect ratio.

    Args:
        image: PIL Image
        max_size: Maximum dimension (width or height)
        keep_aspect: Whether to keep aspect ratio

    Returns:
        Resized image
    """
    if keep_aspect:
        width, height = image.size
        if max(width, height) <= max_size:
            return image

        if width > height:
            new_width = max_size
            new_height = int(height * (max_size / width))
        else:
            new_height = max_size
            new_width = int(width * (max_size / height))

        return image.resize((new_width, new_height), Image.LANCZOS)
    else:
        return image.resize((max_size, max_size), Image.LANCZOS)


def center_crop(image: Image.Image, size: int) -> Image.Image:
    """
    Center crop an image to a square.

    Args:
        image: PIL Image
        size: Target size

    Returns:
        Center-cropped image
    """
    width, height = image.size

    # Calculate crop box
    left = (width - size) // 2
    top = (height - size) // 2
    right = left + size
    bottom = top + size

    return image.crop((left, top, right, bottom))


def get_image_hash(image: Image.Image, hash_size: int = 8) -> str:
    """
    Calculate perceptual hash of an image.

    Args:
        image: PIL Image
        hash_size: Hash grid size

    Returns:
        Hex string hash
    """
    # Resize and convert to grayscale
    resized = image.resize((hash_size + 1, hash_size), Image.LANCZOS).convert("L")
    pixels = list(resized.getdata())

    # Calculate difference
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            left = pixels[row * (hash_size + 1) + col]
            right = pixels[row * (hash_size + 1) + col + 1]
            diff.append(left > right)

    # Convert to hex
    hex_str = ""
    for i in range(0, len(diff), 4):
        nibble = diff[i:i+4]
        value = sum(b << (3-j) for j, b in enumerate(nibble))
        hex_str += format(value, 'x')

    return hex_str
