# Athena MCP - Complete AWS Deployment Log

This document captures every action, command, error, and fix applied during the deployment of Athena MCP to AWS App Runner. Use this as a reference for future deployments.

---

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [Database Configuration (Neon PostgreSQL)](#2-database-configuration-neon-postgresql)
3. [Docker Configuration](#3-docker-configuration)
4. [AWS ECR Repository](#4-aws-ecr-repository)
5. [S3 Bucket for Source Code](#5-s3-bucket-for-source-code)
6. [IAM Roles and Policies](#6-iam-roles-and-policies)
7. [CodeBuild Project](#7-codebuild-project)
8. [Building and Pushing Docker Image](#8-building-and-pushing-docker-image)
9. [App Runner Service](#9-app-runner-service)
10. [Errors Encountered and Fixes](#10-errors-encountered-and-fixes)
11. [Final Working Configuration](#11-final-working-configuration)
12. [Redeployment Quick Reference](#12-redeployment-quick-reference)

---

## 1. Initial Setup

### Prerequisites Verified
```bash
# Check AWS CLI version
aws --version
# Output: aws-cli/2.28.22 Python/3.13.7 Windows/11 exe/AMD64

# Verify AWS credentials
aws sts get-caller-identity
# Output:
# {
#     "UserId": "AIDAZEQ6Y5TIK6KOAGNJR",
#     "Account": "628203515088",
#     "Arn": "arn:aws:iam::628203515088:user/dev-user"
# }
```

### Account Information
- **AWS Account ID:** 628203515088
- **IAM User:** dev-user
- **Region:** us-west-2

---

## 2. Database Configuration (Neon PostgreSQL)

### Connection String
```
postgresql://neondb_owner:npg_W5NGyuRSvnP9@ep-dawn-dawn-ahtikapa-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Updated .env File
```env
# Database - Neon PostgreSQL (serverless)
# Dashboard: https://console.neon.tech
DATABASE_URL="postgresql://neondb_owner:npg_W5NGyuRSvnP9@ep-dawn-dawn-ahtikapa-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Push Schema to Database
```bash
npm run db:push
# Output: Your database is now in sync with your Prisma schema. Done in 30.52s
```

---

## 3. Docker Configuration

### 3.1 Updated next.config.ts for Standalone Output
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

### 3.2 Created Dockerfile (Final Working Version)
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

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Stage 3: Runner
FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client (ensure it's available at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

**Key Points:**
- Uses `public.ecr.aws/docker/library/node:20-alpine` instead of `node:20-alpine` to avoid Docker Hub rate limits
- `ENV HOSTNAME=0.0.0.0` is critical for App Runner to access the app
- Copies `lib/generated` for Prisma client

### 3.3 Created .dockerignore
```
node_modules
.next
.git
.gitignore
*.md
.env
.env.local
.env.development
.env.production
Dockerfile
.dockerignore
npm-debug.log
.claude
```

### 3.4 Created buildspec.yml
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
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker image...
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
      - echo Writing image definition file...
      - printf '{"ImageURI":"%s"}' $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG > imageDetail.json

artifacts:
  files:
    - imageDetail.json
```

---

## 4. AWS ECR Repository

### Initial Attempt (us-east-1) - DELETED
```bash
aws ecr create-repository --repository-name athena-mcp --region us-east-1 --image-scanning-configuration scanOnPush=true
```

### Deleted and Recreated in us-west-2
```bash
# Delete from us-east-1
aws ecr delete-repository --repository-name athena-mcp --region us-east-1 --force

# Create in us-west-2
aws ecr create-repository --repository-name athena-mcp --region us-west-2 --image-scanning-configuration scanOnPush=true
```

### Final ECR Repository
```
Repository URI: 628203515088.dkr.ecr.us-west-2.amazonaws.com/athena-mcp
```

---

## 5. S3 Bucket for Source Code

### Initial Attempt - Failed (Name Conflict)
```bash
aws s3 mb s3://athena-mcp-source-628203515088 --region us-west-2
# Error: OperationAborted - bucket name conflict from recently deleted bucket
```

### Created with Different Name
```bash
aws s3 mb s3://athena-mcp-build-628203515088 --region us-west-2
# Output: make_bucket: athena-mcp-build-628203515088
```

---

## 6. IAM Roles and Policies

### 6.1 CodeBuild Role

**Trust Policy (iam/codebuild-trust-policy.json):**
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

**Permissions Policy (iam/codebuild-policy.json):**
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
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
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

**Commands:**
```bash
# Create role
aws iam create-role --role-name codebuild-athena-mcp-role --assume-role-policy-document file://iam/codebuild-trust-policy.json

# Attach policy
aws iam put-role-policy --role-name codebuild-athena-mcp-role --policy-name codebuild-athena-mcp-policy --policy-document file://iam/codebuild-policy.json
```

### 6.2 App Runner ECR Access Role

**Trust Policy (iam/apprunner-trust-policy.json):**
```json
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
```

**Commands:**
```bash
# Create role
aws iam create-role --role-name apprunner-athena-mcp-ecr-role --assume-role-policy-document file://iam/apprunner-trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy --role-name apprunner-athena-mcp-ecr-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

### 6.3 App Runner Instance Role (for Bedrock Access)

**Trust Policy (iam/apprunner-instance-trust-policy.json):**
```json
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
```

**Permissions Policy (iam/apprunner-instance-policy.json):**
```json
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
```

**Commands:**
```bash
# Create role
aws iam create-role --role-name apprunner-athena-mcp-instance-role --assume-role-policy-document file://iam/apprunner-instance-trust-policy.json

# Attach policy
aws iam put-role-policy --role-name apprunner-athena-mcp-instance-role --policy-name bedrock-access-policy --policy-document file://iam/apprunner-instance-policy.json
```

---

## 7. CodeBuild Project

### Project Configuration (iam/codebuild-project.json)
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

**Command:**
```bash
aws codebuild create-project --cli-input-json file://iam/codebuild-project.json --region us-west-2
```

---

## 8. Building and Pushing Docker Image

### 8.1 Package Source Code
```bash
# Remove old zip if exists
rm -f source.zip

# Create archive from git (excludes uncommitted files)
git archive --format=zip --output=source.zip HEAD
```

### 8.2 Upload to S3
```bash
aws s3 cp source.zip s3://athena-mcp-build-628203515088/source.zip --region us-west-2
```

### 8.3 Start CodeBuild
```bash
aws codebuild start-build --project-name athena-mcp-build --region us-west-2 --query 'build.id' --output text
# Returns build ID like: athena-mcp-build:5831056a-15e9-4c3f-9cc5-0731ce9388a9
```

### 8.4 Check Build Status
```bash
aws codebuild batch-get-builds --ids <BUILD_ID> --region us-west-2 --query 'builds[0].{status:buildStatus,phase:currentPhase}' --output table
```

### 8.5 Check Build Logs (if failed)
```bash
# Get phase details
aws codebuild batch-get-builds --ids <BUILD_ID> --region us-west-2 --query 'builds[0].phases[*].{phase:phaseType,status:phaseStatus,message:contexts[0].message}' --output table

# Get CloudWatch logs (use MSYS_NO_PATHCONV=1 on Windows Git Bash)
MSYS_NO_PATHCONV=1 aws logs filter-log-events --log-group-name "/aws/codebuild/athena-mcp-build" --log-stream-names "<BUILD_ID>" --filter-pattern "error" --region us-west-2 --query 'events[*].message'
```

---

## 9. App Runner Service

### 9.1 Service Configuration (iam/apprunner-service.json) - FINAL WORKING VERSION
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
          "DATABASE_URL": "postgresql://neondb_owner:npg_W5NGyuRSvnP9@ep-dawn-dawn-ahtikapa-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require",
          "KEY_ENCRYPTION_SECRET": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
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

### 9.2 Create Service
```bash
aws apprunner create-service --cli-input-json file://iam/apprunner-service.json --region us-west-2
```

### 9.3 Check Service Status
```bash
aws apprunner list-services --region us-west-2 --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].{Status:Status,URL:ServiceUrl}' --output table
```

### 9.4 Delete Service (if needed to recreate)
```bash
# Get service ARN
SERVICE_ARN=$(aws apprunner list-services --region us-west-2 --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].ServiceArn' --output text)

# Delete service
aws apprunner delete-service --service-arn $SERVICE_ARN --region us-west-2
```

### 9.5 Check App Runner Logs
```bash
# List log groups
MSYS_NO_PATHCONV=1 aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner/athena-mcp" --region us-west-2 --query 'logGroups[*].logGroupName'

# Get service events (replace SERVICE_ID with actual ID)
MSYS_NO_PATHCONV=1 aws logs get-log-events --log-group-name "/aws/apprunner/athena-mcp/<SERVICE_ID>/service" --log-stream-name "events" --region us-west-2 --limit 20 --query 'events[*].message'
```

---

## 10. Errors Encountered and Fixes

### Error 1: S3 Access Denied in CodeBuild
**Error:**
```
AccessDenied: User is not authorized to perform: s3:GetObject on resource: "arn:aws:s3:::athena-mcp-build-628203515088/source.zip"
```

**Fix:** Added S3 bucket to CodeBuild IAM policy:
```json
"Resource": [
  "arn:aws:s3:::codebuild-*/*",
  "arn:aws:s3:::athena-mcp-build-628203515088/*"
]
```

### Error 2: Docker Hub Rate Limiting
**Error:**
```
429 Too Many Requests - toomanyrequests: You have reached your unauthenticated pull rate limit
```

**Fix:** Changed Dockerfile to use ECR Public Registry:
```dockerfile
# Before (Docker Hub)
FROM node:20-alpine AS deps

# After (ECR Public)
FROM public.ecr.aws/docker/library/node:20-alpine AS deps
```

### Error 3: TypeScript Build Error - toolCall.args
**Error:**
```
Type error: Property 'args' does not exist on type 'TypedToolCall<ToolSet>'
```

**Fix:** Added type assertion in all chat route files:
```typescript
// Before
input: toolCall.args,

// After
input: (toolCall as Record<string, unknown>).args ?? {},
```

### Error 4: TypeScript Build Error - toolResult.result
**Error:**
```
Type error: Property 'result' does not exist on type 'TypedToolResult<ToolSet>'
```

**Fix:** Added type assertion:
```typescript
// Before
output: toolResult?.result,

// After
output: toolResult ? (toolResult as Record<string, unknown>).result : undefined,
```

### Error 5: Prisma Client Not Found at Runtime
**Error:**
```
Cannot find module './lib/generated/prisma/client'
```

**Fix:** Added copy command in Dockerfile:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated
```

### Error 6: .prisma Folder Does Not Exist
**Error:**
```
failed to calculate checksum: "/app/node_modules/.prisma": not found
```

**Fix:** Removed the non-existent folder copy from Dockerfile. Prisma client is in `lib/generated`, not `node_modules/.prisma`.

### Error 7: Health Check Failed - App Not Accessible
**Error:**
```
Health check failed on protocol `HTTP`[Path: '/'], [Port: '3000']
```

**Cause:** Next.js standalone server binds to localhost by default, not accessible externally.

**Fixes Applied:**
1. Set `HOSTNAME=0.0.0.0` in Dockerfile
2. Set `HOSTNAME=0.0.0.0` in App Runner RuntimeEnvironmentVariables
3. Changed health check from HTTP to TCP

```json
"HealthCheckConfiguration": {
  "Protocol": "TCP",  // Changed from "HTTP"
  "Interval": 10,
  "Timeout": 5,
  "HealthyThreshold": 1,
  "UnhealthyThreshold": 5
}
```

---

## 11. Final Working Configuration

### Live URL
```
https://nbi29huvfv.us-west-2.awsapprunner.com
```

### AWS Resources
| Resource | Name | ARN/URI |
|----------|------|---------|
| ECR Repository | athena-mcp | 628203515088.dkr.ecr.us-west-2.amazonaws.com/athena-mcp |
| S3 Bucket | athena-mcp-build-628203515088 | s3://athena-mcp-build-628203515088 |
| CodeBuild Project | athena-mcp-build | arn:aws:codebuild:us-west-2:628203515088:project/athena-mcp-build |
| CodeBuild Role | codebuild-athena-mcp-role | arn:aws:iam::628203515088:role/codebuild-athena-mcp-role |
| App Runner ECR Role | apprunner-athena-mcp-ecr-role | arn:aws:iam::628203515088:role/apprunner-athena-mcp-ecr-role |
| App Runner Instance Role | apprunner-athena-mcp-instance-role | arn:aws:iam::628203515088:role/apprunner-athena-mcp-instance-role |
| App Runner Service | athena-mcp | nbi29huvfv.us-west-2.awsapprunner.com |

### Critical Configuration Points
1. **Dockerfile**: Use `public.ecr.aws` images, set `HOSTNAME=0.0.0.0`
2. **App Runner**: Use TCP health check, include `HOSTNAME=0.0.0.0` in env vars
3. **CodeBuild**: Enable `privilegedMode: true` for Docker builds
4. **IAM**: Ensure S3 bucket is in CodeBuild policy

---

## 12. Redeployment Quick Reference

### Full Redeployment (New Code)
```bash
# 1. Run local build to check for errors
npm run build

# 2. Commit changes
git add -A
git commit -m "Your commit message"

# 3. Package and upload
rm -f source.zip
git archive --format=zip --output=source.zip HEAD
aws s3 cp source.zip s3://athena-mcp-build-628203515088/source.zip --region us-west-2

# 4. Start CodeBuild
BUILD_ID=$(aws codebuild start-build --project-name athena-mcp-build --region us-west-2 --query 'build.id' --output text)
echo "Build ID: $BUILD_ID"

# 5. Check build status (repeat until SUCCEEDED)
aws codebuild batch-get-builds --ids $BUILD_ID --region us-west-2 --query 'builds[0].buildStatus' --output text

# 6. Deploy to App Runner
SERVICE_ARN=$(aws apprunner list-services --region us-west-2 --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].ServiceArn' --output text)
aws apprunner start-deployment --service-arn $SERVICE_ARN --region us-west-2

# 7. Check deployment status (repeat until RUNNING)
aws apprunner list-services --region us-west-2 --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].Status' --output text
```

### Quick Status Check
```bash
# CodeBuild status
aws codebuild list-builds-for-project --project-name athena-mcp-build --region us-west-2 --max-items 1

# App Runner status
aws apprunner list-services --region us-west-2 --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].{Status:Status,URL:ServiceUrl}' --output table
```

### Rollback (If Deployment Fails)
```bash
# App Runner automatically keeps previous version
# Check operations history
SERVICE_ARN=$(aws apprunner list-services --region us-west-2 --query 'ServiceSummaryList[?ServiceName==`athena-mcp`].ServiceArn' --output text)
aws apprunner list-operations --service-arn $SERVICE_ARN --region us-west-2
```

---

## Git Commits Made During Deployment

```
fd0e954 - Add Docker and AWS deployment configuration
7a6bb23 - Use ECR public registry for Docker base images
3b95e20 - Fix TypeScript error with toolCall.args property
6ef12b8 - Fix TypeScript error with toolResult.result property
b025318 - Fix Dockerfile to include Prisma generated client
dca8601 - Fix Dockerfile - remove non-existent .prisma folder copy
bbe37fe - Fix Docker: set HOSTNAME=0.0.0.0 for external access
1073574 - Add comprehensive deployment documentation
```

---

## Estimated Monthly Costs

| Service | Cost |
|---------|------|
| CodeBuild | Free (100 build min/month free tier) |
| ECR | ~$0.10/GB storage |
| App Runner | ~$5-15 (auto-scales, pauses when idle) |
| S3 | ~$0.02/GB |
| **Total** | **~$5-15/month** (light usage) |

---

## Support Contacts

- **AWS Documentation**: https://docs.aws.amazon.com/apprunner
- **Next.js Standalone**: https://nextjs.org/docs/app/api-reference/next-config-js/output
- **Prisma**: https://www.prisma.io/docs
- **Neon PostgreSQL**: https://neon.tech/docs

---

*Document created: January 31, 2026*
*Last successful deployment: January 31, 2026*
*Live URL: https://nbi29huvfv.us-west-2.awsapprunner.com*
