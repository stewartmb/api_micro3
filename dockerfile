FROM node:18-alpine
WORKDIR /programas/API-Node
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8003
CMD ["npm", "start"]
