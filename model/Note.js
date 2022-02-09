const mongoose = require("mongoose");
const User = require("./User");

const NoteSchema = mongoose.Schema({
  firebase_id: {
    type: String
  },
  author_id: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user'
  },
  title: {
    type: String
  },
  updated_on: {
    type: Date
  },
  created_on: {
    type: Date
  },
  text: {
    type: String
  },
  private: {
    type: Boolean
  }
});

// export model user with UserSchema
module.exports = mongoose.model("note", NoteSchema);
