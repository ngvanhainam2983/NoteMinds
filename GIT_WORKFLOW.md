# 📚 Git & Version Control Guide

## Overview

This guide covers best practices for version control, branching strategy, and deployment workflow for NoteMind.

---

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/NoteMind.git
cd NoteMind
npm run install:all
```

### 2. Configure Git
```bash
git config user.name "Your Name"
git config user.email "your@email.com"

# Global (optional)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 3. Create .env Files
```bash
# Server
cp server/.env.example server/.env
nano server/.env  # Add your API keys

# Client (if needed)
cp client/.env.example client/.env
```

---

## Branching Strategy

UseGit Flow with the following branches:

### Main Branches

**`main`** (Production)
- Stable, deployed code
- Protected branch (requires PR review)
- Tagged with version numbers
- No direct pushes allowed

**`develop`** (Development)
- Integration branch for features
- Always buildable/testable
- Merges PRs from feature branches
- Auto-deployed to staging

### Supporting Branches

**Feature Branches** (`feature/*`)
```bash
git checkout -b feature/chat-history
git checkout -b feature/spaced-repetition
git checkout -b feature/offline-sync
```

**Bugfix Branches** (`bugfix/*`)
```bash
git checkout -b bugfix/encryption-key-issue
git checkout -b bugfix/flashcard-ordering
```

**Hotfix Branches** (`hotfix/*`)
```bash
git checkout -b hotfix/security-patch
git checkout -b hotfix/api-timeout
```

### Release Branches (`release/*`)
```bash
git checkout -b release/1.2.0
# Version bump + final testing
```

---

## Workflow Example

### 1. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/add-tags-system
```

### 2. Develop & Commit
```bash
# Make changes
git add .
git commit -m "feat(tags): implement tag creation and document tagging

- Add /api/tags endpoints
- Create tag database schema
- Add TagsView component
- Update featureRoutes.js"
```

### 3. Push & Create PR
```bash
git push origin feature/add-tags-system
# Open GitHub PR from browser
# Title: "Add Tags System"
# Description: detailed changelog
```

### 4. Code Review
- Reviewer checks code quality
- Tests functionality
- Requests changes if needed
- Approves and merges

### 5. Merge to Develop
```bash
# PR is merged via GitHub UI
git checkout develop
git pull origin develop
```

### 6. Delete Branch
```bash
git branch -d feature/add-tags-system
git push origin --delete feature/add-tags-system
```

---

## Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring without feature change
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build, dependencies, release tasks

### Scope (Optional)
- `api`: API endpoint
- `auth`: Authentication/authorization
- `db`: Database/schema
- `ui`: User interface
- `encryption`: Encryption features
- `export`: Export functionality
- `search`: Search feature

### Examples
```bash
# Good commits
git commit -m "feat(chat): implement conversation history persistence"
git commit -m "fix(search): fix full-text search query parsing"
git commit -m "docs(api): add complete endpoint documentation"
git commit -m "refactor(db): optimize query performance with indexes"
git commit -m "perf(export): reduce PDF generation time by 40%"
```

---

## Pull Request Template

```markdown
## Description
Brief explanation of changes

## Type of Change
- [ ] New feature (non-breaking change adding functionality)
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] Breaking change (feature or fix that would cause existing functionality to change)
- [ ] Documentation update

## Related Issues
Fixes #123
Related to #456

## Testing Performed
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No errors in console

