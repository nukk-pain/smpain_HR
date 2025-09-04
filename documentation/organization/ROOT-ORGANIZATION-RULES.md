# Root Folder Organization Rules
**Version**: 1.0  
**Created**: 2025년 08월 26일  
**Purpose**: Maintain consistent, clean, and logical root folder structure

## 🎯 Core Principles

1. **Minimal Root**: Only essential files in root
2. **Clear Naming**: Consistent, descriptive folder names
3. **Single Purpose**: Each folder has ONE clear purpose
4. **No Duplication**: Avoid similar/overlapping folders
5. **Easy Navigation**: Logical structure for quick access

## 📁 Standard Folder Structure

```
/mnt/d/my_programs/HR/
│
├── 📝 ESSENTIAL FILES (Root Level)
│   ├── README.md              # Project overview
│   ├── INDEX-PLAN.md          # Development tracking
│   ├── CLAUDE.md              # AI instructions (repo)
│   ├── CLAUDE.local.md        # AI instructions (local)
│   ├── package.json           # Project dependencies
│   ├── .gitignore            # Git exclusions
│   └── vercel.json           # Deployment config
│
├── 🔧 ACTIVE DEVELOPMENT
│   ├── backend/              # Backend source code
│   ├── frontend/             # Frontend source code
│   └── scripts/              # Utility scripts
│
├── 📚 DOCUMENTATION
│   ├── docs/                 # User & API documentation
│   │   ├── api/             # API documentation
│   │   ├── guides/          # User guides
│   │   └── deployment/      # Deployment guides
│   └── documentation/        # Development docs
│       ├── testing/         # Test plans & guides
│       └── architecture/    # System design docs
│
├── 📋 PLANNING & TRACKING
│   └── plans/                # All development plans
│       ├── active/          # Currently working on
│       ├── pending/         # Queued for later
│       └── archived/        # Completed plans
│
├── ✅ COMPLETED WORK
│   └── completed/            # All finished work
│       ├── 2025/           # Year-based organization
│       │   ├── 01-Jan/     # Month folders
│       │   ├── 02-Feb/
│       │   └── 08-Aug/
│       └── _archive/       # Old items for archival
│
├── 🗄️ BACKUPS & DATA
│   ├── backups/             # System backups only
│   │   └── 2025-08-26/     # Date-based folders
│   └── sample-data/         # Test & sample data
│       ├── payroll/        # Sample payroll files
│       └── documents/      # Sample documents
│
├── 🚀 DEPLOYMENT & CONFIG
│   ├── deploy/              # Deployment configs
│   └── config/              # App configuration
│
└── 🧪 TESTING
    └── tests/               # Test files & suites
        ├── unit/           # Unit tests
        ├── integration/    # Integration tests
        └── e2e/            # End-to-end tests
```

## 📏 Naming Conventions

### Folder Names
- **Use lowercase** with hyphens: `sample-data`, `api-docs`
- **Prefer plural** for collections: `plans/`, `tests/`, `docs/`
- **Use singular** for specific items: `backend/`, `frontend/`
- **NO special prefixes** like @, _, ~ in folder names

### File Names in Root
- **Configuration**: `*.json`, `*.yml`, `.*rc`
- **Documentation**: `README.md`, `INDEX-*.md`
- **Instructions**: `CLAUDE.md`, `CLAUDE.local.md`
- **NEVER in root**: Test files, temporary files, personal notes

## 🗂️ Content Organization Rules

### What Goes Where

| Content Type | Location | Example |
|-------------|----------|---------|
| **Active code** | `/backend/`, `/frontend/` | Source files |
| **Current plans** | `/plans/active/` | FEAT-XX.md, FIX-XX.md |
| **Completed plans** | `/plans/archived/` | Finished plan files |
| **Completed work** | `/completed/YYYY/MM/` | Results, reports |
| **Test files** | `/tests/` | *.test.js, *.spec.ts |
| **User docs** | `/docs/` | USER_GUIDE.md |
| **Dev docs** | `/documentation/` | ARCHITECTURE.md |
| **Backups** | `/backups/YYYY-MM-DD/` | Database dumps |
| **Sample files** | `/sample-data/` | Test Excel files |
| **Temp files** | **NEVER commit** | Delete immediately |

### When to Create New Folders
1. **New major feature** → Create in appropriate existing folder
2. **New document type** → Evaluate if fits existing structure
3. **Temporary need** → Use `/tmp/` (git-ignored)
4. **Archive need** → Use year/month structure

## 🔄 Maintenance Guidelines

### Daily
- Keep only active files in `/plans/active/`
- Delete temporary files immediately
- Ensure root has only essential files

### Weekly
- Move completed plans to `/plans/archived/`
- Move results to `/completed/YYYY/MM/`
- Clean up any duplicate folders

### Monthly
- Archive old completed work
- Review and consolidate similar folders
- Update this guide if needed

### Quarterly
- Deep clean `/completed/` folder
- Archive to `/_archive/` if > 6 months old
- Review folder structure effectiveness

## 🚫 Anti-Patterns to Avoid

### DON'T
- ❌ Create duplicate folders (`backup/` AND `backups/`)
- ❌ Use inconsistent naming (`TestFiles/` vs `test-files/`)
- ❌ Mix content types in one folder
- ❌ Keep WIP files in root
- ❌ Use special characters in folder names (@, _, ~)
- ❌ Create deeply nested structures (max 3 levels)

### DO
- ✅ Use existing folders first
- ✅ Follow naming conventions
- ✅ Keep single purpose per folder
- ✅ Document new folder purposes
- ✅ Clean up regularly

## 🔨 Immediate Action Items

### Consolidation Needed
1. **Merge `backup/` → `backups/`**
2. **Standardize to `backups/YYYY-MM-DD/` format**
3. **Move test files from root to `/tests/`**
4. **Organize `/completed/` by year/month**

### Folders to Create
- `/plans/pending/` - For queued work
- `/completed/2025/08/` - Current month's completed work
- `/documentation/architecture/` - System design docs

### Folders to Remove/Merge
- `/backup/` → merge into `/backups/`
- Duplicate or empty folders
- Any temporary folders in root

## 📊 Success Metrics

### Good Organization
- ✅ Root has < 10 files
- ✅ Clear folder purposes
- ✅ Easy to find files
- ✅ No duplicate folders
- ✅ Consistent naming

### Poor Organization  
- ❌ 20+ files in root
- ❌ Multiple similar folders
- ❌ Mixed content types
- ❌ Inconsistent naming
- ❌ Deep nesting (>3 levels)

## 🔍 Quick Reference

### File Placement Decision Tree
```
Is it configuration?
  → Root level (.json, .yml, .env.example)

Is it documentation?
  → User-facing? → /docs/
  → Dev-facing? → /documentation/

Is it a plan?
  → Active? → /plans/active/
  → Pending? → /plans/pending/  
  → Done? → /plans/archived/

Is it completed work?
  → /completed/YYYY/MM/

Is it source code?
  → Backend? → /backend/
  → Frontend? → /frontend/

Is it a test?
  → /tests/[unit|integration|e2e]/

Is it temporary?
  → DELETE IT (or /tmp/ if needed)
```

## 📝 Changelog

### Version 1.0 (2025-08-26)
- Initial organization rules established
- Defined folder structure and naming conventions
- Created maintenance guidelines
- Identified consolidation needs