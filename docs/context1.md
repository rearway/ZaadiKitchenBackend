# Zaadi Kitchen Backend: Authentication & Infrastructure Context

This document summarizes the recent architectural decisions, bug fixes, and infrastructure improvements made to the Zaadi Kitchen backend. It serves as a context handoff for new developers or future AI interactions.

## 1. AWS Infrastructure & Terraform (Dev/Prod Environments)

The entire backend infrastructure is provisioned as Infrastructure as Code (IaC) using Terraform, primarily configured in `/infra/main.tf` and parameterized via `terraform.tfvars`.

### Current AWS Architecture
- **Compute (ECS Fargate)**: The NestJS Docker container is deployed to AWS ECS Fargate, providing a serverless container execution environment.
- **Database (RDS)**: A private Amazon RDS instance running PostgreSQL 15. It is isolated within a private subnet and inaccessible from the public internet.
- **Networking**: VPC with public and private subnets. The ALB sits in the public subnet routing traffic to ECS containers in the private subnets.
- **Load Balancing (ALB)**: An Application Load Balancer routes traffic to the ECS tasks on port 3000.
- **SSL / HTTPS (ACM)**: An AWS Certificate Manager (ACM) wildcard certificate (`*.zaadikitchen.com`) is provisioned. *Note: SSL validation via GoDaddy DNS is pending. Currently, traffic runs over HTTP locally, but will require HTTPS for production APIs.*

### Terraform State & Configuration Updates
- **Database Credentials**: The `DB_PASSWORD` in `terraform.tfvars` must precisely match the manually set password in the RDS console.
- **Database Connection (SSL)**: 
  - **Issue**: ECS instances were failing to connect to RDS with `no pg_hba.conf entry / no encryption` errors.
  - **Fix**: Added a strict `DB_SSL="true"` environment variable in Terraform. Updated the `database.module.ts` to explicitly inject `ssl: { require: true, rejectUnauthorized: false }` into the `dialectOptions` whenever `DB_SSL` is enabled.

## 2. CI/CD Deployment Pipeline

The deployment process is fully automated via GitHub Actions (`.github/workflows/deploy.yml`).

- **Trigger**: Any push to the `dev` or `main` branches.
- **Build**: Compiles the NestJS code and packages it into a multi-stage Docker image using `/backend/Dockerfile`.
- **Push**: Authenticates with AWS ECR and pushes the tagged Docker image.
- **Deploy**: Issues a command to the AWS ECS Service to force a new deployment, pulling the latest ECR image and gracefully rolling over the containers.

## 3. Automated Database Migrations
- **Issue**: Deployments via GitHub Actions were updating the codebase but leaving the database schema behind because migrations were not automated.
- **Fix**: 
  - Introduced a `start.sh` script to run `npx sequelize-cli db:migrate` directly before starting the NestJS application (`node dist/main.js`).
  - Updated the multi-stage `Dockerfile` to copy the `src/infrastructure/SequelizePersistence/migrations` directory into the production image, ensuring the `sequelize-cli` has access to the actual migration files at runtime.
  - Updated `.sequelizerc.js` to inherit the `DB_SSL` flag so migrations also connect over secure SSL when running in ECS.

## 4. Sequelize & TypeScript Fixes

### Model Property Shadowing (Critical Fix)
- **Issue**: A severe bug caused database values to evaluate to `undefined` or `NaN` inside the application (e.g., `model.attemptCount + 1` returning `NaN` or `session.code` reading as `undefined`), despite the database queries returning correct data.
- **Root Cause**: Modern TypeScript compiles class properties (e.g., `code: string`) into native public fields initialized to `undefined`. This shadows and overwrites `sequelize-typescript`'s internal getters and setters.
- **Fix**: Refactored `OtpSessionModel`, `UserModel`, and `RefreshTokenModel` to use the `declare` keyword on all non-inherited attributes (e.g., `declare code: string;`). This signals TypeScript to omit the property from the emitted Javascript, allowing Sequelize to map the properties correctly. 
- **Best Practice**: **All future Sequelize models MUST use the `declare` keyword for their columns.**

### Atomic Operations
- Swapped Javascript-based incrementing (`model.update({ attemptCount: model.attemptCount + 1 })`) for native database atomic operations (`model.increment('attemptCount')`) inside the `OtpSessionPersistenceService` to prevent race conditions and type errors.

## 5. Role-Based Access Control (RBAC) & Authentication Flow

We implemented strict role boundaries in the authentication gateways (`VerifyOtp.ts` and `AdminLogin.ts`). 

### The Rules
1. **CUSTOMER**: Uses Phone + OTP. If a new phone number verifies an OTP, they are automatically registered as a `CUSTOMER`.
2. **DRIVER**: Uses Phone + OTP. Drivers **cannot register themselves**. An Admin must pre-create the driver in the database with `role: 'DRIVER'`. When that specific phone number verifies an OTP, the system logs them in and grants them their existing driver privileges.
3. **ADMIN & OPS**: Uses Email + Password. They **cannot use OTP**. They log in exclusively via the `/api/v1/auth/admin/login` endpoint.

### Swagger Documentation
- **Issue**: The Swagger UI was failing to display the JSON body parameters (DTOs) for the `/otp/send`, `/otp/verify`, and `/admin/login` endpoints.
- **Fix**: Removed the inline `@Body(ValidationPipe)` from the `auth.controller.ts`. NestJS was already enforcing validation globally in `main.ts`, and the inline declaration was breaking Swagger's reflection mechanism.

## 6. Local Testing Setup
A fully configured Postman collection (`Zaadi_Kitchen_API.postman_collection.json`) is now located in the backend root directory. It features:
- Pre-configured requests for all Auth flows.
- Automated test scripts that extract the JWT `accessToken` from successful logins and inject it globally into all subsequent API requests via Bearer Auth. 

To test locally, seed the local Postgres database with test accounts manually or via SQL scripts, ensuring Driver, Admin, and Ops accounts exist before attempting to log in.
