const express = require("express") 
const createError = require('http-errors')
const mongoose = require("mongoose");

const Note = require("./model/Note");
const User = require("./model/User");

var server = express.Router()

module.exports = server

server.get("/", (req, res) => {
    res.json({ message: "Welcome to MatbIt" });
  });

  server.get('/user', async (req, res) => {
    res.json({'user': req.user});
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
          const uid = req.user.uid;
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
            // console.log(notes);
            res.json({data: {notes: notes}});
          });
      } catch(error) {
        console.log("loading notes error: " + String(error));
        console.dir(error);
        res.status(error.status || 500).json({error: String(error)});
      }
    });
    
  server.post('/note', async (req, res) => {
    note = new Note(req.body)
    await note.save()
    console.log(`saved note ${note._id}`)
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
          return res.json({note: note});
        });
    } catch (err) {
      return res.json({error: err})
    }
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
