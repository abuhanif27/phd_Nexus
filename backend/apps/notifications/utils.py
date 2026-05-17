import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def send_verification_otp(user, code):
    """
    Helper to send registration verification OTP using Django's configured email backend.
    """
    subject = "Verify your NexusCare Account"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">Welcome to PhD NexusCare</h2>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
            {code}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">&copy; 2026 PhD NexusCare AI Medical Platform</p>
    </div>
    """
    return _send_html_email(user.email, subject, html_content)

def send_2fa_otp(user, code):
    """
    Helper to send 2FA OTP code.
    """
    subject = "Your PhD Nexus Security Code"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">Security Verification</h2>
        <p>Your security code for PhD NexusCare is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
            {code}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you did not attempt to log in, please change your password immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">&copy; 2026 PhD NexusCare AI Medical Platform</p>
    </div>
    """
    return _send_html_email(user.email, subject, html_content)

def send_email_change_otp(email, code):
    """
    Helper to send email change confirmation OTP to the NEW email.
    """
    subject = "Confirm your new email - NexusCare"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">Email Change Request</h2>
        <p>You requested to change your PhD NexusCare email. Please use the following code to confirm this change:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
            {code}
        </div>
        <p>If you did not request this change, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">&copy; 2026 PhD NexusCare AI Medical Platform</p>
    </div>
    """
    return _send_html_email(email, subject, html_content)

def _send_html_email(to_email, subject, html_content):
    """
    Internal helper to send HTML emails via Django's configured backend.
    """
    try:
        sent = send_mail(
            subject,
            "", # No plain text
            settings.DEFAULT_FROM_EMAIL,
            [to_email],
            html_message=html_content,
            fail_silently=False,
        )
        return bool(sent)
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def send_password_reset_otp(user, code):
    """
    Helper to send password reset OTP.
    """
    subject = "Reset your NexusCare Password"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You requested to reset your PhD NexusCare password. Please use the following code to proceed:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
            {code}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request a password reset, please secure your account immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">&copy; 2026 PhD NexusCare AI Medical Platform</p>
    </div>
    """
    return _send_html_email(user.email, subject, html_content)
