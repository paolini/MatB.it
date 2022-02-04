const assert = require("assert");
const NODE_VERSION = process.version.match(/^v(\d+)\..*/)[1];
assert(NODE_VERSION >= 12);
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");

const user = require("./route/user");
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

[
    'index.css', 
    'app.js', 
    'dashboard.js',
    'list.js',
    'note.js'
].forEach(path => 
    server.get('/' + path, (req, res) => {
        fs.readFile("./html/" + path, "utf8", (err, data) => {
            if (err) {
                throw err;
            }
            res.send(data);
        });
    }));
    
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
  
server.get('/api/v0/note', async (req, res) => {
    try {
      var notes = [];
      var authors = {};
      var query = db.collection('notes');
      console.log("query");
      console.dir(req.query);
      if (req.query.hasOwnProperty("private")) {
        if (!req.user) {
          throw new ForbiddenError("authentication needed to list private notes");
        }
        const uid = req.user.uid;
        query = query.where("private", "==", true).where("author_uid", "==", uid)
      } else {
        query = query.where("private", "==", false);
      }
      query = await query.orderBy('created_on','desc').get();
      query.forEach(doc => {
          const data = doc.data();
          notes.push({
              id: doc.id,
              title: data.title,
              author_uid: data.author_uid,
              created_on: data.created_on.toDate(),
              updated_on: data.updated_on.toDate()
            });
          if (data.author_uid !== null) {
            authors[data.author_uid] = db.doc('users/' + data.author_uid);
          }
        });
      const values = Object.values(authors);
      var users = values.length ? await db.getAll(...values) : [];
      const keys = Object.keys(authors);
      for(var i=0; i<keys.length; i++) {
        authors[keys[i]] = users[i];
      }
      notes.forEach(note => {
        if (note.author_uid !== null) {
          note.author_name = authors[note.author_uid].data().displayName;
        } else {
          note.author_name = "";
        }
      });
      return res.json({data: {notes: notes}});
    } catch(error) {
      console.log("loading notes error: " + String(error));
      console.dir(error);
      return res.status(error.status || 500).json({error: String(error)});
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
