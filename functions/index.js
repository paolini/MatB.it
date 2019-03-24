const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const express = require('express');
const exphbs = require('express-handlebars');
const app = express();

var hbs = exphbs.create({
    defaultLayout: 'main',
    // Specify helpers which are only registered on this instance.
    helpers: {
        raw: function (options) {return options.fn(this);},
        json: function (context) {return JSON.stringify(context);},
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
// app.use(firebaseUser.validateFirebaseIdToken);

app.get('/', (req, res) => {
//  console.log('Signed-in user:', req.user);
  return res.render('home', {});
});

app.get('/note/:id', (req, res) => {
  return res.render('note', {});
});

exports.app = functions.https.onRequest(app);

exports.noteList = functions
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

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Testing MatB.it");
});
