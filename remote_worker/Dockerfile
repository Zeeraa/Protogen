FROM node:24-trixie AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-trixie AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/swagger.json ./swagger.json

# Expose ports
EXPOSE 80

# Start
CMD ["npm", "start"]
