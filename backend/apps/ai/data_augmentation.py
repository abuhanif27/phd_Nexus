"""
Advanced Data Augmentation for Medical Symptom Classification
Generates high-quality synthetic training data using multiple techniques.
"""
import random
import re
from typing import List, Tuple
import pandas as pd


class MedicalDataAugmenter:
    """Generate augmented medical symptom training data."""
    
    def __init__(self):
        # Synonym mappings for medical terms
        self.synonyms = {
            'pain': ['discomfort', 'ache', 'soreness', 'hurt', 'tenderness', 'agony'],
            'severe': ['intense', 'extreme', 'acute', 'sharp', 'serious', 'critical'],
            'headache': ['head pain', 'cephalgia', 'head discomfort', 'cranial pain'],
            'chest': ['thoracic', 'breast', 'thorax'],
            'stomach': ['abdominal', 'belly', 'tummy', 'gastric'],
            'difficulty': ['trouble', 'problem', 'struggle', 'hard time'],
            'breathing': ['respiration', 'inhaling', 'taking breaths'],
            'fever': ['high temperature', 'elevated temperature', 'pyrexia', 'febrile'],
            'nausea': ['queasiness', 'sick feeling', 'upset stomach', 'feeling sick'],
            'fatigue': ['tiredness', 'exhaustion', 'weakness', 'lethargy', 'weariness'],
            'dizziness': ['vertigo', 'lightheadedness', 'spinning sensation', 'unsteadiness'],
            'rash': ['skin eruption', 'skin irritation', 'dermatitis', 'skin condition'],
            'swelling': ['inflammation', 'puffiness', 'edema', 'bloating'],
            'numbness': ['tingling', 'loss of sensation', 'pins and needles', 'paresthesia'],
            'vision': ['sight', 'eyesight', 'visual'],
            'cough': ['coughing', 'hack', 'tussis'],
            'anxiety': ['nervousness', 'worry', 'apprehension', 'unease'],
            'sudden': ['abrupt', 'rapid', 'quick', 'immediate', 'swift'],
            'chronic': ['persistent', 'ongoing', 'long-term', 'prolonged', 'continuous'],
        }
        
        # Sentence patterns for natural variation
        self.patterns = [
            "{symptom1} and {symptom2}",
            "{symptom1} with {symptom2}",
            "I have {symptom1} and {symptom2}",
            "Experiencing {symptom1} along with {symptom2}",
            "{symptom1}, also {symptom2}",
            "Suffering from {symptom1} and {symptom2}",
            "{symptom1} accompanied by {symptom2}",
            "{symptom1} together with {symptom2}",
            "Having {symptom1} and {symptom2}",
            "Dealing with {symptom1} and {symptom2}",
        ]
        
        # Duration phrases
        self.durations = [
            "for {n} days",
            "for {n} weeks",
            "for the past {n} days",
            "since {n} days ago",
            "lasting {n} days",
            "ongoing for {n} days",
        ]
        
        # Severity modifiers
        self.severity = [
            'mild', 'moderate', 'severe', 'intense', 'slight', 
            'extreme', 'unbearable', 'sharp', 'dull', 'throbbing'
        ]
        
        # Time-of-day modifiers
        self.timing = [
            'in the morning', 'at night', 'during the day', 
            'in the evening', 'intermittently', 'constantly',
            'periodically', 'occasionally', 'frequently'
        ]
    
    def synonym_replacement(self, text: str, n: int = 2) -> str:
        """Replace n random words with their synonyms."""
        words = text.split()
        new_words = words.copy()
        
        # Find replaceable words
        replaceable_positions = []
        for i, word in enumerate(words):
            word_lower = word.lower().strip('.,!?;:')
            if word_lower in self.synonyms:
                replaceable_positions.append(i)
        
        # Randomly replace up to n words
        if replaceable_positions:
            positions_to_replace = random.sample(
                replaceable_positions, 
                min(n, len(replaceable_positions))
            )
            
            for pos in positions_to_replace:
                word_lower = words[pos].lower().strip('.,!?;:')
                if word_lower in self.synonyms:
                    new_word = random.choice(self.synonyms[word_lower])
                    new_words[pos] = new_word
        
        return ' '.join(new_words)
    
    def add_duration(self, text: str) -> str:
        """Add duration information to symptoms."""
        n = random.randint(1, 14)
        duration = random.choice(self.durations).format(n=n)
        return f"{text} {duration}"
    
    def add_severity(self, text: str) -> str:
        """Add severity modifier to symptoms."""
        severity = random.choice(self.severity)
        # Add before the first noun if possible
        if any(word in text.lower() for word in ['pain', 'ache', 'headache', 'discomfort']):
            for word in ['pain', 'ache', 'headache', 'discomfort']:
                if word in text.lower():
                    return text.replace(word, f"{severity} {word}", 1)
        return f"{severity} {text}"
    
    def add_timing(self, text: str) -> str:
        """Add timing information to symptoms."""
        timing = random.choice(self.timing)
        return f"{text} {timing}"
    
    def paraphrase_simple(self, text: str) -> str:
        """Simple paraphrasing by restructuring."""
        patterns = [
            lambda t: f"I'm experiencing {t}",
            lambda t: f"Currently having {t}",
            lambda t: f"Dealing with {t}",
            lambda t: f"Suffering from {t}",
            lambda t: f"Having symptoms of {t}",
            lambda t: f"Presenting with {t}",
        ]
        return random.choice(patterns)(text)
    
    def augment_single(self, text: str, label: str, n_augmentations: int = 5) -> List[Tuple[str, str]]:
        """Generate multiple augmented versions of a single example."""
        augmented = [(text, label)]  # Include original
        
        techniques = [
            lambda t: self.synonym_replacement(t, n=1),
            lambda t: self.synonym_replacement(t, n=2),
            lambda t: self.add_duration(t),
            lambda t: self.add_severity(t),
            lambda t: self.add_timing(t),
            lambda t: self.paraphrase_simple(t),
            lambda t: self.add_duration(self.synonym_replacement(t, n=1)),
            lambda t: self.add_severity(self.synonym_replacement(t, n=1)),
            lambda t: self.add_timing(self.synonym_replacement(t, n=1)),
        ]
        
        for _ in range(n_augmentations):
            # Apply 1-2 random techniques
            num_techniques = random.randint(1, 2)
            augmented_text = text
            
            for _ in range(num_techniques):
                technique = random.choice(techniques)
                augmented_text = technique(augmented_text)
            
            # Ensure we don't duplicate
            if augmented_text != text and (augmented_text, label) not in augmented:
                augmented.append((augmented_text, label))
        
        return augmented
    
    def augment_dataset(self, df: pd.DataFrame, target_size: int = 1000) -> pd.DataFrame:
        """
        Augment entire dataset to target size.
        
        Args:
            df: DataFrame with 'text' and 'label' columns
            target_size: Desired number of total samples
        
        Returns:
            Augmented DataFrame
        """
        current_size = len(df)
        augmentations_needed = target_size - current_size
        
        if augmentations_needed <= 0:
            return df
        
        # Calculate augmentations per sample
        augmentations_per_sample = max(1, augmentations_needed // current_size)
        
        print(f"Original dataset size: {current_size}")
        print(f"Target size: {target_size}")
        print(f"Augmentations per sample: {augmentations_per_sample}")
        
        all_augmented = []
        
        for idx, row in df.iterrows():
            text, label = row['text'], row['label']
            augmented_samples = self.augment_single(text, label, augmentations_per_sample)
            all_augmented.extend(augmented_samples)
        
        # Create new DataFrame
        augmented_df = pd.DataFrame(all_augmented, columns=['text', 'label'])
        
        # Shuffle
        augmented_df = augmented_df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        print(f"Final augmented dataset size: {len(augmented_df)}")
        print(f"Samples per class:")
        print(augmented_df['label'].value_counts())
        
        return augmented_df


def main():
    """Main function to augment the dataset."""
    import os
    from pathlib import Path
    
    # Load original dataset
    data_path = Path(__file__).parent.parent.parent / 'data' / 'symptoms_train.csv'
    df = pd.read_csv(data_path)
    
    print(f"\n{'='*70}")
    print("Medical Symptom Dataset Augmentation")
    print(f"{'='*70}\n")
    
    # Augment
    augmenter = MedicalDataAugmenter()
    augmented_df = augmenter.augment_dataset(df, target_size=1200)
    
    # Save augmented dataset
    output_path = data_path.parent / 'symptoms_train_augmented.csv'
    augmented_df.to_csv(output_path, index=False)
    print(f"\n✓ Augmented dataset saved to: {output_path}")
    
    # Show some examples
    print(f"\n{'='*70}")
    print("Sample Augmented Examples")
    print(f"{'='*70}\n")
    for label in augmented_df['label'].unique()[:3]:
        print(f"\n{label}:")
        samples = augmented_df[augmented_df['label'] == label].head(3)
        for _, row in samples.iterrows():
            print(f"  - {row['text']}")


if __name__ == '__main__':
    main()
