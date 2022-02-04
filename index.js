const assert = require("assert");
const NODE_VERSION = process.version.match(/^v(\d+)\..*/)[1];
assert(NODE_VERSION >= 12);
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const user = require("./route/user"); //new addition
const InitiateMongoServer = require("./config/db");

InitiateMongoServer();

const server = express();

const corsOptions = {
    origin: "http://localhost:8081"
  };

server.use(cors(corsOptions));

// parse requests of content-type - application/json
server.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
server.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4000;

server.get("/", (req, res) => {
  res.json({ message: "Welcome to MatbIt" });
});

/**
 * Router Middleware
 * Router - /user/*
 * Method - *
 */
server.use("/user", user);

server.listen(PORT, (req, res) => {
  console.log(`Server Started http://localhost:${PORT}/`);
});
