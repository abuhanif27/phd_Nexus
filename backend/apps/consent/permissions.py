"""
DRF permission classes for consent-based access control.
"""
from rest_framework import permissions
from .utils import decode_scoped_token


class HasConsentScope(permissions.BasePermission):
    """
    Permission class to check for required consent scopes.
    """
    def __init__(self, scope_needed: list = None):
        self.scope_needed = scope_needed or []
    
    def has_permission(self, request, view):
        # Get scoped token from header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return False
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = decode_scoped_token(token)
            granted_scopes = payload.get('scp', {}).get('read', [])
            
            # Check if all required scopes are granted
            return all(scope in granted_scopes for scope in self.scope_needed)
        except:
            return False


class IsPatient(permissions.BasePermission):
    """Only patients can access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'patient'


class IsDoctor(permissions.BasePermission):
    """Only doctors can access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'doctor'


class IsAdmin(permissions.BasePermission):
    """Only admins can access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'
