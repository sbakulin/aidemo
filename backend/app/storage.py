from typing import Dict, List, Optional
from datetime import datetime
import uuid
from app.models import (
    Article, Dialog, Message, Comment, Citation, 
    ProcessingJob, ArticleStatus, ProcessingJobType, ProcessingJobStatus
)


class InMemoryStorage:
    def __init__(self):
        self.articles: Dict[str, Article] = {}
        self.dialogs: Dict[str, Dialog] = {}
        self.messages: Dict[str, Message] = {}
        self.comments: Dict[str, Comment] = {}
        self.citations: Dict[str, Citation] = {}
        self.processing_jobs: Dict[str, ProcessingJob] = {}
        self.embeddings: Dict[str, List[float]] = {}  # key -> embedding vector
        
    def generate_id(self) -> str:
        return str(uuid.uuid4())
    
    def create_article(self, title: str, url: Optional[str] = None, 
                      pdf_s3_key: Optional[str] = None) -> Article:
        article_id = self.generate_id()
        now = datetime.utcnow()
        article = Article(
            id=article_id,
            title=title,
            url=url,
            pdf_s3_key=pdf_s3_key,
            status=ArticleStatus.TO_READ,
            comments=[],
            citations=[],
            created_at=now,
            updated_at=now
        )
        self.articles[article_id] = article
        return article
    
    def get_article(self, article_id: str) -> Optional[Article]:
        return self.articles.get(article_id)
    
    def list_articles(self) -> List[Article]:
        return list(self.articles.values())
    
    def update_article(self, article_id: str, **kwargs) -> Optional[Article]:
        article = self.articles.get(article_id)
        if not article:
            return None
        
        for key, value in kwargs.items():
            if hasattr(article, key) and value is not None:
                setattr(article, key, value)
        
        article.updated_at = datetime.utcnow()
        return article
    
    def delete_article(self, article_id: str) -> bool:
        if article_id in self.articles:
            del self.articles[article_id]
            self.comments = {k: v for k, v in self.comments.items() if v.article_id != article_id}
            self.citations = {k: v for k, v in self.citations.items() 
                            if v.source_article_id != article_id and v.target_article_id != article_id}
            return True
        return False
    
    def add_comment(self, article_id: str, text: Optional[str] = None,
                   audio_s3_key: Optional[str] = None,
                   audio_transcription: Optional[str] = None) -> Optional[Comment]:
        if article_id not in self.articles:
            return None
        
        comment_id = self.generate_id()
        comment = Comment(
            id=comment_id,
            article_id=article_id,
            text=text,
            audio_s3_key=audio_s3_key,
            audio_transcription=audio_transcription,
            created_at=datetime.utcnow()
        )
        self.comments[comment_id] = comment
        self.articles[article_id].comments.append(comment)
        return comment
    
    def add_citation(self, source_article_id: str, target_article_id: str) -> Optional[Citation]:
        if source_article_id not in self.articles or target_article_id not in self.articles:
            return None
        
        citation_id = self.generate_id()
        citation = Citation(
            id=citation_id,
            source_article_id=source_article_id,
            target_article_id=target_article_id,
            created_at=datetime.utcnow()
        )
        self.citations[citation_id] = citation
        self.articles[source_article_id].citations.append(citation)
        return citation
    
    def create_dialog(self, title: str) -> Dialog:
        dialog_id = self.generate_id()
        now = datetime.utcnow()
        dialog = Dialog(
            id=dialog_id,
            title=title,
            created_at=now,
            updated_at=now
        )
        self.dialogs[dialog_id] = dialog
        return dialog
    
    def get_dialog(self, dialog_id: str) -> Optional[Dialog]:
        return self.dialogs.get(dialog_id)
    
    def list_dialogs(self) -> List[Dialog]:
        return list(self.dialogs.values())
    
    def delete_dialog(self, dialog_id: str) -> bool:
        if dialog_id in self.dialogs:
            del self.dialogs[dialog_id]
            self.messages = {k: v for k, v in self.messages.items() if v.dialog_id != dialog_id}
            return True
        return False
    
    def create_message(self, dialog_id: str, text: Optional[str] = None,
                      image_s3_keys: Optional[List[str]] = None,
                      audio_s3_key: Optional[str] = None,
                      audio_transcription: Optional[str] = None) -> Optional[Message]:
        if dialog_id not in self.dialogs:
            return None
        
        message_id = self.generate_id()
        message = Message(
            id=message_id,
            dialog_id=dialog_id,
            text=text,
            image_s3_keys=image_s3_keys or [],
            audio_s3_key=audio_s3_key,
            audio_transcription=audio_transcription,
            created_at=datetime.utcnow()
        )
        self.messages[message_id] = message
        self.dialogs[dialog_id].updated_at = datetime.utcnow()
        return message
    
    def get_message(self, message_id: str) -> Optional[Message]:
        return self.messages.get(message_id)
    
    def list_messages(self, dialog_id: str) -> List[Message]:
        return [msg for msg in self.messages.values() if msg.dialog_id == dialog_id]
    
    def update_message(self, message_id: str, **kwargs) -> Optional[Message]:
        message = self.messages.get(message_id)
        if not message:
            return None
        
        for key, value in kwargs.items():
            if hasattr(message, key) and value is not None:
                setattr(message, key, value)
        
        return message
    
    def delete_message(self, message_id: str) -> bool:
        if message_id in self.messages:
            del self.messages[message_id]
            return True
        return False
    
    def create_processing_job(self, job_type: ProcessingJobType) -> ProcessingJob:
        job_id = self.generate_id()
        job = ProcessingJob(
            id=job_id,
            type=job_type,
            status=ProcessingJobStatus.PENDING,
            created_at=datetime.utcnow()
        )
        self.processing_jobs[job_id] = job
        return job
    
    def get_processing_job(self, job_id: str) -> Optional[ProcessingJob]:
        return self.processing_jobs.get(job_id)
    
    def update_processing_job(self, job_id: str, status: ProcessingJobStatus,
                             result: Optional[dict] = None,
                             error: Optional[str] = None) -> Optional[ProcessingJob]:
        job = self.processing_jobs.get(job_id)
        if not job:
            return None
        
        job.status = status
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error
        
        return job
    
    def store_embedding(self, key: str, embedding: List[float]):
        self.embeddings[key] = embedding
    
    def get_embedding(self, key: str) -> Optional[List[float]]:
        return self.embeddings.get(key)
    
    def search_similar(self, query_embedding: List[float], limit: int = 10) -> List[tuple]:
        """Return list of (key, similarity_score) tuples"""
        import numpy as np
        
        if not self.embeddings:
            return []
        
        query_vec = np.array(query_embedding)
        results = []
        
        for key, embedding in self.embeddings.items():
            emb_vec = np.array(embedding)
            similarity = np.dot(query_vec, emb_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(emb_vec))
            results.append((key, float(similarity)))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]


storage = InMemoryStorage()
