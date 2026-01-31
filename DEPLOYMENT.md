# AWS App Runner Deployment Guide - Athena MCP

This document captures all steps taken to deploy the Athena MCP Next.js application to AWS App Runner using CodeBuild (no Docker required locally).

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Source Code   │───▶│   S3 Bucket     │───▶│   CodeBuild     │───▶│      ECR        │
│   (Local/Git)   │    │  (source.zip)   │    │ (Docker Build)  │    │ (Docker Image)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                                               │
                                                                               ▼
┌─────────────────┐    ┌─────────────────┐                          ┌─────────────────┐
│   Neon DB       │◀───│   App Runner    │◀─────────────────────────│   App Runner    │
│  (PostgreSQL)   │    │   (Running)     │                          │  (Pull Image)   │
└─────────────────┘    └─────────────────┘                          └─────────────────┘
```

## Prerequisites

- AWS CLI installed and configured
- AWS Account with appropriate permissions
- Neon PostgreSQL database (or other PostgreSQL)

## AWS Resources Created

### Region: us-west-2

| Resource | Name/ARN | Purpose |
|----------|----------|---------|
| ECR Repository | `athena-mcp` | Store Docker images |
| S3 Bucket | `athena-mcp-build-628203515088` | Store source code for CodeBuild |
| CodeBuild Project | `athena-mcp-build` | Build Docker images |
| IAM Role | `codebuild-athena-mcp-role` | CodeBuild permissions |
| IAM Role | `apprunner-athena-mcp-ecr-role` | App Runner ECR access |
| IAM Role | `apprunner-athena-mcp-instance-role` | App Runner runtime permissions |
| App Runner Service | `athena-mcp` | Host the application |

## Step-by-Step Deployment

### 1. Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name athena-mcp \
  --region us-west-2 \
  --image-scanning-configuration scanOnPush=true
```

### 2. Create S3 Bucket for Source Code

```bash
aws s3 mb s3://athena-mcp-build-628203515088 --region us-west-2
```

### 3. Create IAM Role for CodeBuild

Create trust policy file `iam/codebuild-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create permissions policy file `iam/codebuild-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-west-2:628203515088:repository/athena-mcp"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::codebuild-*/*",
        "arn:aws:s3:::athena-mcp-build-628203515088/*"
      ]
    }
  ]
}
```

Create the role:
```bash
aws iam create-role \
  --role-name codebuild-athena-mcp-role \
  --assume-role-policy-document file://iam/codebuild-trust-policy.json

aws iam put-role-policy \
  --role-name codebuild-athena-mcp-role \
  --policy-name codebuild-athena-mcp-policy \
  --policy-document file://iam/codebuild-policy.json
```

### 4. Create CodeBuild Project

Create project config file `iam/codebuild-project.json`:
```json
{
  "name": "athena-mcp-build",
  "source": {
    "type": "S3",
    "location": "athena-mcp-build-628203515088/source.zip"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "privilegedMode": true
  },
  "serviceRole": "arn:aws:iam::628203515088:role/codebuild-athena-mcp-role"
}
```

Create the project:
```bash
aws codebuild create-project \
  --cli-input-json file://iam/codebuild-project.json \
  --region us-west-2
```

### 5. Create IAM Roles for App Runner

**ECR Access Role:**
```bash
# Trust policy for ECR access
cat > iam/apprunner-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name apprunner-athena-mcp-ecr-role \
  --assume-role-policy-document file://iam/apprunner-trust-policy.json

aws iam attach-role-policy \
  --role-name apprunner-athena-mcp-ecr-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

**Instance Role (for Bedrock access):**
```bash
# Trust policy for instance role
cat > iam/apprunner-instance-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Permissions for Bedrock
cat > iam/apprunner-instance-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-role \
  --role-name apprunner-athena-mcp-instance-role \
  --assume-role-policy-document file://iam/apprunner-instance-trust-policy.json

aws iam put-role-policy \
  --role-name apprunner-athena-mcp-instance-role \
  --policy-name bedrock-access-policy \
  --policy-document file://iam/apprunner-instance-policy.json
```

### 6. Build and Push Docker Image

**Package source code:**
```bash
git archive --format=zip --output=source.zip HEAD
```

**Upload to S3:**
```bash
aws s3 cp source.zip s3://athena-mcp-build-628203515088/source.zip --region us-west-2
```

**Start CodeBuild:**
```bash
aws codebuild start-build \
  --project-name athena-mcp-build \
  --region us-west-2
```

**Check build status:**
```bash
aws codebuild batch-get-builds \
  --ids <BUILD_ID> \
  --region us-west-2 \
  --query 'builds[0].{status:buildStatus,phase:currentPhase}'
```

### 7. Create App Runner Service

