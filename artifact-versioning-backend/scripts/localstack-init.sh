#!/bin/bash
# Runs inside LocalStack on startup — creates the S3 bucket
set -e

BUCKET="${S3_BUCKET_NAME:-artifact-versioning}"
REGION="${DEFAULT_REGION:-us-east-1}"

echo "[localstack-init] Creating bucket: $BUCKET"
awslocal s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || true

awslocal s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}
    }]
  }' 2>/dev/null || true

echo "[localstack-init] Bucket $BUCKET ready."
