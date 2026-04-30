#!/bin/bash
# Daily Postgres backup script.
# Usage: backup_db.sh
# Configure env vars:
#   DATABASE_URL — full Postgres connection string
#   BACKUP_S3_BUCKET — bucket name (e.g. pixelstake-backups)
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — credentials
#   AWS_S3_ENDPOINT — optional, for non-AWS providers (B2/R2/MinIO)
#   BACKUP_ENCRYPTION_KEY — optional, GPG-encrypts the dump

set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/pixelstake_${TIMESTAMP}.dump"
LOG_FILE="/tmp/backup_${TIMESTAMP}.log"

cleanup() {
  rm -f "$DUMP_FILE" "${DUMP_FILE}.gpg" "$LOG_FILE"
}
trap cleanup EXIT

echo "[$(date)] Starting backup" | tee -a "$LOG_FILE"

# 1. Create dump (custom format, parallel where possible)
pg_dump --format=custom --compress=9 --no-owner --no-acl \
  --file="$DUMP_FILE" "$DATABASE_URL" 2>&1 | tee -a "$LOG_FILE"

DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
echo "[$(date)] Dump size: $DUMP_SIZE bytes" | tee -a "$LOG_FILE"

# 2. Optional encryption
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
    --symmetric --cipher-algo AES256 \
    --output "${DUMP_FILE}.gpg" "$DUMP_FILE"
  UPLOAD_FILE="${DUMP_FILE}.gpg"
else
  UPLOAD_FILE="$DUMP_FILE"
fi

# 3. Upload to S3 (or compatible)
S3_KEY="daily/$(date -u +%Y/%m)/$(basename "$UPLOAD_FILE")"

if [ -n "${AWS_S3_ENDPOINT:-}" ]; then
  aws --endpoint-url="$AWS_S3_ENDPOINT" s3 cp \
    "$UPLOAD_FILE" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" 2>&1 | tee -a "$LOG_FILE"
else
  aws s3 cp \
    "$UPLOAD_FILE" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" 2>&1 | tee -a "$LOG_FILE"
fi

echo "[$(date)] Uploaded to s3://${BACKUP_S3_BUCKET}/${S3_KEY}" | tee -a "$LOG_FILE"

# 4. Lifecycle: delete daily backups older than 30 days
# (Configure on the bucket itself via lifecycle policy — this is just a hint.)

echo "[$(date)] Backup complete" | tee -a "$LOG_FILE"
