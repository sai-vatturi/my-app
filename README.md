# Release Management Portal - Backend

A comprehensive Release Management Portal built with FastAPI and MongoDB for managing releases, squads, products, and runbooks in the APAC region.

## 🚀 Features

### Core Functionality
- **Release Management**: Create and manage releases with timeline tracking
- **Squad Management**: Organize development teams and their responsibilities
- **Product Management**: Manage products across different platforms (DC, OH, IO)
- **Runbook Management**: Create and maintain deployment runbooks
- **File Management**: Upload and manage release-related files

### API Endpoints
- **Releases**: `/api/v1/releases/` - CRUD operations for releases
- **Squads**: `/api/v1/squads/` - CRUD operations for squads
- **Products**: `/api/v1/products/` - CRUD operations for products
- **Runbooks**: `/api/v1/runbooks/` - CRUD operations for runbooks
- **Files**: `/api/v1/files/` - File upload and management

## 🏗️ Architecture

### MVC Structure
```
app/
├── api/                    # API routes
│   └── v1/
│       ├── api.py         # Main API router
│       └── endpoints/     # Individual endpoint modules
├── core/                  # Core configuration
│   ├── config.py         # Application settings
│   ├── database.py       # Database connection
│   └── startup.py       # Startup events
├── models/               # Data models
├── schemas/              # Pydantic schemas
├── services/             # Business logic
└── main.py              # FastAPI application
```

### Database Models
- **Release**: Release information with dates, status, and participants
- **Squad**: Development teams with JIRA board integration
- **Product**: Products across platforms (DC, OH, IO) and countries
- **Runbook**: Deployment runbooks with step-by-step instructions
- **File**: File attachments for releases

## 🛠️ Setup

### Prerequisites
- Python 3.11+
- MongoDB (running on localhost:27017)
- Virtual environment

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd svc-rm-portal-cursor
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on localhost:27017
   mongod
   ```

5. **Run the application**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## 🧪 Testing

### Run Tests
```bash
python test_backend.py
```

### API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Health Check
```bash
curl http://localhost:8000/health
```

## 📊 Sample Data

The test script creates sample data:
- **Squad**: "Squad Alpha" - Frontend development squad
- **Product**: "HK-MMB" - Hong Kong MMB product on DC platform
- **Release**: "Release 2024.1" - January 2024 release

## 🔧 Configuration

### Environment Variables
Create a `.env` file with:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=release_management
JIRA_URL=your_jira_url
JIRA_USERNAME=your_username
JIRA_API_TOKEN=your_token
```

### Database Settings
- **MongoDB URL**: `mongodb://localhost:27017`
- **Database Name**: `release_management`
- **Collections**: `releases`, `squads`, `products`, `runbooks`, `files`

## 🚀 Next Steps

### Pending Features
- [ ] Frontend development (Angular.js)
- [ ] Authentication and authorization
- [ ] JIRA API integration
- [ ] Email notifications
- [ ] File upload functionality
- [ ] Dashboard with timeline tracking

### Development Roadmap
1. ✅ Backend API development
2. ✅ Database models and schemas
3. ✅ Basic CRUD operations
4. 🔄 Frontend development
5. 🔄 Authentication system
6. 🔄 JIRA integration
7. 🔄 Notification system

## 📝 API Examples

### Create a Release
```bash
curl -X POST "http://localhost:8000/api/v1/releases/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Release 2024.2",
    "description": "February 2024 release",
    "release_date": "2024-02-15T00:00:00Z",
    "status": "planned",
    "scope": "New features and improvements"
  }'
```

### Get All Squads
```bash
curl "http://localhost:8000/api/v1/squads/"
```

### Upload a File
```bash
curl -X POST "http://localhost:8000/api/v1/files/upload" \
  -F "file=@document.pdf" \
  -F "release_id=68eb65e35bcbe2d053db1346"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.