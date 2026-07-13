#!/bin/sh
set -e

echo "Applying pending Prisma migrations..."
npx prisma migrate deploy --schema=./api/prisma/schema.prisma

echo "Starting server..."
exec node api
