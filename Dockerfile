# Use Node LTS image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the code
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["npm", "start"]