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

## configuration

Use environment variables.
```
MONGODB_URI=mongodb://127.0.0.1:27017/matbit
```

Environment variables can also be put in a `.env` file
in the root directory.

## migrations

See also `package.json` for script shortcuts.

Status:
```
npx migrate-mongo status
```
create a migration:
```
npx migrate-mongo create nome-della-migrazione
```
apply migrations:
```
npx migrate-mongo up
```
revert last migration:
```
npx migrate-mongo down
```

## deployment

create a `docker-compose.yml` starting from the template `docker-deploy.yml`.
Set a custom `SECRET`. Get your google keys.
Configure environment variables.

To start the service:
```bash
docker-compose up -d
```

To update the image:
```bash
docker-compose pull matbit
docker-compose up -d
```
