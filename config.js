require('dotenv').config()

function populate(conf) {
    if (conf.PORT == {"http": 80, "https": 443}[conf.SCHEME]) {
        conf.URI = `${conf.SCHEME}://${conf.HOSTNAME}`
    } else {
        conf.URI = `${conf.SCHEME}://${conf.HOSTNAME}:${conf.PORT}`
    }
    return conf
}

module.exports = populate({
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost/matbit",
    SECRET: process.env.SECRET || ("" + Math.floor(Math.random()*1E16)),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    HOSTNAME: process.env.HOSTNAME || "localhost",
    PORT: parseInt(process.env.PORT || "4000"),
    SCHEME: process.env.SCHEME || "http"
})