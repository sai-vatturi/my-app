# Release Management Portal

A full-stack Release Management Portal with FastAPI backend and Angular frontend for managing releases, squads, products, and runbooks.

## 🚀 Features

### Core Functionality
- **Release Management**: Create and manage releases with manual fixed versions
- **Squad Management**: Organize development teams and their responsibilities  
- **Product Management**: Manage products with JIRA board integration
- **Runbook Management**: Create and maintain deployment runbooks
- **File Management**: Upload and manage release-related files

### Key Improvements
- **Manual Fixed Versions**: Replace auto-population from product.jira_boards with user-controlled FormArray inputs
- **Responsive UI**: Modern Angular frontend with TailwindCSS styling
- **Form Validation**: Comprehensive form validation with reactive forms
- **Dynamic Product Scopes**: Add/remove product scopes with POCs and fixed versions

## 🏗️ Architecture

### Full-Stack Structure
```
svc-rm-portal-cursor/
├── app/                          # FastAPI Backend
│   ├── api/v1/endpoints/        # API routes
│   ├── core/                    # Configuration
│   ├── models/                  # Database models
│   ├── schemas/                 # Pydantic schemas
│   └── services/                # Business logic
├── frontend/rm-portal/          # Angular Frontend
│   └── src/app/
│       ├── components/ui/       # Reusable UI components
│       ├── features/            # Feature modules
│       ├── lib/                 # Models and services
│       └── core/                # Core functionality
└── tests/                       # Test files
```

### Technology Stack
- **Backend**: Python 3.11, FastAPI, MongoDB, Motor (async driver)
- **Frontend**: Angular 18+, TypeScript, TailwindCSS, Reactive Forms
- **Development**: Hot reload, watch mode, comprehensive error handling

## 🛠️ Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- MongoDB (running on localhost:27017)

### Backend Setup

1. **Create virtual environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start backend server**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd frontend/rm-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

## 🎯 Manual Fixed Versions Feature

### Implementation Details
- **FormArray Pattern**: Dynamic form controls for managing fixed versions
- **Product Scope Management**: Each product scope can have multiple fixed versions
- **User Control**: Complete manual control over fixed version entries
- **Validation**: Form validation ensures data integrity

### Key Components
- `CreateReleaseComponent`: Create releases with manual fixed versions
- `EditReleaseComponent`: Edit existing releases 
- `EditProductScopeDialogComponent`: Modal for inline product scope editing

### Code Example
```typescript
// Get fixed versions FormArray for a product scope
getFixedVersions(productScopeIndex: number): FormArray {
  const scope = this.productScopes.at(productScopeIndex);
  return scope?.get('fixed_versions') as FormArray || this.fb.array([]);
}

// Add a new fixed version
addFixedVersion(productScopeIndex: number): void {
  const fixedVersionsArray = this.getFixedVersions(productScopeIndex);
  fixedVersionsArray.push(this.fb.group({
    jira_board_id: ['', Validators.required],
    fixed_version: ['', Validators.required]
  }));
}
```

## 🧪 API Documentation

### Endpoints
- **Backend API**: http://localhost:8000/docs (Swagger UI)
- **Frontend App**: http://localhost:4200

### Release Management API
```bash
# Create release with manual fixed versions
POST /api/v1/releases/
{
  "name": "Release 2024.1",
  "product_scopes": [{
    "product_id": "product_id",
    "pocs": ["user1", "user2"],
    "fixed_versions": [
      {"jira_board_id": "BOARD-1", "fixed_version": "1.0.0"}
    ]
  }]
}
```

## 🔧 Configuration

### Backend Configuration
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=release_management
```

### Frontend Configuration
- **API Base URL**: http://localhost:8000/api/v1
- **Development Port**: 4200
- **Build Output**: dist/rm-portal

## 🚀 Recent Improvements

### Completed Features ✅
- Manual fixed versions management (replacing auto-population)
- Complete Angular frontend with routing and navigation
- Form validation and error handling
- Platform and country fields removal (no longer required)
- Backend validation error fixes
- Comprehensive UI components (cards, buttons, forms)

### Navigation Structure
- **Releases**: List, Create, View, Edit releases
- **Products**: Product management interface
- **Squads**: Squad management interface

## 📊 Database Status

Current database contains:
- **1 Product**: "MY-SME" with platform=None, country=None, fixed_versions=[]
- Clean schema without unnecessary platform/country fields
- Proper validation for all required fields

## 🔄 Development Workflow

1. **Backend**: Auto-reload with uvicorn
2. **Frontend**: Watch mode with Angular CLI
3. **Git**: Regular commits with descriptive messages
4. **Testing**: Both unit tests and integration tests

## 🤝 Contributing

1. Clone the repository
2. Set up both backend and frontend environments
3. Make changes with proper testing
4. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License.