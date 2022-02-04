const mongoose = require("mongoose");

// Replace this with your MONGOURI.
const MONGOURI = "mongodb://localhost/matbit";

const InitiateMongoServer = async () => {
  try {
    await mongoose.connect(MONGOURI, {
      useNewUrlParser: true
    });
    console.log("Successfully connected to database " + MONGOURI);
  } catch (e) {
    console.log(e);
    throw e;
  }
};

module.exports = InitiateMongoServer;
