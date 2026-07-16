FROM node:24-alpine

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose server port
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
