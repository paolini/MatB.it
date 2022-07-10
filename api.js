const express = require("express") 
const createError = require('http-errors')
const mongoose = require("mongoose");
// const helmet = require("helmet")

const Note = require("./model/Note");
const User = require("./model/User");

var server = express.Router()

module.exports = server

// server.use(helmet())

function can_read_note(user, note) {
  return !note.private || !note.author_id || (user && user._id.equals(note.author_id))
}

function can_create_note(user) {
  return true
}

function can_write_note(user, note) {
  return !note.author_id || (user && user._id.equals(note.author_id))
}

function can_delete_note(user, note) {
  return can_write_note(user, note)
}

server.get("/", (req, res) => {
    res.json({ message: "Welcome to MatbIt" });
  });

  server.get('/user', async (req, res) => {
    console.log(`get user: ${JSON.stringify(req.user)}`)
    res.json({'user': req.user, 'bla': 42});
  });
    
  const AUTHOR_LOOKUP = {$lookup: {
      from: "users",
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'}};
  const AUTHOR_FIRST = {$set: {author: {$ifNull: [{$first: "$author"}, null]}}}
  const AUTHOR_PROJECT = {$project: 
    {email: 0, emailVerified: 0, pro: 0}};
  const NOTE_PROJECT = {$project: {
    "author": AUTHOR_PROJECT.$project
  }}

  server.get('/note', async (req, res) => {
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
          query.private = true;
          query.author_id = req.user._id;
        }
        Note
          .aggregate([
            { $match: query},
            { $sort: { "created_on": -1}},
            AUTHOR_LOOKUP,
            AUTHOR_FIRST,
            NOTE_PROJECT
          ], (err, notes) => {
            res.json({data: {notes: notes}});
          });
      } catch(error) {
        console.log("loading notes error: " + String(error));
        console.dir(error);
        res.status(error.status || 500).json({error: String(error)});
      }
    });
    
  server.post('/note', async (req, res) => {
    note = new Note()
    note.title = req.body.title
    note.text = req.body.text
    note.private = req.body.private
    if (!can_create_note(req.user)) {
      // Forbidden:
      res.status(403).json({error: "cannot create note", user: req.user})
      return
    }
    note.author_id = req.user ? req.user._id : null;
    await note.save()
    console.log(`create note ${JSON.stringify(note)}`)
    res.json({note: note})
  })

  async function get_note_full(note_id) {
    // console.log(note_id);
    const MATCH = { $match: (note_id.length == 20)
      ? { firebase_id: note_id}
      : { _id: mongoose.Types.ObjectId(note_id)}};
    const data = (await Note.aggregate([
      MATCH,
      AUTHOR_LOOKUP, 
      AUTHOR_FIRST, 
      NOTE_PROJECT
    ]).exec())[0];
    // console.log(data);
    return data;
  }

  server.get('/note/:id', (req, res) => {
    try {
      return get_note_full(req.params.id)
        .then(note => {
          console.log(`get note: ${JSON.stringify(note
              )}`);
          if (can_read_note(req.user, note)) {
            return res.json({note: note});
          } else {
            // forbidden:
            return res.status(403).json({error: "note is private", user: req.user})
          }
        });
    } catch (err) {
      return res.json({error: err})
    }
  });

  server.put('/note/:id', async (req, res) => {
    let note = await Note.findById(req.params.id)
    if (can_write_note(req.user, note)) {
      note.title = req.body.title
      note.text = req.body.text
      note.private = req.body.private
      note.author_id = req.user ? req.user._id : null
      await note.save()
      console.log(`note saved ${JSON.stringify(note)}`)
      res.json({ note })
    } else {
      // Forbidden
      res.status(403).json({ error: "cannot write", user: req.user })
    }
  })

  server.delete('/note/:id', async (req, res) => {
    let note = await Note.findById(req.params.id)
    if (can_delete_note(req.user, note)) {
      console.log(`deleting note ${note._id}`)
      await Note.findByIdAndDelete(note._id)
      res.json({ deleted: true, note })
    } else {
      // Forbidden:
      res.status(403).json({error: "cannot delete note", note_id: note._id, user: req.user})
    }
  })

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
