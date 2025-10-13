# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**智能合同模板系统** - An AI-driven intelligent contract generation platform that combines Next.js frontend with Python FastAPI backend for processing Word document templates with AI-powered variable extraction.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Python FastAPI 0.115.0, SQLAlchemy, python-docx, docxtpl
- **Database**: PostgreSQL 15 (Prisma ORM for frontend, SQLAlchemy for backend)
- **Storage**: MinIO (S3-compatible), Vercel Blob
- **Cache**: Redis
- **AI Services**: Google Gemini, Zhipu AI
- **Deployment**: Vercel (frontend), Leaflow/Railway/Render (backend)

### Current Status
- ✅ Phase 1-3: Python backend core complete (document parsing, AI variable extraction, document generation)
- ⏳ Phase 4: Frontend refactoring needed
- ⏳ Phase 5-6: Deployment and advanced features

## Development Commands

### Frontend (Next.js)

```powershell
# Install dependencies
npm install

# Development server
npm run dev

# Type checking (run before commits)
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start

# Security checks
npm run security-check           # Quick security scan
npm run security-check:full      # Full security scan
npm run pre-commit              # Pre-commit security check

# Database management (Prisma)
npm run db:generate             # Generate Prisma client
npm run db:push                 # Push schema to database
npm run db:migrate              # Create and run migrations
npm run db:studio               # Open Prisma Studio
npm run db:seed                 # Seed database with test data
npm run db:setup                # Complete database setup

# Testing
npm run test-ocr                # Test OCR functionality
npm run test-parser             # Test document parser
npm run validate-setup          # Validate project setup
npm run validate-env            # Validate environment variables
```

### Backend (Python FastAPI)

```powershell
# Setup virtual environment (Windows)
cd backend
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
python main.py
# Or with uvicorn directly (recommended for development)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# API documentation (when running)
# http://localhost:8000/docs      # Swagger UI
# http://localhost:8000/redoc     # ReDoc

# Testing
python test_api.py              # Integration tests
python test_generate.py         # Test document generation
python test_variables.py        # Test variable extraction
pytest tests/                   # Run all unit tests
pytest --cov=. --cov-report=html  # Coverage report
```

### Docker & Deployment

```powershell
# Backend Docker
cd backend
docker build -t contract-backend:latest .
docker run -d -p 8000:8000 --env-file .env --name contract-backend contract-backend:latest

# Full stack with docker-compose
docker-compose up -d            # Start all services (PostgreSQL, Redis, MinIO, backend)
docker-compose down             # Stop all services

# View logs
docker logs -f contract-backend
```

## Project Architecture

### Directory Structure

```
E:\trae\0823合同3\
├── backend/                    # Python FastAPI backend
│   ├── main.py                # Application entry point
│   ├── config.py              # Configuration management
│   ├── requirements.txt       # Python dependencies
│   ├── models/                # SQLAlchemy database models
│   │   ├── database.py        # Database connection
│   │   ├── user.py            # User model
│   │   ├── template.py        # Template model
│   │   ├── generated_document.py
│   │   └── variable_cache.py
│   ├── services/              # Business logic services
│   │   ├── document_parser.py # Word document parsing
│   │   ├── variable_extractor.py # AI variable extraction
│   │   ├── document_generator.py # Document generation with Jinja2
│   │   ├── cache_service.py   # Redis caching
│   │   └── storage_service.py # MinIO file storage
│   ├── routers/               # API route handlers
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── documents.py       # Document processing endpoints
│   │   ├── variables.py       # Variable extraction endpoints
│   │   ├── generate.py        # Document generation endpoints
│   │   └── templates.py       # Template management endpoints
│   ├── middleware/            # Custom middleware
│   │   ├── logging_middleware.py
│   │   └── error_handler.py
│   └── tests/                 # Test files
│
├── src/                       # Next.js frontend source
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── dashboard/         # Dashboard page
│   │   ├── workspace/         # Workspace page
│   │   └── ...                # Other pages
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── document/          # Document-related components
│   │   ├── form/              # Form components
│   │   ├── ocr/               # OCR-related components
│   │   ├── ui/                # UI components
│   │   └── workflow/          # Workflow components
│   ├── lib/                   # Core libraries and utilities
│   │   ├── ai/                # AI integration (Gemini, Zhipu)
│   │   ├── services/          # Service layer
│   │   ├── auth-middleware.ts # Authentication middleware
│   │   ├── crypto.ts          # Cryptography utilities
│   │   ├── document-parser.ts # Document parsing
│   │   ├── feishu.ts          # Feishu API integration
│   │   ├── prisma.ts          # Prisma client
│   │   └── ...                # Other utilities
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand state management
│   └── types/                 # TypeScript type definitions
│
├── prisma/                    # Prisma schema and migrations
│   └── schema.prisma          # Database schema
│
├── scripts/                   # Build and utility scripts
│   ├── security-check.js      # Security validation
│   ├── validate-env.js        # Environment validation
│   ├── setup-database.js      # Database setup
│   └── ...                    # Other scripts
│
└── docs/                      # Documentation files
```

### Key Architectural Patterns

