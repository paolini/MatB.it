window.addEventListener('load', function() {
  var db = firebase.firestore();

  Vue.component("note-list", {
    data: function(){
      return {
        notes: []
      };
    },
    created() {
      fetch("api/noteList")
      .then(response => response.json())
      .then(json => {
        this.notes = json.notes;
      });
    },
    template:
      '<div class="note-list">' +
      '<h1 class="w3-text-teal">Notes</h1>' +
      '<ul v-for="note in notes">' +
      '  <a v-bind:href="\'note/\' + note.id ">{{ note.data.title }} -- {{ note.id }}</a>' +
      '</ul>' +
      '</div>'
  });

  Vue.component("note-item", {
    data: function(){
      return {
        debug: "this is a note-item",
        note: null,
        can_edit: false,
        edit: false
      };
    },
    created: function() {
      var note_id = window.location.pathname.match(/^.*\/([^\/]*)$/)[1];
      var that = this;
      db.collection("notes").doc(note_id).get().then(function(doc) {
        that.note = doc.data();
        var user = that.$parent.user;
        that.can_edit = (that.note.author_uid == null) ||
          (user && that.note.author_uid == user.uid);
      }).catch(function(error){
        console.log("loading notes/" + note_id + " error: " + error);
      });
    },
    methods: {
      edit_note(event) {
        this.edit = true;
        document.getElementById('note_text').focus();
      },
      keydown_note_title(event) {
        if(event.keyCode == 13)
          {
            event.preventDefault();
          }
      },
      save_note(event) {
        this.edit = false;
        note = this.note;
        note.data.title = document.getElementById('note_title').innerText;
        note.data.text = document.getElementById('note_text').innerText;
        db.collection("notes").doc(note.id).set({
          title: note.data.title,
          text: note.data.text,
          author_uid: user ? user.uid : null
        }).then(function () {
          console.log("document " + note.id + " successfully written!");
        }).catch(function (err) {
          console.log("error writing " + note.id + ": " + err);
          alert("error: " + err);
        });
      }
    },
    template:
      '<div v-if="note">' +
      '<h1 id="note_title" v-bind:class="{editing: edit}" v-bind:contenteditable="edit" v-on:keydown="keydown_note_title">{{ note.title }}</h1>' +
      '<p id="note_text" v-bind:class="{editing: edit}" v-bind:contenteditable="edit">{{ note.text }}</p>' +
      '<button id="note_title_edit" v-if="!edit" v-on:click="edit_note"><i class="fa fa-edit">edit</i></button>' +
      '<button class="editing" id="note_title_save" v-if="edit" v-on:click="save_note"><i class="fa fa-save">save</i></button>' +
      '</div>'
  });

  var app = new Vue({
    el: '#app',
    data: {
      debug: "this is the main app",
      user: null
    },
    created: function() {
      var that = this;
      document.getElementById("logout_a").onclick = function() {
        firebase.auth().signOut();
      };
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          // User is signed in.
          that.user = user;
          user.getIdToken().then(function(accessToken) {
            document.getElementById('if_logged_out').style.display = "none";
            document.getElementById('if_logged_in').style.display = "block";
            document.getElementById('user_display_name').textContent = user.displayName;
            document.getElementById('user_photo').src = user.photoURL;
          });
        } else {
          // User is signed out.
          document.getElementById('if_logged_out').style.display = "block";
          document.getElementById('if_logged_in').style.display = "none";
          document.getElementById('user_display_name').textContent = "anonymous";
          document.getElementById('user_photo').src = "";
          that.user = null;
        }
      }, function(error) {
        console.log(error);
      });
    }
  })
});
