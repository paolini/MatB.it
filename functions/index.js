const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp();

class ForbiddenError extends Error {
  constructor(message){
    super(message)
    // Add additional properties
  }
}

const db = admin.firestore();

const express = require('express');
const app = express();

const validateFirebaseIdToken = (req, res, next) => {
  let idToken;
  //  console.log("validate middleware " + req.headers.authorization);
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    idToken = req.headers.authorization.split('Bearer ')[1];
    return admin.auth().verifyIdToken(idToken).then((decodedIdToken) => {
      // console.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      return next();
    }).catch((error) => {
      console.error('Error while verifying Firebase ID token:', error);
      return res.status(403).send('Unauthorized');
    });
  } else {
    // console.log("invalid header found: " + req.headers.authorization);
    req.user = null;
    return next();
  }
};

app.use(validateFirebaseIdToken);

function render(body, callback) {
  fs.readFile("./main.html", "utf8", function(err, data) {
      if (err) {
        throw err;
      }
      console.dir(typeof data);
      data = data.replace('{{{ body }}}', body);
      callback(data);
  });
}

app.get('/', (req, res) => {
  //  console.log('Signed-in user:', req.user);
  render("<note-list></note-list>", function(html) {
    res.send(html);
  });
});

app.get('/note/:id', (req, res) => {
  render('<note-item :user="user"></note-item>', function(html) {
    res.send(html);
  });
});

app.post('/api/v0/user/login', (req, res) => {
  if (req.user === null) {
    res.status(403).send('Unauthorized');
    return;
  }
  console.log("login " + req.user.uid);
  db.collection('users').doc(req.user.uid).set({
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
  var notes = [];
  var authors = {};
  db.collection('notes').orderBy('created_on','desc').get().then(querySnapshot => {
    querySnapshot.forEach(documentSnapshot => {
      const data = documentSnapshot.data();
      notes.push({
          id: documentSnapshot.id,
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
    return db.getAll(...values);
  }).then(users => {
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
  }).catch(error => {
    console.log("loading notes error: " + String(error));
    console.dir(error);
    return res.status(500).json({error: String(error)});
  });
});

app.post('/api/v0/note', (req, res) => {
  var now = admin.firestore.Timestamp.now();
  data = {
    title: req.body.title,
    text: req.body.text,
    author_uid: req.user ? req.user.uid : null,
    created_on: now,
    updated_on: now
  };
  db.collection('notes').add(data).then(docRef => {
    return res.json({id: docRef.id});
  }).catch(err => {
    return res.status(500).json({error: err});
  });
});

function user_can_edit_note(uid, note_id) {
  return db.collection('notes').doc(note_id).get().then(snap => {
    data = snap.data();
    return data.author_uid ? uid === data.author_uid : true;
  });
}

app.put('/api/v0/note/:id', (req, res) => {
  const id = req.params.id;
  const uid = req.user ? req.user.uid : null;

  user_can_edit_note(uid, id)
   .then(yes => {
     if(!yes) throw new ForbiddenError();
     return db.collection('notes').doc(id).update({
       title: req.body.title,
       text: req.body.text,
       author_uid: req.user ? req.user.uid : null,
       updated_on: admin.firestore.Timestamp.now()
     });
   })
   .then(() => {
     // Update completed, respond with ok.
     return res.json({
       ok: "ok"
     });
   })
   .catch((err) => {
     if (err instanceof ForbiddenError) {
       return res.status(403).json({
         error: "Permission Denied",
         note_id: id
       })
     } else {
       return res.status(500).json({
         error: "Server error"
       })
     }
   })
});

app.delete('/api/v0/note/:id', (req, res) => {
  const id = req.params.id;
  const uid = req.user ? req.user.uid : null;

  user_can_edit_note(uid, id)
   .then(yes => {
     if(!yes) throw new ForbiddenError();
     return db.collection('notes').doc(id).delete();
   })
   .then(() => {
     // delete completed, respond with ok.
     return res.json({
       ok: "ok"
     });
   })
   .catch((err) => {
     if (err instanceof ForbiddenError) {
       return res.status(403).json({
         error: "Permission Denied",
         note_id: id
       })
     } else {
       return res.status(500).json({
         error: "Server error"
       })
     }
   })
});

function get_author_data(author_uid) {
  if (author_uid) {
    return db.collection('users').doc(author_uid).get()
      .then(doc => {
          const data = doc.data();
          return {
            displayName: data.displayName,
            photoURL: data.photoURL
          };
        });
  } else {
    return Promise.resolve(null);
  }
}

async function get_note_full(note_id) {
    const doc = await db.collection('notes').doc(note_id).get();
    const data = doc.data();
    const author = await get_author_data(data.author_uid);
    return {
        id: note_id,
        title: data.title,
        text: data.text,
        author: author
    }
}

app.get('/api/v0/note/:id', (req, res) => {
  try {
    return get_note_full(req.params.id)
      .then(note => {
        return res.json({note: note});
      });
  } catch (err) {
    res.json({error: err})
  }
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
