# Deepfake Detection Service Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install PyTorch CPU version first (for smaller image size in production)
# For GPU support, use: torch torchvision --index-url https://download.pytorch.org/whl/cu118
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt


# Stage 2: Production stage
FROM python:3.11-slim as production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN groupadd -r deepfake && useradd -r -g deepfake deepfake

# Copy application code
COPY . .

# Create models directory
RUN mkdir -p /app/models/weights && \
    chown -R deepfake:deepfake /app

# Switch to non-root user
USER deepfake

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEEPFAKE_HOST=0.0.0.0 \
    DEEPFAKE_PORT=8010

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8010/health')" || exit 1

# Run application
CMD ["python", "main.py"]


# Stage 3: GPU-enabled production image
FROM nvidia/cuda:11.8-cudnn8-runtime-ubuntu22.04 as production-gpu

WORKDIR /app

# Install Python and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create symlinks for python
RUN ln -sf /usr/bin/python3.11 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# Copy requirements
COPY requirements.txt .

# Install dependencies with CUDA support
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu118 && \
    pip install --no-cache-dir -r requirements.txt

# Create non-root user
RUN groupadd -r deepfake && useradd -r -g deepfake deepfake

# Copy application code
COPY . .

# Create models directory
RUN mkdir -p /app/models/weights && \
    chown -R deepfake:deepfake /app

# Switch to non-root user
USER deepfake

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEEPFAKE_HOST=0.0.0.0 \
    DEEPFAKE_PORT=8010 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8010/health')" || exit 1

# Run application
CMD ["python", "main.py"]
