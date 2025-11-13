# Deployment Checklist

Use this checklist to ensure proper deployment of the Coding Question Validator system.

## Pre-Deployment

### Environment Setup

- [ ] Node.js v18+ installed
  ```bash
  node --version  # Should be >= 18
  ```

- [ ] MongoDB replica set running
  ```bash
  mongosh --eval "rs.status()"
  ```

- [ ] Redis server running
  ```bash
  redis-cli ping  # Should return "PONG"
  ```

- [ ] Sufficient disk space for backups
  ```bash
  df -h  # Check available space
  ```

### Configuration

- [ ] `.env` file created from `.env.example`
  ```bash
  cp .env.example .env
  ```

- [ ] MongoDB URI configured correctly
  ```env
  MONGODB_URI=mongodb://host1:27017,host2:27018/db?replicaSet=rs0
  ```

- [ ] Anthropic API key added (no quotes)
  ```env
  ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
  ```

- [ ] Database and collection names verified
  ```env
  MONGODB_DATABASE=recruitment
  MONGODB_COLLECTION=coding_questions
  ```

- [ ] Redis connection settings correct
  ```env
  REDIS_HOST=localhost
  REDIS_PORT=6379
  ```

- [ ] Performance settings tuned
  ```env
  BATCH_SIZE=100          # Adjust based on dataset size
  QUEUE_CONCURRENCY=5     # Adjust based on API limits
  ```

### Installation

- [ ] Dependencies installed
  ```bash
  npm install
  ```

- [ ] TypeScript compiled successfully
  ```bash
  npm run build
  ```

- [ ] No TypeScript errors
  ```bash
  # Check for any compilation errors
  ```

- [ ] Required directories created
  ```bash
  mkdir -p logs failed_questions
  ```

## Testing Phase

### Configuration Test

- [ ] Configuration loads without errors
  ```bash
  npm run scanner -- --help  # Should not throw config errors
  ```

### Connection Tests

- [ ] MongoDB connection successful
  ```bash
  # Run scanner in dry-run mode (if available)
  # Or check logs for connection success
  ```

- [ ] Redis connection successful
  ```bash
  redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
  ```

- [ ] AI API connection successful
  ```bash
  # Consumer will test this on startup
  ```

### Small-Scale Test

- [ ] Run scanner on small subset (if possible)
  ```bash
  # Limit to first 10 documents for testing
  npm run scanner
  ```

- [ ] Verify backups created
  ```bash
  ls -lh failed_questions/
  ```

- [ ] Check logs for errors
  ```bash
  cat logs/combined.log | grep ERROR
  ```

- [ ] Verify queue has jobs
  ```bash
  redis-cli LLEN bull:question-validation-queue:waiting
  ```

- [ ] Run consumer and process 1-2 jobs
  ```bash
  npm run consumer
  # Watch for successful processing
  ```

- [ ] Verify updates in MongoDB
  ```bash
  mongosh
  > use recruitment
  > db.coding_questions.find({}).limit(5)
  ```

- [ ] Confirm no duplicate documents
  ```bash
  # Check document count before and after
  mongosh --eval "use recruitment; db.coding_questions.countDocuments()"
  ```

## Production Deployment

### Pre-Launch

- [ ] All tests passed
- [ ] Backups of MongoDB collection
  ```bash
  mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d)
  ```

- [ ] Backup of current `.env` file (encrypted)
  ```bash
  cp .env .env.backup
  ```

- [ ] Process manager installed (PM2/systemd)
  ```bash
  npm install -g pm2
  # OR configure systemd service
  ```

### Launch

- [ ] Start consumer in background
  ```bash
  pm2 start npm --name "validator-consumer" -- run consumer
  # OR
  systemctl start coding-validator-consumer
  ```

- [ ] Verify consumer is running
  ```bash
  pm2 status
  # OR
  systemctl status coding-validator-consumer
  ```

- [ ] Monitor consumer logs
  ```bash
  pm2 logs validator-consumer --lines 50
  # OR
  journalctl -u coding-validator-consumer -f
  ```

- [ ] Run scanner
  ```bash
  npm run scanner
  ```

- [ ] Monitor scanner progress
  ```bash
  tail -f logs/combined.log
  ```

### Post-Launch Monitoring

- [ ] Check queue statistics
  ```bash
  redis-cli LLEN bull:question-validation-queue:waiting
  redis-cli LLEN bull:question-validation-queue:active
  redis-cli LLEN bull:question-validation-queue:completed
  redis-cli LLEN bull:question-validation-queue:failed
  ```

- [ ] Monitor error logs
  ```bash
  tail -f logs/error.log
  ```

- [ ] Verify document updates
  ```bash
  # Check a few updated documents manually
  ```

- [ ] Confirm no duplicates created
  ```bash
  mongosh --eval "use recruitment; db.coding_questions.countDocuments()"
  # Should match pre-deployment count
  ```

- [ ] Check backup count
  ```bash
  ls failed_questions/ | wc -l
  ```

- [ ] Monitor API usage
  ```bash
  # Check Anthropic dashboard for API usage
  ```

## Performance Monitoring

### First Hour

- [ ] Monitor memory usage
  ```bash
  pm2 monit
  # OR
  top -p $(pgrep -f consumer)
  ```

