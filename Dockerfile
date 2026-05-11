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
COPY --from=builder /app/start.sh ./
RUN chmod +x start.sh

# Install ONLY production dependencies to keep image small
# Also install sequelize-cli globally or locally so migrations can run
RUN npm ci --only=production && npm install sequelize-cli pg pg-hstore

# Expose the port (must match PORT in env and Terraform config)
EXPOSE 3000

# Start command
CMD ["sh", "start.sh"]
