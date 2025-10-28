"""
Utilities for generating and validating scoped JWT tokens for consent.
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings


def generate_scoped_token(user, scope: dict, ttl_hours: int = 48) -> str:
    """
    Generate a scoped JWT token for consent-based access.
    
    Args:
        user: User object (typically a doctor)
        scope: Dict like {"read": ["labs", "prescriptions"], "write": []}
        ttl_hours: Time-to-live in hours
    
    Returns:
        Encoded JWT token string
    """
    payload = {
        'sub': user.id,
        'email': user.email,
        'role': user.role,
        'scp': scope,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=ttl_hours)
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token


def decode_scoped_token(token: str) -> dict:
    """
    Decode and validate a scoped JWT token.
    
    Returns:
        Decoded payload dict
    
    Raises:
        jwt.InvalidTokenError if token is invalid or expired
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    return payload


def verify_scope(token: str, required_scopes: list) -> bool:
    """
    Check if token has required scopes.
    
    Args:
        token: JWT token string
        required_scopes: List of scope strings like ["labs", "prescriptions"]
    
    Returns:
        True if all required scopes are present
    """
    try:
        payload = decode_scoped_token(token)
        granted_scopes = payload.get('scp', {}).get('read', [])
        
        return all(scope in granted_scopes for scope in required_scopes)
    except:
        return False
