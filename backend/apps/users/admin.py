from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django import forms
from .models import User, OTPToken


class UserCreationForm(forms.ModelForm):
    """Form for creating new users with password."""
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Password confirmation', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('email', 'role', 'phone')

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords don't match")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    """Form for updating users."""
    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text=(
            "Raw passwords are not stored. You can change the password "
            "using <a href=\"../password/\">this form</a>."
        ),
    )

    class Meta:
        model = User
        fields = ('email', 'password', 'role', 'phone', 'is_active', 'is_staff', 'is_superuser')


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = ('email', 'role', 'is_staff', 'is_active', 'created_at')
    list_filter = ('role', 'is_staff', 'is_active', 'twofa_enabled')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('phone', 'role', 'twofa_enabled', 'twofa_secret')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('created_at', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'role', 'phone', 'password1', 'password2', 'is_staff', 'is_superuser'),
        }),
    )
    readonly_fields = ('created_at', 'last_login')
    search_fields = ('email', 'phone')
    ordering = ('-created_at',)
    filter_horizontal = ('groups', 'user_permissions')


@admin.register(OTPToken)
class OTPTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'purpose', 'used', 'created_at', 'expires_at')
    list_filter = ('purpose', 'used')
    search_fields = ('user__email', 'code')
    readonly_fields = ('created_at',)


admin.site.register(User, UserAdmin)