#### Backend Architecture (FastAPI)

**Three-Layer Service Pattern**:
1. **Router Layer** (`routers/`): HTTP request handling, validation, response formatting
2. **Service Layer** (`services/`): Business logic, data processing, external API calls
3. **Model Layer** (`models/`): Database models and data access

**Key Services**:
- `DocumentParser`: Extracts text, structure, and metadata from .docx files using python-docx
- `VariableExtractor`: AI-powered extraction of contract variables with type inference (7 types: text, date, number, boolean, enum, array, object)
- `DocumentGenerator`: Generates documents from templates using Jinja2 syntax (docxtpl)
- `CacheService`: Redis/memory caching for variable extraction results (30x performance improvement)
- `StorageService`: MinIO integration for file storage

**Middleware Stack**:
- CORS middleware for cross-origin requests
- Logging middleware for request/response logging
- Custom error handlers for consistent error responses

#### Frontend Architecture (Next.js)

**App Router Structure**:
- Uses Next.js 14 App Router with TypeScript strict mode
- Server-side rendering for initial page loads
- Client-side navigation for subsequent interactions

**State Management**:
- Zustand for global state (authentication, user preferences)
- React Hook Form + Zod for form state and validation
- React hooks for local component state

**Key Integrations**:
- Feishu OAuth 2.0 for authentication
- Feishu Cloud Document API for document operations
- OCR services (Tesseract.js, Baidu OCR, Google Gemini)
- Backend API communication via custom API client

#### Data Flow

1. **Document Upload**: Frontend → Vercel Blob → Backend MinIO → Database metadata
2. **Variable Extraction**: Backend receives .docx → Parser extracts structure → AI (Gemini) infers variables → Cache stores results
3. **Document Generation**: User fills form → Backend receives data → Jinja2 template engine → Generated .docx → MinIO storage
4. **Authentication**: User → Feishu OAuth → JWT token → Encrypted storage (AES-256)

### Database Schema (Prisma/PostgreSQL)

Key models:
- `User`: User authentication and profile data
- `Document`: Feishu document references and metadata
- `Operation`: Audit log of all operations (parse, OCR, replace, generate)
- `UploadedFile`: File upload tracking and OCR results
- `ReplacementRule`: Text replacement rules with regex support
- `Template`: Contract templates (backend SQLAlchemy model)
- `GeneratedDocument`: Generated document records with metadata

## Configuration & Environment

### Required Environment Variables

**Frontend (.env.local)**:
```bash
# Feishu OAuth
NEXT_PUBLIC_FEISHU_APP_ID=
FEISHU_APP_SECRET=
NEXT_PUBLIC_FEISHU_REDIRECT_URI=

# Database (Vercel Postgres)
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=

# Encryption
ENCRYPTION_KEY=

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

**Backend (.env)**:
```bash
# Application
APP_ENV=development
DEBUG=True

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/contract_db

# MinIO Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=contract-storage

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# AI Services
GEMINI_API_KEY=

# JWT Authentication
JWT_SECRET=

# CORS
CORS_ORIGINS=http://localhost:3000
```

### External Services Setup

**MinIO** (Object Storage):
```powershell
# Start with Docker
docker run -d -p 9000:9000 -p 9001:9001 `
  -e MINIO_ROOT_USER=minioadmin `
  -e MINIO_ROOT_PASSWORD=minioadmin `
  minio/minio server /data --console-address ":9001"

# Access console: http://localhost:9001
# Create bucket: contract-storage
```

**PostgreSQL**:
```powershell
# Start with Docker
docker run -d -p 5432:5432 `
  -e POSTGRES_USER=admin `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=contract_db `
  postgres:15
```

**Redis**:
```powershell
# Start with Docker
docker run -d -p 6379:6379 redis:7
```

## Code Style & Standards

### TypeScript/JavaScript (Frontend)
- **Strict TypeScript mode** enabled in tsconfig.json
- Use **ESLint** and **Prettier** for code formatting
- Run `npm run type-check` before commits
- Use **React Hook Form + Zod** for form validation
- Prefer **async/await** over promises
- Use **proper error boundaries** for error handling
- All API calls must include proper error handling

### Python (Backend)
- Follow **PEP 8** style guide
- Use **type hints** for all function signatures
- Document all classes and functions with **docstrings**
- Use **async/await** for I/O operations
- Proper exception handling with custom exception classes
- Use **pydantic** for data validation

### Git Commit Convention
```bash
# Format: <type>: <description>
# Types: feat, fix, chore, docs, refactor, test, style

feat: Add AI variable extraction service
fix: Resolve document parsing error for tables
chore: Update dependencies
docs: Add API documentation for generation endpoint
refactor: Simplify cache service implementation
test: Add unit tests for variable extractor

