const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  displayName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  emailVerified: {
    type: Boolean,
    required: true
  },
  first_login: {
    type: Date,
    // default: Date.now()
  },
  last_login: {
    type: Date,
    // default: Date.now()
  },
  photoURL: {
    type: String
  },
  pro: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  firebase_id: {
    type: String,
  },
  google_id: {
    type: String,
  },
});

// export model user with UserSchema
module.exports = mongoose.model("user", UserSchema);
