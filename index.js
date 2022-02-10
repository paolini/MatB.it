const assert = require("assert");
const NODE_VERSION = process.version.match(/^v(\d+)\..*/)[1];
assert(NODE_VERSION >= 12);
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");

const user = require("./route/user");
const InitiateMongoServer = require("./config/db");
const mongoose = require("mongoose");

const Note = require("./model/Note");
const User = require("./model/User");

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

// serve static files from directory "html"
server.use(express.static("html"));

const PORT = process.env.PORT || 4000;

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
        query.author = req.user;
      }
      Note
        .aggregate([
          { $match: query},
          { $sort: { "created_on": -1}},
          AUTHOR_LOOKUP,
          AUTHOR_UNWIND,
          NOTE_PROJECT
        ], (err, notes) => {
          console.log(notes);
          res.json({data: {notes: notes}});
        });
    } catch(error) {
      console.log("loading notes error: " + String(error));
      console.dir(error);
      res.status(error.status || 500).json({error: String(error)});
    }
  });
  
async function get_note_full(note_id) {
  console.log(note_id);
  const MATCH = { $match: (note_id.length == 20)
    ? { firebase_id: note_id}
    : { _id: mongoose.Types.ObjectId(note_id)}};
  const data = (await Note.aggregate([
    MATCH,
    AUTHOR_LOOKUP, 
    AUTHOR_UNWIND, 
    NOTE_PROJECT
  ]).exec())[0];
  console.log("return");
  console.log(data);
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

server.listen(PORT, (req, res) => {
  console.log(`Server Started http://localhost:${PORT}/`);
});
