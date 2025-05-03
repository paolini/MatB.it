## development
Requirements:

* a mongodb database

Use docker to setup a database for local development.
The following command will start a mongodb server in a container using the local folder `/database` to store data permanently and exposing to the default port for mongo:
```bash
    docker-compose up -d
```
Use `docker-compose down` to stop the container. Use `mongo` to access the database.

To install node libraries:
```bash
    npm ci
```
To start the server locally:
```bash
    npm run dev
```

Change version number in `package.json`.

## create docker image

```bash
docker build . -t paolini/matbit
docker tag paolini/matbit paolini/matbit:1.2.3
docker push paolini/matbit
```

## deployment

create a `docker-compose.yml` starting from the template `docker-deploy.yml`.
Set a custom `SECRET`. Get your google keys.

To start the service:
```bash
docker-compose up -d
```

To update the image:
```bash
docker-compose pull matbit
docker-compose up -d
```This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

