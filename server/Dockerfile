FROM node:18-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5016

CMD ["npm", "start"]
