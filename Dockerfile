FROM node:22-alpine

WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY data ./data
COPY lib ./lib

ENV NODE_ENV=production
ENV PORT=8080
# Team state (users, sessions, creator labels, activity log) is persisted to
# $STATE_DIR/state.json. Mount a volume here so it survives redeploys.
ENV STATE_DIR=/app/state
RUN mkdir -p /app/state
EXPOSE 8080

CMD ["node", "server.js"]
