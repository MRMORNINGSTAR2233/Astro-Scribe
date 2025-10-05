"""
Utility functions for the NASA Knowledge Search Engine
"""

import os
import logging
import time
from typing import Dict, List, Any, Optional
import streamlit as st
import hashlib
import json

logger = logging.getLogger(__name__)

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/app.log'),
            logging.StreamHandler()
        ]
    )

def check_api_keys() -> Dict[str, bool]:
    """Check if required API keys are configured"""
    required_keys = ['GROQ_API_KEY', 'GOOGLE_API_KEY']
    status = {}
    
    for key in required_keys:
        value = os.getenv(key)
        status[key] = bool(value and value != f'your_{key.lower()}_here')
    
    return status

def get_file_hash(file_content: bytes) -> str:
    """Generate MD5 hash for file content"""
    return hashlib.md5(file_content).hexdigest()

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"

def validate_file_type(filename: str, allowed_types: List[str]) -> bool:
    """Validate if file type is allowed"""
    file_extension = filename.lower().split('.')[-1]
    return file_extension in [t.lower() for t in allowed_types]

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove or replace unsafe characters
    unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    
    return filename

def create_progress_tracker(total: int, description: str = "Processing"):
    """Create a progress tracker for long operations"""
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    def update(current: int, message: str = ""):
        progress = current / total if total > 0 else 0
        progress_bar.progress(progress)
        status_text.text(f"{description}: {current}/{total} {message}")
    
    return update

def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """Safely load JSON string with fallback"""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default

def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate text to specified length"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """Extract keywords from text (simple implementation)"""
    # Remove common stop words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    }
    
    # Simple keyword extraction
    words = text.lower().split()
    keywords = []
    
    for word in words:
        # Clean word
        word = ''.join(c for c in word if c.isalnum())
        
        # Filter keywords
        if (len(word) > 3 and 
            word not in stop_words and 
            word not in keywords):
            keywords.append(word)
        
        if len(keywords) >= max_keywords:
            break
    
    return keywords

def time_ago(timestamp: str) -> str:
    """Convert timestamp to human readable time ago format"""
    try:
        from datetime import datetime
        
        # Parse timestamp
        if isinstance(timestamp, str):
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        else:
            dt = timestamp
        
        now = datetime.now()
        diff = now - dt.replace(tzinfo=None)
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
    
    except Exception:
        return "unknown"

def cache_key(*args) -> str:
    """Generate cache key from arguments"""
    key_string = "_".join(str(arg) for arg in args)
    return hashlib.md5(key_string.encode()).hexdigest()

def retry_operation(operation, max_retries: int = 3, delay: float = 1.0):
    """Retry operation with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            
            logger.warning(f"Operation failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
            time.sleep(delay)
            delay *= 2  # Exponential backoff
    
    return None

def format_number(number: int) -> str:
    """Format number with commas for readability"""
    return f"{number:,}"

def validate_environment() -> Dict[str, Any]:
    """Validate environment setup"""
    validation_results = {
        'api_keys': check_api_keys(),
        'directories': {},
        'dependencies': {}
    }
    
    # Check directories
    required_dirs = ['uploads', 'logs']
    for dir_name in required_dirs:
        dir_path = os.path.join(os.getcwd(), dir_name)
        validation_results['directories'][dir_name] = os.path.exists(dir_path)
        
        # Create directory if it doesn't exist
        if not os.path.exists(dir_path):
            try:
                os.makedirs(dir_path)
                validation_results['directories'][dir_name] = True
            except Exception as e:
                logger.error(f"Failed to create directory {dir_name}: {e}")
    
    # Check Python dependencies
    required_packages = [
        'streamlit', 'psycopg2', 'neo4j', 
        'groq', 'google.generativeai'
    ]
    
    for package in required_packages:
        try:
            __import__(package)
            validation_results['dependencies'][package] = True
        except ImportError:
            validation_results['dependencies'][package] = False
    
    return validation_results

class Timer:
    """Simple timer context manager"""
    
    def __init__(self, description: str = "Operation"):
        self.description = description
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        logger.info(f"{self.description} completed in {duration:.2f} seconds")
    
    @property
    def elapsed(self) -> float:
        if self.start_time is None:
            return 0.0
        
        end_time = self.end_time or time.time()
        return end_time - self.start_time