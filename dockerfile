FROM node:18-alpine
WORKDIR /programas/api_micro3
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8013
CMD ["npm", "start"]
