FROM node:24-bookworm

# Install FFMPEG
RUN apt update
RUN apt install ffmpeg -y

# Copy and setup app
WORKDIR /app

COPY package.json ./

RUN npm install

RUN npm install -g typescript

COPY . ./
RUN npm run build
RUN npm run swagger

# Expose ports
EXPOSE 80

# Start
CMD ["npm", "start"]
