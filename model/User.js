const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  firebase_id: {
    type: String,
  },
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
  }
});

// export model user with UserSchema
module.exports = mongoose.model("user", UserSchema);
