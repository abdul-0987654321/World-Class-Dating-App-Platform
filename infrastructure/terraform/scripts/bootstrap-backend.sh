#!/bin/bash
# =============================================================================
# AWS Terraform Backend Bootstrap Script
# Creates S3 bucket and DynamoDB table for Terraform state
# =============================================================================

set -e

# Configuration
BUCKET_NAME="dating-app-terraform-state"
DYNAMODB_TABLE="terraform-state-lock"
REGION="us-east-1"
PROJECT="dating"

echo "=============================================="
echo "AWS Terraform Backend Bootstrap"
echo "=============================================="
echo ""
echo "This script will create:"
echo "  - S3 bucket: $BUCKET_NAME"
echo "  - DynamoDB table: $DYNAMODB_TABLE"
echo "  - Region: $REGION"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed."
    echo ""
    echo "Install AWS CLI:"
    echo "  Windows: winget install Amazon.AWSCLI"
    echo "  macOS:   brew install awscli"
    echo "  Linux:   curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip' && unzip awscliv2.zip && sudo ./aws/install"
    echo ""
    exit 1
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS credentials not configured."
    echo ""
    echo "Configure credentials:"
    echo "  aws configure"
    echo ""
    echo "Or set environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret"
    echo "  export AWS_REGION=$REGION"
    echo ""
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Using AWS Account: $ACCOUNT_ID"
echo ""

# Create S3 bucket
echo "Creating S3 bucket: $BUCKET_NAME..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "  Bucket already exists"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || \
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION"
    echo "  Created bucket"
fi

# Enable versioning
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
echo "  Versioning enabled"

# Enable encryption
echo "Enabling encryption..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms"
            },
            "BucketKeyEnabled": true
        }]
    }'
echo "  Encryption enabled"

# Block public access
echo "Blocking public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'
echo "  Public access blocked"

# Create DynamoDB table
echo ""
echo "Creating DynamoDB table: $DYNAMODB_TABLE..."
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$REGION" &> /dev/null; then
    echo "  Table already exists"
else
    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    echo "  Table created"

    echo "  Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$DYNAMODB_TABLE" --region "$REGION"
    echo "  Table is active"
fi

echo ""
echo "=============================================="
echo "Backend Bootstrap Complete!"
echo "=============================================="
echo ""
echo "S3 Bucket:      s3://$BUCKET_NAME"
echo "DynamoDB Table: $DYNAMODB_TABLE"
echo "Region:         $REGION"
echo ""
echo "Next steps:"
echo "  1. cd environments/dev"
echo "  2. terraform init"
echo "  3. terraform plan"
echo "  4. terraform apply"
echo ""
