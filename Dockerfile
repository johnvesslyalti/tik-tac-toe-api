# Use official Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only dependency files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the code
COPY . .

# Expose app port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]