# Include co-author when applicable
Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>
```

## Security Best Practices

### Critical Security Rules
1. **Never commit secrets**: Use environment variables for all sensitive data
2. **Run security check**: `npm run security-check` before every commit
3. **Encrypt sensitive data**: Use AES-256 for tokens stored in database
4. **Validate file uploads**: Check file type, size, and content
5. **Sanitize user input**: Validate and escape all user-provided data
6. **CORS configuration**: Only allow trusted origins
7. **Rate limiting**: Implement on all public API endpoints

### Pre-commit Checks
```powershell
# Automatic checks before commit
npm run pre-commit              # Runs security check
npm run type-check              # TypeScript validation
npm run lint                    # Linting
```

## Common Development Tasks

### Adding a New API Endpoint

**Backend (Python)**:
```python
# 1. Create router in backend/routers/example.py
from fastapi import APIRouter, Depends
from services.example_service import ExampleService

router = APIRouter(prefix="/api/v1/example", tags=["example"])

@router.post("/")
async def create_example(data: ExampleRequest):
    service = ExampleService()
    result = await service.process(data)
    return {"success": True, "data": result}

# 2. Register router in backend/main.py
from routers import example
app.include_router(example.router)
```

**Frontend (TypeScript)**:
```typescript
// 1. Add API function in src/lib/api-client.ts
export async function createExample(data: ExampleData) {
  const response = await fetch(`${BACKEND_URL}/api/v1/example`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// 2. Use in component
const handleSubmit = async (data: ExampleData) => {
  const result = await createExample(data);
  // Handle result
};
```

### Working with Word Documents

**Parsing**:
```python
from services.document_parser import DocumentParser

parser = DocumentParser()
result = await parser.parse_document(file_bytes, filename="contract.docx")
# Returns: text, structure, metadata, placeholders
```

**Generation**:
```python
from services.document_generator import DocumentGenerator

generator = DocumentGenerator()
output = await generator.generate_document(
    template_path="template.docx",
    variables={"company": "ACME Corp", "date": "2025-01-15"}
)
# Returns: BytesIO object with generated .docx
```

### AI Variable Extraction

```python
from services.variable_extractor import VariableExtractor

extractor = VariableExtractor()
variables = await extractor.extract_variables(
    text="合同文本...",
    use_cache=True  # Cache results in Redis
)
# Returns: List of variables with name, type, description, default value
```

## Testing

### Frontend Tests
```powershell
# OCR testing
npm run test-ocr

# Document parser testing
npm run test-parser

# Environment validation
npm run validate-env
```

### Backend Tests
```powershell
cd backend

# All tests
pytest tests/

# Specific test file
pytest tests/test_document_parser.py -v

# Integration tests
python test_api.py
python test_generate.py
python test_variables.py

# Coverage report
pytest --cov=. --cov-report=html
# View: htmlcov/index.html
```

## Deployment

### Vercel (Frontend)
```powershell
# Build and deploy
npm run build
vercel --prod

# Environment variables must be set in Vercel dashboard
```

### Leaflow (Backend)
```powershell
# 1. Build Docker image
cd backend
docker build -t your-registry/contract-backend:v1.0.0 .

# 2. Push to registry
docker push your-registry/contract-backend:v1.0.0

# 3. Deploy using leaflow.yaml
# Upload backend/leaflow.yaml to Leaflow console
# Update image URL in the manifest
# Deploy through Leaflow UI or CLI
```

### Health Checks
```powershell
# Frontend
curl http://localhost:3000

# Backend
curl http://localhost:8000/health
```

## Troubleshooting

### Common Issues

**Database connection failed**:
```powershell
# Check if PostgreSQL is running
docker ps | Select-String postgres

# Test connection
psql -h localhost -U admin -d contract_db
```

**MinIO connection failed**:
```powershell
# Check if MinIO is running
docker ps | Select-String minio

# Access console
# http://localhost:9001
```

**Module not found (Python)**:
```powershell
# Ensure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

**TypeScript errors**:
```powershell
# Regenerate Prisma client
npm run db:generate

# Check types
npm run type-check
```

## Important Notes

### Document Processing
- Only **.docx format** is supported (not .doc)
- **Jinja2 syntax** is used for templates: `{{ variable_name }}`
- Templates should include placeholder comments for structure preservation
- Maximum upload size: 10 MB (configurable)

### AI Services
- **Gemini API** requires valid API key from https://ai.google.dev/
- Variable extraction is cached in Redis for 24 hours
- Supports 7 variable types: text, date, number, boolean, enum, array, object

### Database
- Frontend uses **Prisma ORM** for PostgreSQL
- Backend uses **SQLAlchemy** for PostgreSQL
- Run migrations after schema changes
- Regular backups recommended for production

### Performance
- Variable extraction cache provides **30x performance improvement**
- Redis is optional (falls back to in-memory cache)
- Document parsing is synchronous but optimized

## Reference Documentation

**Key Files**:
- `README.md`: Project overview and features
- `QUICKSTART.md`: Quick start guide for development
- `PROJECT_STATUS.md`: Current project status and progress
- `backend/README.md`: Backend-specific documentation
- `CLAUDE.md`: AI assistant working protocols and project-specific rules

**API Documentation** (when backend is running):
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**External Documentation**:
- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com/
- Prisma: https://www.prisma.io/docs
- python-docx: https://python-docx.readthedocs.io/
- docxtpl: https://docxtpl.readthedocs.io/
