"""
NLP Service Logging Configuration
"""

import sys
import os

# Add shared logging config to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../shared'))

from logging_config import configure_logging, get_logger, add_correlation_id

# Configure logging for NLP service
configure_logging('nlp-service')

# Export logger
logger = get_logger('nlp-service', service='nlp-service')

__all__ = ['logger', 'get_logger', 'add_correlation_id']
