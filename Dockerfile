# to build the image:
# $ docker build . -t paolini/matbit

FROM node:22-alpine AS base

# Install mongodump
# RUN apk add --no-cache mongodb-tools

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
#COPY start.sh ./start.sh
# ENV NEXTAUTH_SECRET=dummysecret
RUN npm run build
# Use the production dependency tree instead of the traced module subset.
RUN rm -rf ./.next/standalone/node_modules

# Keep build tools out of the runtime dependencies.
FROM deps AS production-deps
RUN npm prune --omit=dev

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Copia anche node_modules per tool CLI
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Include the complete production tree, including migration tools.
COPY --from=production-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
#COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/migrate-mongo-config.js ./migrate-mongo-config.js
RUN chmod +x ./entrypoint.sh
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["./entrypoint.sh"]
