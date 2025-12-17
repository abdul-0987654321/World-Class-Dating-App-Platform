"""
Recommendation Service Logging Configuration
"""

import sys
import os

# Add shared logging config to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../shared'))

from logging_config import configure_logging, get_logger, add_correlation_id

# Configure logging for recommendation service
configure_logging('recommendation-service')

# Export logger
logger = get_logger('recommendation-service', service='recommendation-service')

__all__ = ['logger', 'get_logger', 'add_correlation_id']
