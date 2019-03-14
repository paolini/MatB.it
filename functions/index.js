const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

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
