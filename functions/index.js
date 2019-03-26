const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

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

const validateFirebaseIdToken = (req, res, next) => {
  let idToken;
  //  console.log("validate middleware " + req.headers.authorization);
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    idToken = req.headers.authorization.split('Bearer ')[1];
    admin.auth().verifyIdToken(idToken).then((decodedIdToken) => {
      // console.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      return next();
    }).catch((error) => {
      console.error('Error while verifying Firebase ID token:', error);
      res.status(403).send('Unauthorized');
    });
  } else {
    // console.log("invalid header found: " + req.headers.authorization);
    req.user = null;
    return next();
  }
};

app.use(validateFirebaseIdToken);

app.get('/', (req, res) => {
//  console.log('Signed-in user:', req.user);
  return res.render('home', {});
});

app.get('/note/:id', (req, res) => {
  return res.render('note', {});
});

app.post('/api/v0/user/login', (req, res) => {
  if (req.user == null) {
    res.status(403).send('Unauthorized');
    return;
  }
  console.log("login " + req.user.uid);
  return db.collection('users').doc(req.user.uid).set({
    email: req.user.email,
    emailVerified: req.user.email_verified,
    displayName: req.user.name,
    photoURL: req.user.picture
  }).then(() => {
    return res.json({ok: "ok"});
  }).catch(err => {
    console.error("in user login: " + err);
    return res.json({error: err})
  });
});

app.get('/api/v0/note', (req, res) => {
  db.collection('notes').get().then(function (querySnapshot){
    var notes = [];
    var authors = {};
    querySnapshot.forEach(documentSnapshot => {
      const data = documentSnapshot.data();
      notes.push({
        id: documentSnapshot.id,
        data: {
          title: data.title,
          author_uid: data.author_uid
        }
      });
      if (data.author_uid != null) {
        authors[data.author_uid] = db.doc('users/' + data.author_uid);
      }
    });
    const values = Object.values(authors);
    return db.getAll(...values).then(users =>{
      const keys = Object.keys(authors);
      for(var i=0; i<keys.length; i++) {
        authors[keys[i]] = users[i];
      }
      console.dir(authors);
      notes.forEach(note => {
        if (note.data.author_uid != null) {
          note.data.author_name = authors[note.data.author_uid].data().displayName;
        } else {
          note.data.author_name = "";
        }
      });
      return res.json({data: {notes: notes}});
    });
  }).catch(function(error){
    console.log("loading notes error: " + error);
    console.dir(error);
    return res.json({error: "" + error});
  });
});

app.post('/api/v0/note', (req, res) => {
  data = {
    title: req.body.title,
    text: req.body.text,
    author: req.user ? req.user.uid : null,
    created_on: admin.firestore.Timestamp.now()
  };
  db.collection('notes').add(data).then(docRef => {
    return res.json({id: docRef.id});
  }).catch(err => {
    return res.status(500).json({error: err});
  });
});

app.put('/api/v0/note/:id', (req, res) => {
  const id = req.params.id;
  var doc = db.collection('notes').doc(id)
  return doc.get().then(snap => {
    data = snap.data();
    if (data.author_uid == null || (req.user && req.user.uid == data.author_uid)) {
      doc.update({
        title: req.body.title,
        text: req.body.text,
        author_uid: req.user ? req.user.uid : null,
        updated_on: admin.firestore.Timestamp.now()
      }).then(() => {
        return res.json({ok: "ok"});
      });
    } else {
      return res.status(403).send('Unauthorized');
    }
  }).catch((err) => {
    console.error("error updating note: " + err);
    return res.status(500).json({'error': err});
  });
});

app.get('/api/v0/note/:id', (req, res) => {
  const id = req.params.id;
  db.collection('notes').doc(id).get().then(
    doc => {
      const data = doc.data();
      var out = {
        note: {
          id: id,
          title: data.title,
          text: data.text,
          author: {
            uid: data.author_uid
          }
        }
      };
      if (data.author_uid == null) {
        return res.json(out);
      }
      return db.collection('users').doc(data.author_uid)
        .get().then(doc => {
          const data = doc.data();
          out.note.author.displayName = data.displayName;
          out.note.author.photoURL = data.photoURL;
          return res.json(out);
      });
    }).catch(err => {
      console.error(err);
      res.json({error: err})
    });
});

exports.app = functions.https.onRequest(app);

/**
 * Creates a document with ID -> uid in the `users` collection.
 *
 * @param {Object} user Contains the auth, uid and displayName info.
 * @param {Object} context Details about the event.
 */
const createProfile = (user, context) => {
  return db.collection('users').doc(user.uid)
    .update({
      debug: "pippo",
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
    }).catch(console.error);
};

exports.authOnCreate = functions.auth.user().onCreate(createProfile);
