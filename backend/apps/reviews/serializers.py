from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'user', 'user_email', 'doctor', 'organization', 
            'rating', 'comment', 'is_verified_purchase', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'is_verified_purchase']

    def validate(self, data):
        if not data.get('doctor') and not data.get('organization'):
            raise serializers.ValidationError("Either doctor or organization must be provided.")
        if data.get('doctor') and data.get('organization'):
            raise serializers.ValidationError("Cannot review both doctor and organization in one review.")
        return data
