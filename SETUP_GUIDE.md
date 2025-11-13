# Quick Setup Guide

This guide will help you set up the Coding Question Validator system from scratch.

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] MongoDB running (with replica set)
- [ ] Redis server running
- [ ] Anthropic API key obtained

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd coding-question-validator
npm install
```

### 2. Setup MongoDB Replica Set

If you don't have a replica set configured:

```bash
# Start MongoDB with replica set
mongod --replSet rs0 --port 27017 --dbpath /path/to/data1

# In another terminal, initialize replica set
mongosh --eval "rs.initiate()"

# Verify replica set status
mongosh --eval "rs.status()"
```

For development, you can use a single-node replica set:

```bash
# mongod.conf
replication:
  replSetName: rs0
```

### 3. Start Redis

```bash
# macOS (Homebrew)
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis

# Or run directly
redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
nano .env  # or vim, code, etc.
```

**Required changes in .env:**
- `MONGODB_URI` - Your MongoDB connection string
- `ANTHROPIC_API_KEY` - Your Claude API key

### 5. Build TypeScript

```bash
npm run build
```

### 6. Verify Setup

Create a test script `test-setup.ts`:

```typescript
import { loadConfig, validateConfig } from './src/config';
import { MongoDBService } from './src/services/MongoDBService';
import { Logger } from './src/utils/Logger';

