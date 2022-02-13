const mongoose = require("mongoose");

// Replace this with your MONGOURI.
const MONGOURI = "mongodb://localhost/matbit";

const InitiateMongoServer = async () => {
  try {
    const db = await mongoose.connect(MONGOURI, {
      useNewUrlParser: true
    });
    console.log("Successfully connected to database " + MONGOURI);
    console.log(db);
    return db;
  } catch (e) {
    console.log(e);
    throw e;
  }
};

module.exports = InitiateMongoServer;
