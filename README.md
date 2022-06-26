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
    node index.js
```

### import firebase data

```bash
npx -p node-firestore-import-export firestore-export -a matbit-5e23b34aa561.json -b backup.json
node import.js
```

