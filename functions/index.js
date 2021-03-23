const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp();
const assert = require('assert');

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class ForbiddenError extends HttpError {
  constructor(message){super(message, 403)}
}

class UnauthorizedError extends HttpError {
  constructor(message){super(message, 401)}
}

class InternalServerError extends HttpError {
  constructor(message){super(message, 500)}
}

const db = admin.firestore();
const db_now = admin.firestore.FieldValue.serverTimestamp();

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

async function patch_database() {
  console.log('patching database');
  try {
    var querySnapshot = await db.collection('notes').get();
    var count = 0;
    await querySnapshot.forEach(documentSnapshot => {
      db.collection('notes').doc(documentSnapshot.id).update({private: false});
      count ++;
    });
    console.log(String(count) +" documents patched");
  } catch(err) {
    console.log(err);
  }
}

// patch_database();

function render(body, callback) {
  fs.readFile("./main.html", "utf8", (err, data) => {
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
  render("<dashboard></dashboard>", (html) => {
    res.send(html);
  });
});

app.get('/tos', (req, res) => {
  fs.readFile("./tos.html", "utf8", (err, data) => {
    render(data, (html) => { 
      res.send(html);
    });
  });
});

app.get('/privacy', (req, res) => {
  fs.readFile("./privacy.html", "utf8", (err, data) => {
    render(data, (html) => { 
      res.send(html);
    });
  });
});

app.get('/note/:id', (req, res) => {
  render('<note-item :user="user"></note-item>', (html) => {
    res.send(html);
  });
});

//
// API v0
//

app.post('/api/v0/user/login', async (req, res) => {
  try {
    if (req.user === null) {
      res.status(403).send('Unauthorized');
      return;
    }
    console.log("login " + req.user.uid);
    var user_doc = await db.collection('users').doc(req.user.uid).get()
    if (!user_doc.exists) {
      console.dir(req.user);
      await db.collection('users').doc(req.user.uid).set({
        email: req.user.email,
        emailVerified: req.user.email_verified,
        displayName: req.user.name,
        photoURL: req.user.picture || null,
        first_login: db_now,
        last_login: db_now,
        pro: false
      });
    } else {
      await db.collection('users').doc(req.user.uid).update({
        last_login: db_now});
    }
    var user = await db.collection('users').doc(req.user.uid).get();
    var data = user.data();
    data.uid = req.user.uid;
    res.json({user: data});
  } catch(err) {
    console.error("ERROR in user login: " + err);
    res.status(500).json({error: err})
  }
});

app.get('/api/v0/note', async (req, res) => {
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

async function validate_note_form(req) {
  var note_id = null;
  const uid = req.user ? req.user.uid : null;
  if (req.method === 'PUT') {
    note_id = req.params.id;
    var note = (await db.collection('notes').doc(note_id).get()).data();
    if (note.author_uid && uid !== note.author_uid) {
      return Promise.reject(new ForbiddenError("not permitted to edit note (different author)"));
    }
  }

  var user_doc = await db.collection('users').doc(req.user.uid).get();
  var user = user_doc.data();
  var out = {
    title: req.body.title || "[no title]",
    text: req.body.text,
    author_uid: req.user ? req.user.uid : null,
    updated_on: db_now,
    private: req.body.private || false
  };
  if (out.private && !(user && user.pro)) {
    return Promise.reject(new ForbiddenError("only 'pro' user can create private notes"));
  }
  if (req.method === 'POST') {
    out.created_on = db_now;
  }
  return out;
}

app.post('/api/v0/note', async (req, res) => {
  try {
    data = await validate_note_form(req);
    var docRef = await db.collection('notes').add(data);
    return res.json({id: docRef.id});
  } catch(err) {
    console.log(err);
    return res.status(500).json({error: err});
  }
});

app.put('/api/v0/note/:id', async (req, res) => {
  var id = req.params.id;
  try {
    data = await validate_note_form(req);
    await db.collection('notes').doc(id).update(data);
    return res.json({
       ok: "ok"
     });
   } catch (err) {
     console.log(err);
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
   }
});

app.delete('/api/v0/note/:id', (req, res) => {
  const id = req.params.id;
  const uid = req.user ? req.user.uid : null;

  // implementare controllo user_can_edit_note

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
            photoURL: data.photoURL,
            uid: author_uid,
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
        author: author,
        private: data.private
    }
}

app.get('/api/v0/note/:id', (req, res) => {
  try {
    return get_note_full(req.params.id)
      .then(note => {
        return res.json({note: note});
      });
  } catch (err) {
    return res.json({error: err})
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
