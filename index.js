const assert = require("assert");
const NODE_VERSION = process.version.match(/^v(\d+)\..*/)[1];
assert(NODE_VERSION >= 12);
require('dotenv').config()
// console.log(process.env) // check environment variables
const path = require('path');
const express = require("express");
const passport = require('passport');
const morgan = require('morgan'); // logger
const session = require('express-session');
const createError = require('http-errors');
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const MONGOURI = "mongodb://localhost/matbit";

console.log("connecting to " + MONGOURI);
mongoose.connect(MONGOURI, {
    useNewUrlParser: true
  }, 
  err => {
    if (err) {
      console.log(err);
      exit(1);
    }
    console.log("Successfully connected to database " + MONGOURI);
    main()
  });

async function main() {
  const user = require("./route/user");
  const Note = require("./model/Note");
  const User = require("./model/User");

  const server = express();
  
  server.use(morgan('tiny')); // log requests to stdout

  server.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({client: mongoose.connection.client})
  }));

  const corsOptions = {
    origin: "http://localhost:8081"
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
  
  server.get("/api", (req, res) => {
    res.json({ message: "Welcome to MatbIt" });
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

  server.get('/api/v0/user', async (req, res) => {
    res.json({'user': req.user});
  });
    
  const AUTHOR_LOOKUP = {$lookup: {
      from: "users",
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'}};

  const AUTHOR_UNWIND = {$unwind: "$author"};
  const AUTHOR_PROJECT = {$project: 
    {email: 0, emailVerified: 0, pro: 0}};
  const NOTE_PROJECT = {$project: {
    "author": AUTHOR_PROJECT.$project
  }}


  server.get('/api/v0/note', async (req, res) => {
      try {
        var authors = {};
        var query = {
          private: false,
        };
  //      console.log("query");
  //      console.dir(req.query);
        if (req.query.hasOwnProperty("private")) {
          if (!req.user) {
            throw new ForbiddenError("authentication needed to list private notes");
          }
          const uid = req.user.uid;
          query.private = true;
          query.author_id = req.user._id;
        }
        Note
          .aggregate([
            { $match: query},
            { $sort: { "created_on": -1}},
            AUTHOR_LOOKUP,
            AUTHOR_UNWIND,
            NOTE_PROJECT
          ], (err, notes) => {
            // console.log(notes);
            res.json({data: {notes: notes}});
          });
      } catch(error) {
        console.log("loading notes error: " + String(error));
        console.dir(error);
        res.status(error.status || 500).json({error: String(error)});
      }
    });
    
  async function get_note_full(note_id) {
    // console.log(note_id);
    const MATCH = { $match: (note_id.length == 20)
      ? { firebase_id: note_id}
      : { _id: mongoose.Types.ObjectId(note_id)}};
    const data = (await Note.aggregate([
      MATCH,
      AUTHOR_LOOKUP, 
      AUTHOR_UNWIND, 
      NOTE_PROJECT
    ]).exec())[0];
    // console.log(data);
    return data;
  }

  server.get('/api/v0/note/:id', (req, res) => {
    try {
      return get_note_full(req.params.id)
        .then(note => {
          return res.json({note: note});
        });
    } catch (err) {
      return res.json({error: err})
    }
  });

  server.get('/note/:id', (req, res) => {
      render('<note-item :user="user"></note-item>', (html) => {
          res.send(html);
      });
  });  

  // catch 404 and forward to error handler
  server.use(function(req, res, next) {
    next(createError(404));
  });

  // error handler
  server.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  // listen
  const PORT = process.env.PORT || 4000;

  server.listen(PORT, (req, res) => {
    console.log(`Server Started http://localhost:${PORT}/`);
  });

  return server;
}