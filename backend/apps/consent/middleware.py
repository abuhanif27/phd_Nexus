"""
Audit middleware for tracking API access.
"""
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog


class AuditMiddleware(MiddlewareMixin):
    """
    Logs all authenticated requests to the audit trail.
    """
    def process_response(self, request, response):
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Skip admin and static endpoints
            if not request.path.startswith('/admin/') and not request.path.startswith('/static/'):
                try:
                    AuditLog.objects.create(
                        actor_id=request.user.id,
                        actor_role=request.user.role,
                        action=request.method,
                        resource=request.path,
                        purpose=request.GET.get('purpose', ''),
                        metadata={
                            'status_code': response.status_code,
                            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
                        }
                    )
                except Exception:
                    # Don't break the request if audit logging fails
                    pass
        return response
