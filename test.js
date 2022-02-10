const Note = require("./model/Note");
const User = require("./model/User");
const InitiateMongoServer = require("./config/db");

InitiateMongoServer();

try {
    var out = Note
        .aggregate([{
            $match: { private: false}
        }, {
            $lookup: {
              from: "users",
              localField: 'author_id',
              foreignField: '_id',
              as: 'author'
            }
        }
        ], function(err, result){
            console.log(result);
        });
    } catch(error) {
      console.log("loading notes error: " + String(error));
      console.dir(error);
    }