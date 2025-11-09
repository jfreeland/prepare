FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

ENV REACT_APP_API_URL=https://api.prepare.run

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["sh", "-c", "ulimit -n 65536 && nginx -g 'daemon off;'"]
