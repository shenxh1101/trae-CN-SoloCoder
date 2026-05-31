import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from difflib import SequenceMatcher

class SimilarityCalculator:
    def __init__(self, use_transformer=False, model_name='paraphrase-multilingual-MiniLM-L12-v2'):
        self.use_transformer = use_transformer
        self.model_name = model_name
        self._model = None
        self._tfidf_vectorizer = None
    
    def _load_model(self):
        if self._model is None and self.use_transformer:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                print(f"Warning: Failed to load SentenceTransformer model: {e}")
                self.use_transformer = False
    
    def calculate_tfidf_similarity(self, texts_a, texts_b):
        all_texts = texts_a + texts_b
        vectorizer = TfidfVectorizer(token_pattern=r'(?u)\b\w+\b', lowercase=True)
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        a_matrix = tfidf_matrix[:len(texts_a)]
        b_matrix = tfidf_matrix[len(texts_a):]
        
        similarity_matrix = cosine_similarity(a_matrix, b_matrix)
        return similarity_matrix
    
    def calculate_transformer_similarity(self, texts_a, texts_b):
        self._load_model()
        if self._model is None:
            return self.calculate_tfidf_similarity(texts_a, texts_b)
        
        embeddings_a = self._model.encode(texts_a, convert_to_tensor=True)
        embeddings_b = self._model.encode(texts_b, convert_to_tensor=True)
        
        similarity_matrix = cosine_similarity(
            embeddings_a.cpu().numpy(), 
            embeddings_b.cpu().numpy()
        )
        return similarity_matrix
    
    def calculate_similarity_matrix(self, texts_a, texts_b):
        if self.use_transformer:
            return self.calculate_transformer_similarity(texts_a, texts_b)
        else:
            return self.calculate_tfidf_similarity(texts_a, texts_b)
    
    def calculate_sequence_similarity(self, text_a, text_b):
        return SequenceMatcher(None, text_a, text_b).ratio()
    
    def find_best_matches(self, texts_a, texts_b, threshold=0.7):
        if not texts_a or not texts_b:
            return []
        
        similarity_matrix = self.calculate_similarity_matrix(texts_a, texts_b)
        matches = []
        
        used_a = set()
        used_b = set()
        
        for i in range(len(texts_a)):
            if i in used_a:
                continue
            best_j = -1
            best_sim = 0
            for j in range(len(texts_b)):
                if j in used_b:
                    continue
                if similarity_matrix[i][j] > best_sim:
                    best_sim = similarity_matrix[i][j]
                    best_j = j
            
            if best_j != -1 and best_sim >= threshold:
                matches.append({
                    'a_index': i,
                    'b_index': best_j,
                    'similarity': float(best_sim),
                    'method': 'transformer' if self.use_transformer else 'tfidf'
                })
                used_a.add(i)
                used_b.add(best_j)
            else:
                matches.append({
                    'a_index': i,
                    'b_index': -1,
                    'similarity': 0.0,
                    'method': 'deleted'
                })
        
        for j in range(len(texts_b)):
            if j not in used_b:
                matches.append({
                    'a_index': -1,
                    'b_index': j,
                    'similarity': 0.0,
                    'method': 'added'
                })
        
        return matches
    
    def calculate_overall_similarity(self, text_a, text_b, text_processor=None):
        if text_processor is None:
            from app.text_processor import TextProcessor
            text_processor = TextProcessor()
        processed_a = text_processor.preprocess_for_similarity(text_a)
        processed_b = text_processor.preprocess_for_similarity(text_b)
        
        tfidf_sim = self.calculate_tfidf_similarity([processed_a], [processed_b])[0][0]
        seq_sim = self.calculate_sequence_similarity(text_a, text_b)
        
        overall = (tfidf_sim * 0.6 + seq_sim * 0.4)
        return float(overall)
