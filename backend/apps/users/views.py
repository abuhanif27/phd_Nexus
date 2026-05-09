"""
Authentication views with JWT and 2FA support.
"""
import random
import string
import pyotp
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status, generics, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, OTPToken, UserSettings
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, TwoFASerializer,
    UserSettingsSerializer, ChangePasswordSerializer, ProfileUpdateSerializer,
    EmailChangeSerializer, VerifyOTPSerializer, TOTPVerifySerializer
)


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Create default UserSettings
            UserSettings.objects.get_or_create(user=user)
            
            # If user is a doctor, they are initially INACTIVE and require admin approval
            is_doctor = user.role == 'doctor'
            if is_doctor:
                user.is_active = False
                user.save()
            
            # Generate JWT tokens (only if active)
            if user.is_active:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'user': UserSerializer(user).data,
                    'message': 'Account created successfully. Please wait for admin approval before you can sign in.',
                    'pending_approval': True
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            # Better error detail
            error_data = getattr(e, 'detail', str(e))
            return Response(
                {'error': 'Registration failed', 'details': error_data},
                status=status.HTTP_400_BAD_REQUEST
            )


class LoginView(views.APIView):
    """User login endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                user = None
        except User.DoesNotExist:
            user = None
        
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            # Check if it's a doctor waiting for approval
            if user.role == 'doctor':
                try:
                    profile = user.doctor_profile
                    if profile.verification_status == 'pending':
                        return Response(
                            {'error': 'Your account is pending admin approval. We will notify you once approved.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    elif profile.verification_status == 'rejected':
                        return Response(
                            {'error': f'Your registration was rejected. Reason: {profile.admin_notes}'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Exception:
                    pass
            
            return Response({'error': 'Account is inactive. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)
        
        if user.twofa_enabled:
            # Check for TOTP vs Email/SMS
            return Response({
                'requires_2fa': True,
                'user_id': user.id,
                'twofa_method': user.twofa_method
            })
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class TwoFASendView(views.APIView):
    """Send 2FA OTP code (Email/SMS)."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        code = ''.join(random.choices(string.digits, k=6))
        
        OTPToken.objects.create(
            user=user,
            code=code,
            purpose='2fa',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        # Real Email Sending
        send_mail(
            'Your 2FA Code',
            f'Your PhD Nexus security code is: {code}',
            settings.DEFAULT_FROM_EMAIL or 'noreply@phdnexus.com',
            [user.email],
            fail_silently=False,
        )
        
        return Response({'message': 'OTP sent'})


class TwoFAVerifyView(views.APIView):
    """Verify 2FA OTP code (Email/SMS or TOTP)."""
    permission_classes = [AllowAny] # Used during login or setting up
    
    def post(self, request):
        user_id = request.data.get('user_id')
        code = request.data.get('code')
        
        if not user_id or not code:
            return Response({'error': 'User ID and code required'}, status=400)
            
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        is_valid = False
        
        if user.twofa_method == 'totp':
            totp = pyotp.TOTP(user.twofa_secret)
            is_valid = totp.verify(code)
        else:
            try:
                otp = OTPToken.objects.get(
                    user=user, code=code, purpose='2fa',
                    used=False, expires_at__gt=timezone.now()
                )
                otp.used = True
                otp.save()
                is_valid = True
            except OTPToken.DoesNotExist:
                pass

        if is_valid:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        
        return Response({'error': 'Invalid or expired code'}, status=400)


class UserSettingsView(views.APIView):
    """Get and update user settings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfileUpdateView(views.APIView):
    """Update user profile details."""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        
        if 'phone' in data:
            user.phone = data['phone']
        user.save()

        if user.role == 'patient':
            try:
                profile = user.patient_profile
                for attr, val in data.items():
                    if hasattr(profile, attr): setattr(profile, attr, val)
                profile.save()
            except Exception: pass
        elif user.role == 'doctor':
            try:
                profile = user.doctor_profile
                for attr, val in data.items():
                    if hasattr(profile, attr): setattr(profile, attr, val)
                profile.save()
            except Exception: pass

        return Response(UserSerializer(user).data)


class ChangePasswordView(views.APIView):
    """Change user password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({"error": "Incorrect current password."}, status=400)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"message": "Password updated successfully."})


