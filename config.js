require('dotenv').config()

function fill(conf) {
    if (!conf.URI) conf.URI = `http://localhost:${conf.PORT}`
    conf.VERSION = "1.0.1"
    return conf
}

module.exports = fill({
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost/matbit",
    SECRET: process.env.SECRET || ("" + Math.floor(Math.random()*1E16)),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    PORT: parseInt(process.env.PORT || "4000"),
    URI: process.env.URI,
    HOSTNAME: process.env.HOSTNAME || "localhost",
    SCHEME: process.env.SCHEME || "http"
})