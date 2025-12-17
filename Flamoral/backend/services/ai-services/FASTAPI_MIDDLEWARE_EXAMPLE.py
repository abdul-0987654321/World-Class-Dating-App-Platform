"""
Example: Complete FastAPI App with Logging Middleware

This file demonstrates how to properly configure logging
in a FastAPI application.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from uuid import uuid4
import time
import sys
import os

# Add shared logging to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../shared'))

from logging_config import configure_logging, get_logger, add_correlation_id

# Configure logging
configure_logging('example-service')
logger = get_logger('example-service', service='example-service')

# Create FastAPI app
app = FastAPI(
    title="Example Service",
    description="Example service with proper logging",
    version="1.0.0"
)


# 1. CORRELATION ID MIDDLEWARE
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    """Add correlation ID to all requests"""
    correlation_id = request.headers.get('x-correlation-id', str(uuid4()))

    # Store in request state
    request.state.correlation_id = correlation_id

    # Add correlation ID to logger
    request.state.logger = add_correlation_id(logger, correlation_id)

    # Process request
    response = await call_next(request)

    # Add to response headers
    response.headers['x-correlation-id'] = correlation_id

    return response


# 2. REQUEST LOGGING MIDDLEWARE
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log all requests"""
    # Skip health checks
    if request.url.path in ['/health', '/ready']:
        return await call_next(request)

    start_time = time.time()
    request_logger = getattr(request.state, 'logger', logger)

    # Log request
    request_logger.info(
        "Incoming request",
        extra={
            'method': request.method,
            'path': request.url.path,
            'query_params': str(request.query_params),
            'client_ip': request.client.host if request.client else None,
            'user_agent': request.headers.get('user-agent'),
        }
    )

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log response
    level = 'error' if response.status_code >= 500 else 'warning' if response.status_code >= 400 else 'info'
    log_method = getattr(request_logger, level)

    log_method(
        "Request completed",
        extra={
            'method': request.method,
            'path': request.url.path,
            'status_code': response.status_code,
            'duration': f"{duration*1000:.2f}ms",
        }
    )

    return response


# 3. ERROR HANDLER
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    request_logger = getattr(request.state, 'logger', logger)
    correlation_id = getattr(request.state, 'correlation_id', None)

    # Determine status code
    status_code = getattr(exc, 'status_code', 500)

    # Log error
    request_logger.error(
        "Unhandled exception",
        extra={
            'error': str(exc),
            'type': type(exc).__name__,
            'method': request.method,
            'path': request.url.path,
            'correlation_id': correlation_id,
        },
        exc_info=True
    )

    # Return error response
    return JSONResponse(
        status_code=status_code,
        content={
            'error': {
                'message': str(exc) if status_code < 500 else 'Internal Server Error',
                'type': type(exc).__name__,
                'correlation_id': correlation_id,
            }
        }
    )


# 4. ROUTES
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {"status": "ready"}


@app.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get user by ID"""
    request_logger = getattr(request.state, 'logger', logger)

    request_logger.info('Fetching user', extra={'user_id': user_id})

    # Your business logic here
    user = await fetch_user_from_db(user_id)

    if not user:
        request_logger.warning('User not found', extra={'user_id': user_id})
        raise HTTPException(status_code=404, detail='User not found')

    request_logger.info('User fetched successfully', extra={'user_id': user_id})

    return user


# Example helper function
async def fetch_user_from_db(user_id: str):
    """Fetch user from database"""
    # Your implementation
    return {
        'id': user_id,
        'name': 'John Doe',
        'email': 'john@example.com'
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    """Log startup"""
    logger.info(
        "Service starting",
        extra={
            'version': app.version,
            'environment': os.getenv('NODE_ENV', 'development'),
        }
    )


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown"""
    logger.info("Service shutting down")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv('NODE_ENV') != 'production',
    )