async function testSetup() {
  try {
    const config = loadConfig();
    validateConfig(config);
    Logger.initialize(config.app.logLevel);

    console.log('✅ Configuration valid');

    const mongoService = new MongoDBService(config.mongodb);
    await mongoService.connect();
    console.log('✅ MongoDB connected');

    const count = await mongoService.getDocumentCount();
    console.log(`✅ Found ${count} documents`);

    await mongoService.disconnect();
    console.log('✅ Setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

testSetup();
```

Run test:
```bash
npx ts-node test-setup.ts
```

## Running the System

### First Run

1. **Start Consumer** (in one terminal):
```bash
npm run consumer
```

2. **Run Scanner** (in another terminal):
```bash
npm run scanner
```

### Monitor Progress

Watch logs:
```bash
tail -f logs/combined.log
```

Check queue status using Redis CLI:
```bash
redis-cli
> KEYS *question-validation-queue*
> LLEN bull:question-validation-queue:waiting
```

## Troubleshooting Common Setup Issues

### Issue: "Cannot connect to MongoDB"

**Check:**
```bash
# Is MongoDB running?
mongosh --eval "db.adminCommand('ping')"

# Is replica set initialized?
mongosh --eval "rs.status()"
```

**Fix:**
```bash
# Initialize replica set if needed
mongosh --eval "rs.initiate()"
```

### Issue: "Redis connection refused"

**Check:**
```bash
redis-cli ping
```

**Fix:**
```bash
# Start Redis
redis-server

# Or on macOS
brew services start redis
```

### Issue: "Invalid API key"

**Check:**
- API key is correctly set in `.env`
- No extra spaces or quotes around the key
- Key starts with `sk-ant-`

**Fix:**
```bash
# Verify .env file
cat .env | grep ANTHROPIC_API_KEY
# Should show: ANTHROPIC_API_KEY=sk-ant-xxxxx (no quotes)
```

### Issue: "Collection is empty"

**Check:**
```bash
mongosh
> use recruitment
> db.coding_questions.countDocuments()
```

**Fix:**
- Make sure you have documents in the collection
- Verify database and collection names in `.env`

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start consumer
pm2 start npm --name "validator-consumer" -- run consumer

# Start scanner (one-time or scheduled)
pm2 start npm --name "validator-scanner" -- run scanner

# View logs
pm2 logs

# Monitor
pm2 monit
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/consumer.js"]
```

Build and run:
```bash
docker build -t coding-validator .
docker run -d --env-file .env coding-validator
```

### Using systemd

Create `/etc/systemd/system/coding-validator-consumer.service`:

```ini
[Unit]
Description=Coding Question Validator Consumer
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/coding-question-validator
ExecStart=/usr/bin/npm run consumer
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable coding-validator-consumer
sudo systemctl start coding-validator-consumer
sudo systemctl status coding-validator-consumer
```

## Performance Tuning

### For Small Datasets (< 1000 docs)

```env
BATCH_SIZE=50
QUEUE_CONCURRENCY=3
```

### For Medium Datasets (1000-10000 docs)

```env
BATCH_SIZE=100
QUEUE_CONCURRENCY=5
```

### For Large Datasets (> 10000 docs)

```env
BATCH_SIZE=200
QUEUE_CONCURRENCY=10
```

### Rate Limiting Considerations

Claude API rate limits (as of 2024):
- Free tier: ~5 requests/minute
- Paid tier: Variable based on plan

Adjust concurrency accordingly:
```env
# For free tier
QUEUE_CONCURRENCY=2

# For paid tier
QUEUE_CONCURRENCY=10
```

## Monitoring and Alerting

### Log Monitoring

Use tools like:
- **Elasticsearch + Kibana** for centralized logging
- **Grafana Loki** for log aggregation
- **Papertrail** for cloud logging

### Queue Monitoring

Monitor queue metrics:
```bash
# Create monitoring script
cat > monitor-queue.sh << 'EOF'
#!/bin/bash
while true; do
  redis-cli LLEN bull:question-validation-queue:waiting
  redis-cli LLEN bull:question-validation-queue:active
  redis-cli LLEN bull:question-validation-queue:failed
  sleep 10
done
EOF

chmod +x monitor-queue.sh
./monitor-queue.sh
```

### Health Checks

Create health check endpoint:

```typescript
// health-check.ts
import { loadConfig } from './src/config';
import { MongoDBService } from './src/services/MongoDBService';
import IORedis from 'ioredis';

async function healthCheck() {
  const config = loadConfig();

  // Check MongoDB
  const mongo = new MongoDBService(config.mongodb);
  await mongo.connect();
  const mongoOk = await mongo.healthCheck();
  await mongo.disconnect();

  // Check Redis
  const redis = new IORedis(config.queue.redis);
  const redisOk = (await redis.ping()) === 'PONG';
  await redis.quit();

  console.log({ mongodb: mongoOk, redis: redisOk });
  process.exit(mongoOk && redisOk ? 0 : 1);
}

healthCheck();
```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` to git
   - Use environment variable management (AWS Secrets Manager, etc.)

2. **API Keys**
   - Rotate API keys regularly
   - Use different keys for dev/prod
   - Monitor API usage

3. **MongoDB**
   - Enable authentication
   - Use least-privilege users
   - Enable TLS/SSL

4. **Redis**
   - Enable password protection
   - Bind to localhost only (if not using distributed setup)
   - Use TLS for remote connections

## Backup Strategy

### Automated Backups

The system automatically backs up invalid documents to `./failed_questions/`.

For additional safety:

```bash
# Backup MongoDB
mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# Backup failed_questions directory
tar -czf failed_questions_$(date +%Y%m%d).tar.gz failed_questions/
```

### Disaster Recovery

1. Keep MongoDB backups
2. Keep backup of `.env` file (encrypted)
3. Keep failed_questions backups
4. Document restoration procedure

## Next Steps

Once setup is complete:

1. Review logs to ensure no errors
2. Monitor first few document corrections
3. Verify no duplicate documents created
4. Set up monitoring and alerting
5. Configure automated backups
6. Document any custom modifications

## Getting Help

- Check logs: `./logs/combined.log`
- Review README: `README.md`
- Check configuration: `.env`
- Verify services: MongoDB, Redis
- Test components individually

## Useful Commands Reference

```bash
# Install dependencies
npm install

# Build
npm run build

# Run scanner
npm run scanner

# Run consumer
npm run consumer

# Check logs
tail -f logs/combined.log

# Check queue
redis-cli LLEN bull:question-validation-queue:waiting

# Check MongoDB
mongosh --eval "use recruitment; db.coding_questions.countDocuments()"

# Clean queue
redis-cli FLUSHDB

# Remove old logs
rm logs/*.log
```
