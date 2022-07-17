# to build the image:
# $ docker build . -t paolini/matbit

FROM node:latest

WORKDIR /app

COPY . ./

RUN npm ci

RUN date > date.txt

EXPOSE 4000/tcp

## /wait waits for mongodb to be ready
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

ENTRYPOINT [ "./entrypoint.sh" ]
