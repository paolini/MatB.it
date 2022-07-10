const assert = require("assert");
const NODE_VERSION = process.version.match(/^v(\d+)\..*/)[1];
assert(NODE_VERSION >= 12);
// console.log(process.env) // check environment variables
const path = require('path');
const express = require("express");
const passport = require('passport');
const morgan = require('morgan'); // logger
const session = require('express-session');
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

const config = require("./config")

const MongoStore = require('connect-mongo');

console.log("connecting to " + config.MONGO_URI);
mongoose.connect(config.MONGO_URI, {
    useNewUrlParser: true
  }, 
  err => {
    if (err) {
      console.log(err);
      exit(1);
    }
    console.log("Successfully connected to database " + config.MONGO_URI);
    main()
  });

async function main() {
  const user = require("./route/user");

  const server = express();
  
  server.use(morgan('tiny')); // log requests to stdout

  server.use(session({
    secret: config.SECRET,
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({client: mongoose.connection.client})
  }));

  const corsOptions = {
    origin: config.URI
  };

  server.use(cors(corsOptions));

  // parse requests of content-type - application/json
  server.use(express.json());

  // parse requests of content-type - application/x-www-form-urlencoded
  server.use(express.urlencoded({ extended: true }));

  // serve static files from directory "html"
  server.use(express.static(path.join(__dirname, "html")));

  // view engine setup
  server.set('views', path.join(__dirname, 'templates'));
  server.set('view engine', 'ejs');  
  
  server.use(passport.initialize());
  server.use(passport.session());

  const { exit } = require("process");

  
  var authRouter = require('./route/auth')(express, passport);
  server.use('/', authRouter);
  
  server.get('/login', (req, res) => res.render('login.ejs'))
  
  server.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
  });
  
  server.use("/api/v0", require("./api"))

  server.get('/note/:id', (req, res) => {
    render('<note-item :user="user"></note-item>', (html) => {
        res.send(html);
    });
  });  

/**
   * Router Middleware
   * Router - /user/*
   * Method - *
   */
  server.use("/user", user);

  function render(body, callback) {
      fs.readFile("./html/main.html", "utf8", (err, data) => {
          if (err) {
            throw err;
          }
          data = data.replace('{{{ body }}}', body);
          callback(data);
      });
    }
    
  server.get('/', (req, res) => {
      //  console.log('Signed-in user:', req.user);
      render("<dashboard></dashboard>", (html) => {
          res.send(html);
      });
  });

  server.get('/tos', (req, res) => {
      fs.readFile("./tos.html", "utf8", (err, data) => {
          if (err) {
              throw err;
          }
          render(data, (html) => { 
              res.send(html);
          });
      });
  });

  server.get('/privacy', (req, res) => {
      fs.readFile("./privacy.html", "utf8", (err, data) => {
          if (err) {
              throw err;
          }
          render(data, (html) => { 
              res.send(html);
          });
      });
  });

  server.listen(config.PORT, (req, res) => {
    console.log(`Server Started ${config.URI}`);
  });

  return server;
}