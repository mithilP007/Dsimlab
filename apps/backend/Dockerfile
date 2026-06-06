# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build TypeScript and generate Prisma Client
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

# Stage 3: Production runtime environment
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files and generated Prisma Client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY src/prisma ./src/prisma

# Create uploads directory for certificate generation
RUN mkdir -p uploads/certificates

# Expose port (default 5000)
ENV PORT=5000
EXPOSE 5000

# Start application using Node
CMD ["node", "dist/index.js"]
