const init_mongo = require("./config/db");
const User = require("./model/User");
const Note = require("./model/Note");
const backup = require("./backup.json");
const mongoose = require("mongoose");
const users = backup.__collections__.users;
const notes = backup.__collections__.notes;

function convert_date(data, field) {
    if (data[field]) {
        data[field] = new Date(data[field].value._seconds*1000);
    }
}

(async () => {
    await init_mongo();  
    if (true) {  
        for (id in users) {
            var data = users[id];
            data['firebase_id'] = id;
            convert_date(data, 'last_login');
            convert_date(data, 'first_login');
            console.log(data);
            var u = new User(data);
            console.log(u);
            await u.save();
        }
    }    
    if (true) {
        for (id in notes) {
            var data = notes[id];
            data.firebase_id = id;
            convert_date(data, "updated_on");
            convert_date(data, "created_on");
            data.author_id = (await User.findOne({ firebase_id: data.author_uid}))._id;
            // console.log(data);
            var note = new Note(data);
            console.log(note);
            await note.save();
        }
    }
    mongoose.disconnect();
})();