## Screenshots (if applicable)
[Add before/after screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review of own code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests updated
- [ ] Database schema documented (if changed)
```

---

## Versioning

Follow Semantic Versioning: `MAJOR.MINOR.PATCH`

### Major (1.0.0 → 2.0.0)
- Backward-incompatible changes
- Major feature releases
- Database schema changes (breaking)

### Minor (1.0.0 → 1.1.0)
- New features (backward-compatible)
- API additions
- Deprecations with fallback

### Patch (1.0.0 → 1.0.1)
- Bug fixes
- Security patches
- Documentation fixes
- Performance improvements

### Release Checklist
```bash
# 1. Create release branch
git checkout -b release/1.2.0

# 2. Update version numbers
vim package.json          # v1.2.0
vim server/package.json   # v1.2.0
vim client/package.json   # v1.2.0

# 3. Update CHANGELOG
vim CHANGELOG.md

# 4. Commit version bump
git add .
git commit -m "chore(release): v1.2.0 release"

# 5. Tag release
git tag -a v1.2.0 -m "Release version 1.2.0"

# 6. Merge to main
git checkout main
git merge --no-ff release/1.2.0

# 7. Merge back to develop
git checkout develop
git merge --no-ff release/1.2.0

# 8. Push everything
git push origin main develop --tags

# 9. Delete release branch
git branch -d release/1.2.0
```

---

## Project Structure & Important Files

### Configuration Files (Committed)
```
.gitignore                          # Git ignore rules
.env.example                        # Environment template
package.json                        # Root dependencies
package-lock.json                   # Dependency lock file
Dockerfile                          # Container image
docker-compose.yml                  # Compose config
```

### Documentation (Committed)
```
README.md                           # Project overview
API.md                              # API reference
FEATURES.md                         # Feature descriptions
DEPLOYMENT.md                       # Deployment guide
ENCRYPTION_AND_UPDATES.md           # Security & updates
```

### Environment & Secrets (NOT Committed)
```
server/.env                         # Server secrets ❌
client/.env                         # Client secrets ❌
.env.local                          # Local overrides ❌
*.key                               # Private keys ❌
```

### Build Output (NOT Committed)
```
node_modules/                       # Dependencies ❌
dist/                               # Build output ❌
client/dist/                        # Frontend build ❌
server/uploads/                     # Uploaded files ❌
server/exports/                     # Generated exports ❌
server/logs/                        # Application logs ❌
server/data/*.db                    # Database files ❌
```

---

## Common Git Commands

### Status & Diff
```bash
git status                          # Show changes
git diff                            # Show unstaged changes
git diff --staged                   # Show staged changes
git log --oneline -10               # Last 10 commits
git log --oneline --graph --all     # Visual branch history
```

### Staging
```bash
git add .                           # Stage all changes
git add src/                        # Stage specific directory
git add file.js                     # Stage specific file
git reset file.js                   # Unstage file
```

### Stashing
```bash
git stash                           # Save changes temporarily
git stash pop                       # Restore stashed changes
git stash list                      # List all stashes
git stash drop                      # Delete stash
```

### Branching
```bash
git branch feature/new-branch       # Create branch
git checkout feature/new-branch     # Switch branch
git checkout -b feature/new         # Create and switch
git branch -d feature/old           # Delete branch
git branch -m old-name new-name     # Rename branch
git push origin feature/new         # Push branch
```

### Merging & Rebasing
```bash
git merge feature/new               # Merge into current branch
git merge --no-ff feature/new       # Merge with history
git rebase main                     # Rebase current branch
git rebase -i HEAD~3                # Interactive rebase last 3 commits
```

### Undoing
```bash
git restore file.js                 # Discard file changes
git restore --staged file.js        # Unstage file
git reset HEAD~1                    # Undo last commit (keep changes)
git revert HEAD                     # Create opposite commit
git reset --hard HEAD~1             # Undo & discard (⚠️ permanent)
```

---

## Large Files & Binary Data

### Never Commit
- ❌ Uploaded documents (`server/uploads/`)
- ❌ Database files (`*.db`, `*.sqlite`)
- ❌ Generated files (`dist/`, `node_modules/`)
- ❌ Binaries (images > 1MB, videos, etc.)
- ❌ API keys or secrets

### Use Git LFS for Large Files
```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.pdf"
git lfs track "*.mp4"

# Commit
git add .gitattributes
git commit -m "chore: configure Git LFS"
```

---

## CI/CD Pipeline (Recommended)

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm run install:all
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### Pre-commit Hooks

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test
```

Install Husky:
```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

---

## Deployment Workflow

### Auto-Update on Server

Linux/VPS:
```bash
# update-auto.sh pulls latest and installs
bash deploy/update-auto.sh
```

Windows:
```powershell
# update-auto.ps1 does the same
.\update-auto.ps1
```

### Manual Deployment

```bash
# 1. Pull latest
git pull origin main

# 2. Install dependencies
npm run install:all

# 3. Build
npm run build

# 4. Restart service
pm2 restart notemind
# OR
docker-compose restart
```

---

## Troubleshooting

### Merge Conflicts
```bash
# View conflicts
git status

# Resolve manually in editor, then:
git add .
git commit -m "resolve: merge conflicts"
```

### Undo Published Commit
```bash
# Safe: create opposite commit
git revert 1a2b3c4d

# Risky: rewrite history (only for personal branches)
git reset --hard 1a2b3c4d
git push --force
```

### Recover Deleted Branch
```bash
# Find commit
git reflog

# Recreate branch at that commit
git checkout -b branch-name 1a2b3c4d
```

### Sync Fork with Upstream
```bash
git remote add upstream https://github.com/original/NoteMind.git
git fetch upstream
git rebase upstream/main
git push origin main
```

---

## Code Review Checklist

As a Reviewer:
- [ ] Code follows style guidelines
- [ ] No hardcoded values/secrets
- [ ] Database queries optimized
- [ ] Error handling implemented
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] No breaking changes to API
- [ ] Security implications checked
- [ ] Performance impact assessed

As an Author:
- [ ] Self-reviewed before PR
- [ ] Tested locally
- [ ] Updated documentation
- [ ] Database migrations included
- [ ] No console errors/warnings
- [ ] Commits are atomic with good messages

---

## Documentation Updates

Update docs when:
- ✏️ Adding new API endpoints → `API.md`
- ✏️ New features added → `FEATURES.md`
- ✏️ Architecture changes → `README.md`
- ✏️ Deployment changes → `DEPLOYMENT.md`
- ✏️ Security updates → `ENCRYPTION_AND_UPDATES.md`

---

## Contact & Support

- 📧 **Issues**: GitHub Issues
- 💬 **Discussion**: GitHub Discussions  
- 🔗 **Documentation**: See [README.md](./README.md)

---

## License

Code licensed under MIT. See LICENSE file.

Last Updated: February 25, 2026
