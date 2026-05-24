FROM node:{{.NodeVersion}}-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE {{.AppPort}}

CMD ["npm", "run", "dev"]
