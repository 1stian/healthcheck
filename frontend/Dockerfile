FROM node:18-alpine

WORKDIR /app

# Copy frontend code
COPY . .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5173

# Start frontend
CMD ["npm", "run", "dev", "--", "--host"]