- [ ] Check CPU usage
  ```bash
  top -p $(pgrep -f consumer)
  ```

- [ ] Monitor Redis memory
  ```bash
  redis-cli INFO memory
  ```

- [ ] Check MongoDB connections
  ```bash
  mongosh --eval "db.serverStatus().connections"
  ```

### First Day

- [ ] Review processing rate
  ```bash
  # Jobs per minute from logs
  cat logs/combined.log | grep "Job completed" | wc -l
  ```

- [ ] Check failed jobs
  ```bash
  redis-cli LLEN bull:question-validation-queue:failed
  ```

- [ ] Review error patterns
  ```bash
  cat logs/error.log | grep -o "Error: .*" | sort | uniq -c
  ```

- [ ] Verify backup integrity
  ```bash
  # Spot check a few backup files
  cat failed_questions/$(ls failed_questions/ | head -1) | jq .
  ```

## Ongoing Maintenance

### Daily

- [ ] Check consumer is running
  ```bash
  pm2 status validator-consumer
  ```

- [ ] Review error logs
  ```bash
  cat logs/error.log
  ```

- [ ] Monitor queue depth
  ```bash
  redis-cli LLEN bull:question-validation-queue:waiting
  ```

### Weekly

- [ ] Clean old logs
  ```bash
  # Logs older than 7 days
  find logs/ -name "*.log" -mtime +7 -delete
  ```

- [ ] Clean completed jobs
  ```bash
  # Via BullMQ admin UI or programmatically
  ```

- [ ] Review backup storage
  ```bash
  du -sh failed_questions/
  ```

- [ ] Archive old backups
  ```bash
  tar -czf backups-$(date +%Y%m%d).tar.gz failed_questions/
  # Move to long-term storage
  ```

### Monthly

- [ ] Rotate API keys (if required)
  ```bash
  # Update ANTHROPIC_API_KEY in .env
  # Restart consumer
  pm2 restart validator-consumer
  ```

- [ ] Update dependencies
  ```bash
  npm outdated
  npm update
  npm audit fix
  ```

- [ ] Review and optimize performance
  ```bash
  # Analyze logs for bottlenecks
  # Adjust BATCH_SIZE and QUEUE_CONCURRENCY
  ```

## Rollback Procedure

If issues occur:

- [ ] Stop consumer immediately
  ```bash
  pm2 stop validator-consumer
  # OR
  systemctl stop coding-validator-consumer
  ```

- [ ] Stop scanner if running
  ```bash
  # Ctrl+C or kill process
  ```

- [ ] Clear queue (if needed)
  ```bash
  redis-cli FLUSHDB  # WARNING: Clears all Redis data
  # OR selectively remove jobs
  ```

- [ ] Restore from MongoDB backup
  ```bash
  mongorestore --uri="$MONGODB_URI" backup-20240115/
  ```

- [ ] Review what went wrong
  ```bash
  cat logs/error.log
  ```

- [ ] Fix issues and re-test
  ```bash
  # Follow testing phase again
  ```

## Troubleshooting Checklist

### Consumer Not Processing

- [ ] Check consumer is running
  ```bash
  pm2 status
  ps aux | grep consumer
  ```

- [ ] Check Redis connection
  ```bash
  redis-cli ping
  ```

- [ ] Check MongoDB connection
  ```bash
  mongosh --eval "db.adminCommand('ping')"
  ```

- [ ] Check API key validity
  ```bash
  # Review error logs for API errors
  ```

- [ ] Check queue has jobs
  ```bash
  redis-cli LLEN bull:question-validation-queue:waiting
  ```

### High Error Rate

- [ ] Review error logs
  ```bash
  tail -100 logs/error.log
  ```

- [ ] Check validation errors
  ```bash
  # Look for patterns in validation failures
  ```

- [ ] Verify AI prompt
  ```bash
  # Review src/prompts/correction-prompt.ts
  ```

- [ ] Check API rate limits
  ```bash
  # Review Anthropic dashboard
  ```

### Performance Issues

- [ ] Check batch size
  ```env
  BATCH_SIZE=100  # Reduce if memory issues
  ```

- [ ] Check concurrency
  ```env
  QUEUE_CONCURRENCY=5  # Reduce if API limits
  ```

- [ ] Monitor memory
  ```bash
  pm2 monit
  ```

- [ ] Check MongoDB indexes
  ```bash
  mongosh --eval "use recruitment; db.coding_questions.getIndexes()"
  ```

## Success Metrics

### Key Performance Indicators

- [ ] Processing rate: _____ documents/minute
- [ ] Error rate: < 5%
- [ ] Update success rate: > 95%
- [ ] No duplicate documents created: ✓
- [ ] All invalid documents backed up: ✓

### Sign-Off

- [ ] System deployed successfully
- [ ] All tests passed
- [ ] Monitoring in place
- [ ] Documentation reviewed
- [ ] Team trained on operations

**Deployed by**: _______________
**Date**: _______________
**Version**: 1.0.0

## Emergency Contacts

**System Administrator**: _______________
**Database Administrator**: _______________
**On-Call Engineer**: _______________

## Notes

```
Add any deployment-specific notes here:
- Special configurations
- Known issues
- Workarounds applied
```

---

**Last Updated**: 2024-01-15
**Next Review**: _______________
