"""Video processing utilities for deepfake detection."""

import io
import os
import tempfile
import logging
from typing import List, Tuple, Optional, Generator

import numpy as np
import cv2

logger = logging.getLogger(__name__)


def extract_frames(
    video_bytes: bytes,
    max_frames: Optional[int] = None,
    fps_sample: Optional[float] = None,
) -> List[np.ndarray]:
    """
    Extract frames from video bytes.

    Args:
        video_bytes: Raw video bytes
        max_frames: Maximum number of frames to extract
        fps_sample: Sample at this FPS (e.g., 1.0 for 1 frame per second)

    Returns:
        List of frames as numpy arrays (BGR format)
    """
    frames = []

    # Write bytes to temporary file
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
        tmp_file.write(video_bytes)
        tmp_path = tmp_file.name

    try:
        cap = cv2.VideoCapture(tmp_path)

        if not cap.isOpened():
            logger.error("Failed to open video file")
            return frames

        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS)

        # Calculate frame interval
        if fps_sample is not None and video_fps > 0:
            frame_interval = max(1, int(video_fps / fps_sample))
        else:
            frame_interval = 1

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                frames.append(frame)

                if max_frames is not None and len(frames) >= max_frames:
                    break

            frame_idx += 1

        cap.release()

    finally:
        # Cleanup temp file
        try:
            os.unlink(tmp_path)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file: {e}")

    logger.info(f"Extracted {len(frames)} frames from video")
    return frames


def sample_frames(
    frames: List[np.ndarray],
    num_samples: int,
    method: str = "uniform",
) -> List[np.ndarray]:
    """
    Sample a subset of frames.

    Args:
        frames: List of video frames
        num_samples: Number of samples to extract
        method: Sampling method ('uniform', 'random', 'keyframes')

    Returns:
        Sampled frames
    """
    if len(frames) <= num_samples:
        return frames

    if method == "uniform":
        # Uniform sampling
        indices = np.linspace(0, len(frames) - 1, num_samples, dtype=int)
        return [frames[i] for i in indices]

    elif method == "random":
        # Random sampling
        indices = np.random.choice(len(frames), num_samples, replace=False)
        indices = sorted(indices)
        return [frames[i] for i in indices]

    elif method == "keyframes":
        # Sample based on scene changes
        return _sample_keyframes(frames, num_samples)

    else:
        raise ValueError(f"Unknown sampling method: {method}")


def _sample_keyframes(frames: List[np.ndarray], num_samples: int) -> List[np.ndarray]:
    """
    Sample frames at scene changes.

    Args:
        frames: List of video frames
        num_samples: Number of samples

    Returns:
        Sampled frames
    """
    if len(frames) < 2:
        return frames

    # Calculate frame differences
    differences = []
    prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)

    for frame in frames[1:]:
        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(prev_gray, curr_gray)
        differences.append(np.mean(diff))
        prev_gray = curr_gray

    # Select frames with highest differences (scene changes)
    if len(differences) < num_samples:
        return frames

    # Get indices of top differences
    top_indices = np.argsort(differences)[-num_samples:]
    # Add 1 because differences is offset by 1
    top_indices = sorted([i + 1 for i in top_indices])

    # Always include first frame
    if 0 not in top_indices:
        top_indices = [0] + top_indices[:-1]

    return [frames[i] for i in top_indices]


def frame_generator(
    video_bytes: bytes,
    batch_size: int = 10,
) -> Generator[List[np.ndarray], None, None]:
    """
    Generate frames in batches for memory efficiency.

    Args:
        video_bytes: Raw video bytes
        batch_size: Number of frames per batch

    Yields:
        Batches of frames
    """
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
        tmp_file.write(video_bytes)
        tmp_path = tmp_file.name

    try:
        cap = cv2.VideoCapture(tmp_path)

        if not cap.isOpened():
            return

        batch = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            batch.append(frame)

            if len(batch) >= batch_size:
                yield batch
                batch = []

        if batch:
            yield batch

        cap.release()

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def get_video_info(video_bytes: bytes) -> dict:
    """
    Get video metadata.

    Args:
        video_bytes: Raw video bytes

    Returns:
        Dictionary with video info
    """
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
        tmp_file.write(video_bytes)
        tmp_path = tmp_file.name

    try:
        cap = cv2.VideoCapture(tmp_path)

        if not cap.isOpened():
            return {}

        info = {
            "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "duration_seconds": 0,
        }

        if info["fps"] > 0:
            info["duration_seconds"] = info["frame_count"] / info["fps"]

        cap.release()
        return info

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def resize_frame(
    frame: np.ndarray,
    max_size: int = 720,
) -> np.ndarray:
    """
    Resize frame to maximum dimension.

    Args:
        frame: Video frame (BGR)
        max_size: Maximum dimension

    Returns:
        Resized frame
    """
    height, width = frame.shape[:2]

    if max(width, height) <= max_size:
        return frame

    if width > height:
        new_width = max_size
        new_height = int(height * (max_size / width))
    else:
        new_height = max_size
        new_width = int(width * (max_size / height))

    return cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
