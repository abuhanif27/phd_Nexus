import os
from django.core.management.base import BaseCommand
from django.conf import settings
from huggingface_hub import HfApi, login

class Command(BaseCommand):
    help = 'Push local trained models to Hugging Face Hub'

    def handle(self, *args, **options):
        token = getattr(settings, 'HF_TOKEN', None)
        repo_id = getattr(settings, 'HF_REPO_ID', None)
        model_dir = os.path.join(settings.BASE_DIR, 'ai_models')

        if not token:
            self.stdout.write(self.style.ERROR('HF_TOKEN not found in settings/.env'))
            return
        if not repo_id:
            self.stdout.write(self.style.ERROR('HF_REPO_ID not found in settings/.env'))
            return

        self.stdout.write(f"Logging into Hugging Face...")
        login(token=token)
        api = HfApi()

        if not os.path.exists(model_dir):
            self.stdout.write(self.style.ERROR(f"Model directory {model_dir} does not exist."))
            return

        files = [f for f in os.listdir(model_dir) if f.endswith('.joblib') or f.endswith('.pt')]
        if not files:
            self.stdout.write(self.style.WARNING("No model files (.joblib, .pt) found to upload."))
            return

        for file_name in files:
            file_path = os.path.join(model_dir, file_name)
            self.stdout.write(f"Uploading {file_name} to {repo_id}...")
            api.upload_file(
                path_or_fileobj=file_path,
                path_in_repo=file_name,
                repo_id=repo_id,
                repo_type="model"
            )
        
        self.stdout.write(self.style.SUCCESS(f"Successfully uploaded {len(files)} models to Hugging Face!"))
