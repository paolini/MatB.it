## development
Requirements:

* nodejs at least version 12
* docker to run a mongodb database
* mongo client to access the database from command line

Use docker to setup a database for local development.
The following command will start a mongodb server in a container using the local folder `/database` to store data permanently and exposing to the default port for mongo:
```bash
    docker-compose up -d
```
Use `docker-compose down` to stop the container. Use `mongo` to access the database.

To install node libraries:
```bash
    npm install
```
To start the server:
```bash
    npm start
```

Change version number in `package.json`.

### import firebase data

```bash
npx -p node-firestore-import-export firestore-export -a matbit-5e23b34aa561.json -b backup.json
node import.js
```

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
```