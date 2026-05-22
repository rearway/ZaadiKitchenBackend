#!/bin/sh
set -e

echo "Starting database migrations..."
npx sequelize-cli db:migrate

echo "Running database seeders..."
npx sequelize-cli db:seed:all

echo "Migrations and seeds completed. Starting application..."
node dist/main.js

