from django.contrib import admin
from .models import EmbeddingMeta, AISummary, HealthSummaryShare


@admin.register(EmbeddingMeta)
class EmbeddingMetaAdmin(admin.ModelAdmin):
    list_display = ('id', 'owner_type', 'owner_id', 'vector_dim', 'ts')
    list_filter = ('owner_type', 'ts')
    search_fields = ('owner_type', 'owner_id')


@admin.register(AISummary)
class AISummaryAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'method', 'ts')
    list_filter = ('method', 'ts')
    search_fields = ('patient__name', 'text')


@admin.register(HealthSummaryShare)
class HealthSummaryShareAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'share_token', 'is_active', 'created_at', 'expires_at')
    list_filter = ('is_active', 'created_at', 'expires_at')
    search_fields = ('patient__name', 'share_token')
