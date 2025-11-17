# Deployment Guide

This application consists of two parts that need to be deployed separately:

## Backend (FastAPI)

The backend is located in the `/backend` directory and needs to be deployed to a platform that supports Python applications.

### Recommended Platforms:
- **Fly.io** (recommended)
- Railway
- Render
- Heroku

### Deployment Steps:

1. Deploy the backend to your chosen platform
2. Set the following environment variables (optional):
   - `AWS_ACCESS_KEY_ID` - for S3 file storage
   - `AWS_SECRET_ACCESS_KEY` - for S3 file storage
   - `AWS_REGION` - AWS region (default: us-east-1)
   - `S3_BUCKET_NAME` - S3 bucket name
   - `OPENAI_API_KEY` - for Whisper STT and embeddings
   - `LITELLM_API_KEY` - for LiteLLM features

3. Note the deployed backend URL (e.g., `https://your-app.fly.dev`)

### Backend Features:
- Article management with PDF upload and processing
- Dialog and message management
- Multi-modal file uploads (audio, images)
- Speech-to-text transcription
- RAG-based semantic search
- Word document export

## Frontend (React)

The frontend is automatically deployed to Netlify on every push.

### Configuration:

1. Once the backend is deployed, update `netlify.toml` to add the API proxy:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR-BACKEND-URL/api/:splat"
  status = 200
  force = true
```

2. The frontend will use:
   - **Local development**: `http://localhost:8000` (from `.env` file)
   - **Production**: Relative URLs that are proxied by Netlify to your backend

### Local Development:

1. Start the backend:
```bash
cd backend
poetry run fastapi dev app/main.py
```

2. Start the frontend:
```bash
npm start
```

3. Access the application at `http://localhost:3000`

## Notes

- The application uses in-memory storage by default (data is lost on restart)
- S3 storage is optional - without it, files will use in-memory storage
- AI features (embeddings, STT, RAG) require API keys to function
- The backend must be publicly accessible for the Netlify frontend to work
