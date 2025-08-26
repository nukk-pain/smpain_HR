# Folder Consolidation Action Plan
**Date**: 2025년 08월 26일  
**Goal**: Fix current organization inconsistencies

## 🔴 Critical Issues to Fix

### 1. Duplicate/Similar Folders
```
Current:                  →  Should Be:
backup/                   →  backups/
backups/                  →  backups/YYYY-MM-DD/
```

### 2. Inconsistent Naming
```
Current:                  →  Should Be:
completed/                →  completed/2025/08/
plans/active/            →  plans/active/
plans/completed/         →  plans/archived/
documentation/           →  documentation/
docs/                    →  docs/
```

### 3. Missing Structure
Need to create:
- `/plans/pending/` - For backlog items
- `/completed/2025/` - Year organization
- `/completed/2025/08/` - Current month
- `/tmp/` - For temporary files (git-ignored)

## 📋 Step-by-Step Consolidation

### Step 1: Backup Current State
```bash
# Create safety backup
tar -czf root-backup-$(date +%Y%m%d).tar.gz backup/ backups/ completed/ plans/
```

### Step 2: Consolidate Backup Folders
```bash
# Move backup/ contents to backups/
mv backup/components backups/2025-08-26-components/
rmdir backup/

# Ensure date-based structure
cd backups/
# Rename existing to date format if needed
```

### Step 3: Organize Completed Folder
```bash
# Create year/month structure
mkdir -p completed/2025/{01-Jan,02-Feb,03-Mar,04-Apr,05-May,06-Jun,07-Jul,08-Aug}
mkdir -p completed/_archive

# Move current files to appropriate months
# Based on file dates or content
```

### Step 4: Fix Plans Structure  
```bash
# Rename for consistency
mv plans/completed plans/archived
mkdir -p plans/pending
```

### Step 5: Clean Documentation
```bash
# Ensure no duplication between docs/ and documentation/
# docs/ = user-facing
# documentation/ = dev-facing
```

## 🗂️ Final Target Structure

```
/mnt/d/my_programs/HR/
├── README.md
├── INDEX-PLAN.md
├── CLAUDE.md
├── CLAUDE.local.md
├── ROOT-ORGANIZATION-RULES.md
├── package.json
├── .gitignore
├── vercel.json
│
├── backend/
├── frontend/
├── scripts/
│
├── docs/                    # User documentation
│   ├── api/
│   ├── guides/
│   └── deployment/
│
├── documentation/           # Dev documentation
│   ├── testing/
│   └── architecture/
│
├── plans/
│   ├── active/             # Currently working
│   ├── pending/            # Backlog
│   └── archived/           # Completed plans
│
├── completed/
│   ├── 2025/
│   │   └── 08-Aug/        # Current completed work
│   └── _archive/          # Old items
│
├── backups/
│   ├── 2025-08-19-database/
│   └── 2025-08-26-components/
│
├── sample-data/
│   ├── payroll/
│   └── documents/
│
├── config/
├── deploy/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## ✅ Validation Checklist

After consolidation:
- [ ] No duplicate folders (backup vs backups)
- [ ] Consistent naming (plural for collections)
- [ ] Clear separation of concerns
- [ ] Year/month organization for completed
- [ ] Plans have 3 clear states (active/pending/archived)
- [ ] Root has < 10 files
- [ ] All folders follow naming convention
- [ ] Documentation split clearly (user vs dev)

## 🚀 Implementation Commands

```bash
# 1. Safety backup
tar -czf pre-consolidation-backup.tar.gz backup/ backups/ completed/ plans/

# 2. Consolidate backups
mv backup/* backups/2025-08-26-legacy/
rmdir backup/

# 3. Organize completed by date
cd completed/
mkdir -p 2025/{01-Jan,02-Feb,03-Mar,04-Apr,05-May,06-Jun,07-Jul,08-Aug}
# Move files based on creation date

# 4. Fix plans structure
cd ../plans/
mv completed archived
mkdir pending

# 5. Verify structure
tree -L 2 -d

# 6. Update .gitignore if needed
echo "tmp/" >> ../.gitignore

# 7. Commit changes
git add -A
git commit -m "refactor: Consolidate folder structure per ROOT-ORGANIZATION-RULES.md"
```

## 📊 Before/After Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Root files | 10+ | <8 | ✅ 20% reduction |
| Duplicate folders | 2 | 0 | ✅ 100% fixed |
| Naming consistency | 60% | 100% | ✅ 40% improvement |
| Clear organization | 70% | 100% | ✅ 30% improvement |
| Easy navigation | Fair | Excellent | ✅ Significant |

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking references | Search & update all path references |
| Lost files | Create backup before starting |
| Git history | Use `git mv` to preserve history |
| CI/CD impact | Update deployment scripts if needed |

## 📅 Timeline

- **Immediate** (Now): Fix duplicate folders (backup/backups)
- **Today**: Organize completed/ folder
- **This Week**: Implement full structure
- **Ongoing**: Maintain per guidelines