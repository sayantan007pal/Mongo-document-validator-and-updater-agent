# File Manifest - Coding Question Validator

This document lists all files in the project and their purpose.

## Configuration Files (4 files)

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies and scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `.env.example` | Environment variables template |
| `.gitignore` | Git ignore rules |

## Documentation (5 files)

| File | Purpose |
|------|---------|
| `README.md` | Main user guide and usage documentation |
| `SETUP_GUIDE.md` | Step-by-step setup instructions |
| `ARCHITECTURE.md` | Technical architecture and design decisions |
| `PROJECT_SUMMARY.md` | Executive summary and overview |
| `DEPLOYMENT_CHECKLIST.md` | Production deployment checklist |

## Source Code - TypeScript (26 files)

### Configuration (4 files)

| File | Purpose |
|------|---------|
| `src/config/index.ts` | Main configuration loader with validation |
| `src/config/mongodb.config.ts` | MongoDB connection configuration |
| `src/config/queue.config.ts` | Redis/BullMQ queue configuration |
| `src/config/ai.config.ts` | Anthropic AI API configuration |

### Models (3 files)

| File | Purpose |
|------|---------|
| `src/models/CodingQuestion.ts` | Main document schema with Zod validation |
| `src/models/ValidationError.ts` | Validation error types and factory |
| `src/models/QueueMessage.ts` | Queue message structure and types |

### Validators (1 file)

| File | Purpose |
|------|---------|
| `src/validators/SchemaValidator.ts` | Document validation orchestrator |

### Services (5 files)

| File | Purpose |
|------|---------|
| `src/services/MongoDBService.ts` | Database connection and CRUD operations |
| `src/services/QueueService.ts` | BullMQ queue management |
| `src/services/AIProcessorService.ts` | Claude API integration for corrections |
| `src/services/UpdaterService.ts` | Safe document update operations |
| `src/services/ScannerService.ts` | Document scanning and queueing |

### Utils (3 files)

| File | Purpose |
|------|---------|
| `src/utils/Logger.ts` | Winston-based logging utility |
| `src/utils/RetryHelper.ts` | Retry logic with exponential backoff |
| `src/utils/BackupManager.ts` | Document backup management |

### Prompts (1 file)

| File | Purpose |
|------|---------|
| `src/prompts/correction-prompt.ts` | AI correction prompt template and parser |

### CLI Entry Points (2 files)

| File | Purpose |
|------|---------|
| `src/scanner.ts` | Scanner CLI - scans and queues invalid documents |
| `src/consumer.ts` | Consumer CLI - processes queue and updates documents |

### Main Exports (1 file)

| File | Purpose |
|------|---------|
| `src/index.ts` | Main module exports for programmatic usage |

## Scripts (1 file)

| File | Purpose |
|------|---------|
| `quick-start.sh` | Automated setup and verification script |

## Directories (2 directories)

| Directory | Purpose |
|-----------|---------|
| `logs/` | Application logs (error.log, combined.log) |
| `failed_questions/` | JSON backups of invalid documents |

## Total File Count

- **TypeScript Source Files**: 26
- **Configuration Files**: 4
- **Documentation Files**: 5
- **Script Files**: 1
- **Manifest File**: 1 (this file)
- **Total**: 37 files

## File Sizes (Approximate)

| Category | Lines of Code | File Size |
|----------|---------------|-----------|
| TypeScript Source | ~2,500 LOC | ~80 KB |
| Documentation | ~3,000 lines | ~150 KB |
| Configuration | ~200 lines | ~8 KB |
| **Total** | **~5,700 lines** | **~238 KB** |

## Dependencies

### Production Dependencies (7)
- `@anthropic-ai/sdk` - Claude API client
- `bullmq` - Queue management
- `dotenv` - Environment variables
- `ioredis` - Redis client
- `mongodb` - MongoDB driver
- `winston` - Logging
- `zod` - Schema validation
- `typescript` - TypeScript compiler

### Development Dependencies (3)
- `@types/node` - Node.js type definitions
- `nodemon` - Development file watcher
- `ts-node` - TypeScript execution

## Architecture Overview

```
Configuration Layer (4 files)
    ↓
Models & Types (3 files)
    ↓
Validators (1 file)
    ↓
Services (5 files)
    ↓
    ├── Scanner CLI ──→ Queue ──→ Consumer CLI
    │                                   │
    └── Backup ←──────────┬────────────┴──→ MongoDB
                          └──→ AI Processor
```

## Usage Entry Points

1. **Scanner**: `npm run scanner` → `src/scanner.ts`
2. **Consumer**: `npm run consumer` → `src/consumer.ts`
3. **Programmatic**: `import { ... } from './src/index'`

## Generated Files (Not in Repository)

These files are generated during build/runtime:

- `dist/` - Compiled JavaScript (from `npm run build`)
- `node_modules/` - Dependencies (from `npm install`)
- `logs/*.log` - Log files (generated at runtime)
- `failed_questions/*.json` - Backup files (generated at runtime)
- `.env` - Environment config (created from `.env.example`)

## Maintenance Notes

- **Update TypeScript**: `npm update typescript`
- **Update Dependencies**: `npm update`
- **Rebuild**: `npm run clean && npm run build`
- **Clean Logs**: `rm -rf logs/*.log`
- **Clean Backups**: `rm -rf failed_questions/*.json`

---

**Last Updated**: January 15, 2024
**Project Version**: 1.0.0
