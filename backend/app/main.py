from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import uuid

from app.models import (
    CreateArticleRequest, UpdateArticleRequest, AddCommentRequest,
    AddCitationRequest, CreateDialogRequest, CreateMessageRequest,
    SearchRequest, RAGQueryRequest, ExportWordRequest,
    Article, Dialog, Message, ProcessingJob
)
from app.storage import storage
from app.services import (
    s3_service, pdf_service, stt_service, rag_service, word_export_service
)

app = FastAPI(title="Scientific Research Management API")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/articles", response_model=Article)
async def create_article(request: CreateArticleRequest):
    """Create a new article"""
    article = storage.create_article(
        title=request.title,
        url=request.url
    )
    return article


@app.post("/api/articles/upload-pdf")
async def upload_article_pdf(
    title: str = Form(...),
    pdf: UploadFile = File(...)
):
    """Create article with PDF upload"""
    try:
        pdf_data = await pdf.read()
        
        pdf_key = f"pdfs/{uuid.uuid4()}.pdf"
        s3_key = s3_service.upload_file(pdf_data, pdf_key, content_type="application/pdf")
        
        if not s3_key:
            raise HTTPException(status_code=500, detail="Failed to upload PDF")
        
        article = storage.create_article(
            title=title,
            pdf_s3_key=s3_key
        )
        
        await pdf_service.process_pdf(article.id, s3_key)
        
        return article
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/articles", response_model=List[Article])
async def list_articles():
    """List all articles"""
    return storage.list_articles()


@app.get("/api/articles/{article_id}", response_model=Article)
async def get_article(article_id: str):
    """Get article by ID"""
    article = storage.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@app.put("/api/articles/{article_id}", response_model=Article)
