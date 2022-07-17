const mongoose = require("mongoose");
const args = require('args-parser')(process.argv);
const config = require("./config")
const User = require("./model/User");
const Note = require("./model/Note");
const backup = require("./backup.json");
const users = backup.__collections__.users;
const notes = backup.__collections__.notes;

const init_mongo = async () => {
  try {
    const db = await mongoose.connect(config.MONGO_URI, {
      useNewUrlParser: true
    });
    console.log("Successfully connected to database " + config.MONGO_URI);
    if (args.verbose) console.log(db);
    return db;
  } catch (e) {
    console.log(e);
    throw e;
  }
};

function convert_date(data, field) {
    if (data[field]) {
        data[field] = new Date(data[field].value._seconds*1000);
    }
}

async function main () {
    
    if (args.help) {
        console.log("--save actually write to database")
        console.log("--erase erase database before importing")
        console.log("--verbose write detailed output")
        process.exit()
    }

    await init_mongo();  

    if (true) {
        if (args.erase) {
            await User.remove()
            console.log("collection User erased!")
        } 
        for (id in users) {
            var data = users[id];
            data['firebase_id'] = id;
            convert_date(data, 'last_login');
            convert_date(data, 'first_login');
            var u = new User(data);
            console.log(`user ${id}: ${data['email']}`)
            if (args.verbose) console.log(u);
            if (args.save) {
                await u.save();
            }
        }
    }    
    if (true) {
        if (args.erase) {
            await Note.remove()
            console.log("collection Note erased!")
        }
        for (id in notes) {
            var data = notes[id];
            data.firebase_id = id;
            convert_date(data, "updated_on");
            convert_date(data, "created_on");
            data.author_id = (await User.findOne({ firebase_id: data.author_uid}))._id;
            var note = new Note(data);
            console.log(`note ${id}: ${data['title']}`)
            if (args.verbose) console.log(note);
            if (args.save) {
                await note.save();
            }
        }
    }

    if (!args.save) {
        console.log("use option: --save to actually write to database")
    }
    if (!args.erase) {
        console.log("use option: --erase to delete collections before importing")
    }
    mongoose.disconnect();
}

main()

