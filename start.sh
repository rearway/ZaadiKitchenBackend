#!/bin/sh
set -e

echo "Starting database migrations..."
npx sequelize-cli db:migrate

echo "Migrations completed. Starting application..."
node dist/main.js
