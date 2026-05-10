FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including dev) to build
COPY package*.json ./
RUN npm ci

# Copy source code and config files
COPY . .

# Build the NestJS application
RUN npm run build

# Second stage: production image
FROM node:18-alpine

WORKDIR /app

# Only copy the production build and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.sequelizerc ./
COPY --from=builder /app/.sequelizerc.js ./

# Install ONLY production dependencies to keep image small
RUN npm ci --only=production

# Expose the port (must match PORT in env and Terraform config)
EXPOSE 3000

# Start command
CMD ["node", "dist/main.js"]
