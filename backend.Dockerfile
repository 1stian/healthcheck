FROM node:18-alpine

WORKDIR /app

# Copy backend code
COPY backend ./backend

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Set up database
RUN npm run db:generate

# Expose port
EXPOSE 3000

# Start backend
CMD ["npm", "run", "dev"]
