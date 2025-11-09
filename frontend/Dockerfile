FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

ARG REACT_APP_GOOGLE_API_KEY
ARG REACT_APP_GOOGLE_CLIENT_ID

ENV REACT_APP_API_URL=https://api.prepare.run
ENV REACT_APP_GOOGLE_API_KEY=$REACT_APP_GOOGLE_API_KEY
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["sh", "-c", "ulimit -n 65536 && nginx -g 'daemon off;'"]
