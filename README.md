## development
Requirements:

* nodejs at least version 12
* docker to run a mongdb database
* mongo client to access the database from command lines

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