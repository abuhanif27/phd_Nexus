"""
Utility for generating HMAC-signed file URLs.
"""
import hmac
import hashlib
import time
from urllib.parse import urlencode
from django.conf import settings


def sign_file_path(file_path: str, exp_seconds: int = 300) -> str:
    """
    Generate HMAC signature for a file path with expiration.
    
    Args:
        file_path: Relative path to the file
        exp_seconds: Expiration time in seconds (default 5 minutes)
    
    Returns:
        Query string with signature and expiration
    """
    expires = int(time.time()) + exp_seconds
    
    # Create message to sign
    message = f"{file_path}|{expires}"
    
    # Generate HMAC signature
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return urlencode({'sig': signature, 'exp': expires})


def verify_file_signature(file_path: str, signature: str, expires: str) -> bool:
    """
    Verify HMAC signature for a file path.
    
    Returns:
        True if signature is valid and not expired
    """
    try:
        # Check expiration
        if int(expires) < int(time.time()):
            return False
        
        # Recreate message
        message = f"{file_path}|{expires}"
        
        # Generate expected signature
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures (constant-time comparison)
        return hmac.compare_digest(signature, expected_sig)
    
    except:
        return False
