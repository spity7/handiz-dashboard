# Step 1: Build React app with vite
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install

ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_ALLOWED_RETURN_ORIGINS
ARG VITE_HANDIZ_WEBSITE_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_ALLOWED_RETURN_ORIGINS=$VITE_ALLOWED_RETURN_ORIGINS
ENV VITE_HANDIZ_WEBSITE_URL=$VITE_HANDIZ_WEBSITE_URL

COPY . .

RUN npm run build

# Step 2: Serve with NGINX
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