Create service config file `iam/apprunner-service.json`:
```json
{
  "ServiceName": "athena-mcp",
  "SourceConfiguration": {
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::628203515088:role/apprunner-athena-mcp-ecr-role"
    },
    "AutoDeploymentsEnabled": false,
    "ImageRepository": {
      "ImageIdentifier": "628203515088.dkr.ecr.us-west-2.amazonaws.com/athena-mcp:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "DATABASE_URL": "your-database-url",
          "KEY_ENCRYPTION_SECRET": "your-encryption-key",
          "AWS_REGION": "us-west-2",
          "HOSTNAME": "0.0.0.0"
        }
      },
      "ImageRepositoryType": "ECR"
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1024",
    "Memory": "2048",
    "InstanceRoleArn": "arn:aws:iam::628203515088:role/apprunner-athena-mcp-instance-role"
  },
  "HealthCheckConfiguration": {
    "Protocol": "TCP",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
```

Create the service:
```bash
aws apprunner create-service \
  --cli-input-json file://iam/apprunner-service.json \
  --region us-west-2
```

**Check service status:**
```bash
aws apprunner list-services \
  --region us-west-2 \
  --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].{Status:Status,URL:ServiceUrl}'
```

## Key Configuration Files

### Dockerfile
```dockerfile
# Stage 1: Dependencies
FROM public.ecr.aws/docker/library/node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

# Stage 2: Builder
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### buildspec.yml
```yaml
version: 0.2

env:
  variables:
    AWS_ACCOUNT_ID: "628203515088"
    AWS_REGION: "us-west-2"
    IMAGE_REPO_NAME: "athena-mcp"
    IMAGE_TAG: "latest"

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
  build:
    commands:
      - echo Building the Docker image...
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
  post_build:
    commands:
      - echo Pushing the Docker image...
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
```

### next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

## Redeployment Steps

To deploy a new version:

```bash
# 1. Package source code
git archive --format=zip --output=source.zip HEAD

# 2. Upload to S3
aws s3 cp source.zip s3://athena-mcp-build-628203515088/source.zip --region us-west-2

# 3. Start CodeBuild
BUILD_ID=$(aws codebuild start-build \
  --project-name athena-mcp-build \
  --region us-west-2 \
  --query 'build.id' \
  --output text)

echo "Build started: $BUILD_ID"

# 4. Wait for build to complete (check status)
aws codebuild batch-get-builds \
  --ids $BUILD_ID \
  --region us-west-2 \
  --query 'builds[0].buildStatus'

# 5. Deploy new image to App Runner
SERVICE_ARN=$(aws apprunner list-services \
  --region us-west-2 \
  --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].ServiceArn' \
  --output text)

aws apprunner start-deployment \
  --service-arn $SERVICE_ARN \
  --region us-west-2
```

## Troubleshooting

### Health Check Failures

**Problem:** App Runner health check fails
**Solution:**
1. Use TCP health check instead of HTTP
2. Set `HOSTNAME=0.0.0.0` in environment variables
3. Check application logs in CloudWatch

```bash
# Get log groups
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/apprunner/athena-mcp" \
  --region us-west-2

# Get service events
aws logs get-log-events \
  --log-group-name "/aws/apprunner/athena-mcp/<SERVICE_ID>/service" \
  --log-stream-name "events" \
  --region us-west-2
```

### Docker Build Failures

**Problem:** CodeBuild fails during Docker build
**Common causes:**
1. Docker Hub rate limiting - Use ECR public images (`public.ecr.aws/docker/library/node:20-alpine`)
2. TypeScript errors - Run `npm run build` locally first
3. Missing files - Ensure all files are committed before `git archive`

### Prisma Client Issues

**Problem:** Prisma client not found at runtime
**Solution:** Copy the generated Prisma client in Dockerfile:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated
```

## Cost Estimates

| Service | Monthly Cost (Light Usage) |
|---------|---------------------------|
| CodeBuild | Free (100 min/month free tier) |
| ECR | ~$0.10/GB storage |
| App Runner | ~$5-15 (scales to zero when idle) |
| **Total** | **~$5-15/month** |

## Current Deployment

- **URL:** https://nbi29huvfv.us-west-2.awsapprunner.com
- **Region:** us-west-2
- **Database:** Neon PostgreSQL (us-east-1)
- **Status:** RUNNING

## Clean Up

To delete all resources:

```bash
# Delete App Runner service
aws apprunner delete-service \
  --service-arn <SERVICE_ARN> \
  --region us-west-2

# Delete CodeBuild project
aws codebuild delete-project \
  --name athena-mcp-build \
  --region us-west-2

# Delete ECR repository
aws ecr delete-repository \
  --repository-name athena-mcp \
  --region us-west-2 \
  --force

# Delete S3 bucket
aws s3 rb s3://athena-mcp-build-628203515088 --force

# Delete IAM roles
aws iam delete-role-policy --role-name codebuild-athena-mcp-role --policy-name codebuild-athena-mcp-policy
aws iam delete-role --role-name codebuild-athena-mcp-role

aws iam detach-role-policy --role-name apprunner-athena-mcp-ecr-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
aws iam delete-role --role-name apprunner-athena-mcp-ecr-role

aws iam delete-role-policy --role-name apprunner-athena-mcp-instance-role --policy-name bedrock-access-policy
aws iam delete-role --role-name apprunner-athena-mcp-instance-role
```
