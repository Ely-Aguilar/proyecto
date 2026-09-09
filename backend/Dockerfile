FROM node:22

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install --package-lock=false

COPY . .

EXPOSE 5000

CMD ["npm", "start"]