async def update_article(article_id: str, request: UpdateArticleRequest):
    """Update article"""
    article = storage.update_article(
        article_id,
        title=request.title,
        status=request.status
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@app.delete("/api/articles/{article_id}")
async def delete_article(article_id: str):
    """Delete article"""
    success = storage.delete_article(article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"status": "deleted"}


@app.post("/api/articles/{article_id}/comments")
async def add_comment(article_id: str, request: AddCommentRequest):
    """Add text comment to article"""
    comment = storage.add_comment(article_id, text=request.text)
    if not comment:
        raise HTTPException(status_code=404, detail="Article not found")
    return comment


@app.post("/api/articles/{article_id}/comments/audio")
async def add_audio_comment(
    article_id: str,
    audio: UploadFile = File(...)
):
    """Add audio comment to article"""
    try:
        audio_data = await audio.read()
        
        audio_key = f"audio/comments/{uuid.uuid4()}.{audio.filename.split('.')[-1]}"
        s3_key = s3_service.upload_file(audio_data, audio_key, content_type=audio.content_type)
        
        if not s3_key:
            raise HTTPException(status_code=500, detail="Failed to upload audio")
        
        transcription = await stt_service.transcribe_audio(audio_data)
        
        comment = storage.add_comment(
            article_id,
            audio_s3_key=s3_key,
            audio_transcription=transcription
        )
        
        if not comment:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return comment
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/articles/{article_id}/citations")
async def add_citation(article_id: str, request: AddCitationRequest):
    """Add citation relationship"""
    citation = storage.add_citation(article_id, request.target_article_id)
    if not citation:
        raise HTTPException(status_code=404, detail="Article not found")
    return citation


@app.get("/api/articles/search")
async def search_articles(q: str):
    """Search articles by title"""
    articles = storage.list_articles()
    results = [a for a in articles if q.lower() in a.title.lower()]
    return results


@app.post("/api/dialogs", response_model=Dialog)
async def create_dialog(request: CreateDialogRequest):
    """Create a new dialog"""
    dialog = storage.create_dialog(request.title)
    return dialog


@app.get("/api/dialogs", response_model=List[Dialog])
async def list_dialogs():
    """List all dialogs"""
    return storage.list_dialogs()


@app.get("/api/dialogs/{dialog_id}")
async def get_dialog(dialog_id: str):
    """Get dialog with messages"""
    dialog = storage.get_dialog(dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    messages = storage.list_messages(dialog_id)
    return {
        "dialog": dialog,
        "messages": messages
    }


@app.delete("/api/dialogs/{dialog_id}")
async def delete_dialog(dialog_id: str):
    """Delete dialog"""
    success = storage.delete_dialog(dialog_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return {"status": "deleted"}


@app.post("/api/dialogs/{dialog_id}/messages")
async def create_message(dialog_id: str, request: CreateMessageRequest):
    """Create text message in dialog"""
    message = storage.create_message(dialog_id, text=request.text)
    if not message:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return message


@app.post("/api/dialogs/{dialog_id}/messages/multimodal")
async def create_multimodal_message(
    dialog_id: str,
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None)
):
    """Create message with text, audio, and/or images"""
    try:
        audio_s3_key = None
        audio_transcription = None
        image_s3_keys = []
        
        if audio:
            audio_data = await audio.read()
            audio_key = f"audio/messages/{uuid.uuid4()}.{audio.filename.split('.')[-1]}"
            audio_s3_key = s3_service.upload_file(audio_data, audio_key, content_type=audio.content_type)
            
            audio_transcription = await stt_service.transcribe_audio(audio_data)
        
        if images:
            for image in images:
                image_data = await image.read()
                image_key = f"images/messages/{uuid.uuid4()}.{image.filename.split('.')[-1]}"
                s3_key = s3_service.upload_file(image_data, image_key, content_type=image.content_type)
                if s3_key:
                    image_s3_keys.append(s3_key)
        
        message = storage.create_message(
            dialog_id,
            text=text,
            audio_s3_key=audio_s3_key,
            audio_transcription=audio_transcription,
            image_s3_keys=image_s3_keys
        )
        
        if not message:
            raise HTTPException(status_code=404, detail="Dialog not found")
        
        return message
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/messages/{message_id}", response_model=Message)
async def get_message(message_id: str):
    """Get message by ID"""
    message = storage.get_message(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@app.delete("/api/messages/{message_id}")
async def delete_message(message_id: str):
    """Delete message"""
    success = storage.delete_message(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "deleted"}


@app.post("/api/upload/audio")
async def upload_audio(audio: UploadFile = File(...)):
    """Upload audio file"""
    try:
        audio_data = await audio.read()
        audio_key = f"audio/{uuid.uuid4()}.{audio.filename.split('.')[-1]}"
        s3_key = s3_service.upload_file(audio_data, audio_key, content_type=audio.content_type)
        
        if not s3_key:
            raise HTTPException(status_code=500, detail="Failed to upload audio")
        
        url = s3_service.get_file_url(s3_key)
        return {"s3_key": s3_key, "url": url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/image")
async def upload_image(image: UploadFile = File(...)):
    """Upload image file"""
    try:
        image_data = await image.read()
        image_key = f"images/{uuid.uuid4()}.{image.filename.split('.')[-1]}"
        s3_key = s3_service.upload_file(image_data, image_key, content_type=image.content_type)
        
        if not s3_key:
            raise HTTPException(status_code=500, detail="Failed to upload image")
        
        url = s3_service.get_file_url(s3_key)
        return {"s3_key": s3_key, "url": url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/{file_key:path}")
async def get_file_url(file_key: str):
    """Get presigned URL for file"""
    url = s3_service.get_file_url(file_key)
    if not url:
        raise HTTPException(status_code=404, detail="File not found")
    return {"url": url}


@app.post("/api/process/pdf/{article_id}")
async def process_pdf(article_id: str):
    """Process PDF for article"""
    article = storage.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if not article.pdf_s3_key:
        raise HTTPException(status_code=400, detail="Article has no PDF")
    
    result = await pdf_service.process_pdf(article_id, article.pdf_s3_key)
    return result


@app.post("/api/process/audio/{message_id}")
async def process_audio(message_id: str):
    """Transcribe audio for message"""
    message = storage.get_message(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if not message.audio_s3_key:
        raise HTTPException(status_code=400, detail="Message has no audio")
    
    result = await stt_service.process_audio(message_id, message.audio_s3_key)
    return result


@app.get("/api/process/status/{job_id}", response_model=ProcessingJob)
async def get_processing_status(job_id: str):
    """Get processing job status"""
    job = storage.get_processing_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/search")
async def search(q: str, limit: int = 10):
    """Search across all content"""
    results = {
        "articles": [],
        "messages": []
    }
    
    articles = storage.list_articles()
    for article in articles:
        if q.lower() in article.title.lower() or (article.pdf_text and q.lower() in article.pdf_text.lower()):
            results["articles"].append(article)
    
    for message in storage.messages.values():
        if (message.text and q.lower() in message.text.lower()) or \
           (message.audio_transcription and q.lower() in message.audio_transcription.lower()):
            results["messages"].append(message)
    
    return results


@app.post("/api/rag/query")
async def rag_query(request: RAGQueryRequest):
    """Query using RAG"""
    result = await rag_service.query(request.query, limit=10)
    return result


@app.post("/api/export/word")
async def export_word(request: ExportWordRequest):
    """Generate Word document"""
    result = await word_export_service.generate_document(
        title=request.title,
        dialog_id=request.dialog_id,
        article_ids=request.article_ids
    )
    return result


@app.get("/api/export/{job_id}")
async def get_export(job_id: str):
    """Get export job status and download URL"""
    job = storage.get_processing_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