# --- REAL EMAIL & 2FA LOGIC ---

class EmailChangeRequestView(views.APIView):
    """Initiate email change by sending OTP to the NEW email."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_email = serializer.validated_data['new_email']
        
        if User.objects.filter(email=new_email).exists():
            return Response({'error': 'Email already in use'}, status=400)
            
        code = ''.join(random.choices(string.digits, k=6))
        user = request.user
        user.pending_email = new_email
        user.save()
        
        OTPToken.objects.create(
            user=user, code=code, purpose='email_change',
            expires_at=timezone.now() + timedelta(minutes=15)
        )
        
        send_mail(
            'Confirm your new email',
            f'Your email change confirmation code is: {code}',
            settings.DEFAULT_FROM_EMAIL or 'noreply@phdnexus.com',
            [new_email],
            fail_silently=False,
        )
        
        return Response({'message': f'Verification code sent to {new_email}'})


class EmailChangeVerifyView(views.APIView):
    """Verify OTP and update user's email."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code']
        user = request.user
        
        try:
            otp = OTPToken.objects.get(
                user=user, code=code, purpose='email_change',
                used=False, expires_at__gt=timezone.now()
            )
            if not user.pending_email:
                return Response({'error': 'No pending email change'}, status=400)
                
            user.email = user.pending_email
            user.pending_email = None
            user.email_verified = True
            user.save()
            
            otp.used = True
            otp.save()
            
            return Response({'message': 'Email updated successfully', 'email': user.email})
        except OTPToken.DoesNotExist:
            return Response({'error': 'Invalid or expired code'}, status=400)


class TwoFASetupView(views.APIView):
    """Generate TOTP secret for Authenticator App."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.twofa_secret:
            user.twofa_secret = pyotp.random_base32()
            user.save()
            
        totp = pyotp.TOTP(user.twofa_secret)
        provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="PhD Nexus")
        
        return Response({
            'secret': user.twofa_secret,
            'provisioning_uri': provisioning_uri
        })


class TwoFAToggleView(views.APIView):
    """Enable/Disable 2FA after verification."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get('action') # 'enable' or 'disable'
        method = request.data.get('method', 'email') # 'email' or 'totp'
        code = request.data.get('code')
        
        user = request.user
        
        if action == 'disable':
            # Require code to disable
            is_valid = False
            if user.twofa_method == 'totp':
                is_valid = pyotp.TOTP(user.twofa_secret).verify(code)
            else:
                is_valid = OTPToken.objects.filter(user=user, code=code, purpose='2fa', used=False).exists()
            
            if not is_valid: return Response({'error': 'Invalid verification code'}, status=400)
            
            user.twofa_enabled = False
            user.save()
            return Response({'message': '2FA disabled successfully'})

        # To enable, we MUST verify a code first
        if not code: return Response({'error': 'Verification code required to enable 2FA'}, status=400)
        
        is_valid = False
        if method == 'totp':
            if not user.twofa_secret: return Response({'error': 'TOTP secret not setup'}, status=400)
            is_valid = pyotp.TOTP(user.twofa_secret).verify(code)
        else:
            try:
                otp = OTPToken.objects.get(user=user, code=code, purpose='2fa', used=False, expires_at__gt=timezone.now())
                otp.used = True
                otp.save()
                is_valid = True
            except OTPToken.DoesNotExist: pass
            
        if is_valid:
            user.twofa_enabled = True
            user.twofa_method = method
            user.save()
            return Response({'message': f'2FA enabled successfully using {method}'})
            
        return Response({'error': 'Invalid verification code'}, status=400)


class MeView(views.APIView):
    """Get current user info."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
