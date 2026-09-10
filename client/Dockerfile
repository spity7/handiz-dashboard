# Step 1: Build React app with vite
FROM node:18-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=https://api.handiz.org/api/v1/
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_ALLOWED_RETURN_ORIGINS=https://handiz.org,https://www.handiz.org,https://learn.handiz.org
ARG VITE_HANDIZ_WEBSITE_URL=https://handiz.org
ARG VITE_LMS_SITE_URL=https://learn.handiz.org
ARG VITE_GA_MEASUREMENT_ID=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_ALLOWED_RETURN_ORIGINS=${VITE_ALLOWED_RETURN_ORIGINS}
ENV VITE_HANDIZ_WEBSITE_URL=${VITE_HANDIZ_WEBSITE_URL}
ENV VITE_LMS_SITE_URL=${VITE_LMS_SITE_URL}
ENV VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Step 2: Serve with NGINX
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
