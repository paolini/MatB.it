require('dotenv').config()

module.exports = {
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost/matbit",
    SECRET: process.env.SECRET || ("" + Math.floor(Math.random()*1E16)),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
}