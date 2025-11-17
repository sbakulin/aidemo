from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


class ArticleStatus(str, Enum):
    TO_READ = "to_read"
    READ = "read"


class ProcessingJobType(str, Enum):
    PDF = "pdf"
    AUDIO = "audio"
    EXPORT = "export"


class ProcessingJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Comment(BaseModel):
    id: str
    article_id: str
    text: Optional[str] = None
    audio_s3_key: Optional[str] = None
    audio_transcription: Optional[str] = None
    created_at: datetime


class Citation(BaseModel):
    id: str
    source_article_id: str
    target_article_id: str
    created_at: datetime


class Article(BaseModel):
    id: str
    title: str
    url: Optional[str] = None
    pdf_s3_key: Optional[str] = None
    pdf_text: Optional[str] = None
    status: ArticleStatus = ArticleStatus.TO_READ
    comments: List[Comment] = []
    citations: List[Citation] = []
    created_at: datetime
    updated_at: datetime


class Dialog(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class Message(BaseModel):
    id: str
    dialog_id: str
    text: Optional[str] = None
    image_s3_keys: List[str] = []
    audio_s3_key: Optional[str] = None
    audio_transcription: Optional[str] = None
    created_at: datetime


class ProcessingJob(BaseModel):
    id: str
    type: ProcessingJobType
    status: ProcessingJobStatus
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime


class CreateArticleRequest(BaseModel):
    title: str
    url: Optional[str] = None


class UpdateArticleRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[ArticleStatus] = None


class AddCommentRequest(BaseModel):
    text: Optional[str] = None


class AddCitationRequest(BaseModel):
    target_article_id: str


class CreateDialogRequest(BaseModel):
    title: str


class CreateMessageRequest(BaseModel):
    text: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    limit: int = 10


class RAGQueryRequest(BaseModel):
    query: str
    dialog_id: Optional[str] = None


class ExportWordRequest(BaseModel):
    dialog_id: Optional[str] = None
    article_ids: Optional[List[str]] = None
    title: str = "Research Summary"
