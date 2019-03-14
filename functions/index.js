const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const express = require('express');
const exphbs = require('express-handlebars');
const app = express();
// const firebaseUser = require('./firebaseUser');

var hbs = exphbs.create({
    defaultLayout: 'main',
    // Specify helpers which are only registered on this instance.
    helpers: {
        raw: function (options) {return options.fn(this);},
        foo: function () { return 'FOO!'; },
        bar: function () { return 'BAR!'; }
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
// app.use(firebaseUser.validateFirebaseIdToken);

app.get('/', (req, res) => {
//  console.log('Signed-in user:', req.user);
  return res.render('home', {
  //  user: req.user,
  });
});

// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.app = functions.https.onRequest(app);

exports.noteList = functions.region('europe-west1')
    .https.onRequest((req, res) => {
  db = admin.firestore();
  db.collection("notes").get().then(
    querySnapshot => {
      list = [];
      querySnapshot.forEach(documentSnapshot => {
          list.push({id: documentSnapshot.id,
                     data: documentSnapshot.data()});
        });
      res.json({notes: list});
      return null; // added to satisfy eslint: Each then() should return a value or throw  promise/always-return
    }).catch(error => {
      res.json({error: error});
    });
});

exports.noteAdd = functions.region('europe-west1')
    .https.onRequest((req, res) => {
  db = functions.firestore;
  res.json({
    method: req.method,
    query: req.query,
    body: req.body
  });
});

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Testing MatB.it");
});

exports.bigben = functions.https.onRequest((req, res) => {
  const hours = (new Date().getHours() % 12) + 1  // London is UTC + 1hr;
  res.status(200).send(`<!doctype html>
    <head>
      <title>Time</title>
    </head>
    <body>
      ${'BONG '.repeat(hours)}
    </body>
  </html>`);
});
