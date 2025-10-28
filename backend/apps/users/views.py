"""
Authentication views with JWT and 2FA support.
"""
import random
import string
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework import status, generics, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, OTPToken
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, TwoFASerializer


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(views.APIView):
    """User login endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if 2FA is enabled
        if user.twofa_enabled:
            return Response({
                'requires_2fa': True,
                'user_id': user.id
            })
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class TwoFASendView(views.APIView):
    """Send 2FA OTP code."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Generate 6-digit OTP
        code = ''.join(random.choices(string.digits, k=6))
        
        # Create OTP token
        otp = OTPToken.objects.create(
            user=user,
            code=code,
            purpose='2fa',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        # In production, send via email/SMS
        # For dev, just print to console
        print(f"[2FA OTP] Code for {user.email}: {code}")
        
        return Response({
            'message': 'OTP sent',
            'otp_last4': code[-4:]  # Show last 4 digits for dev
        })


class TwoFAVerifyView(views.APIView):
    """Verify 2FA OTP code."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TwoFASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code']
        
        # Find valid OTP
        try:
            otp = OTPToken.objects.get(
                user=request.user,
                code=code,
                purpose='2fa',
                used=False,
                expires_at__gt=timezone.now()
            )
            
            # Mark as used
            otp.used = True
            otp.save()
            
            return Response({'message': '2FA verified'})
        
        except OTPToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MeView(views.APIView):
    """Get current user info."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
