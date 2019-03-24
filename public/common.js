window.addEventListener('load', function() {
  var db = firebase.firestore();
  var md = window.markdownit();

  Vue.component("note-list", {
    data: function(){
      return {
        notes: []
      };
    },
    created() {
      var that=this;
      db.collection('notes').get().then(function (querySnapshot){
        that.notes = [];
        querySnapshot.forEach(function (documentSnapshot){
          that.notes.push({
            id: documentSnapshot.id,
            data: documentSnapshot.data()
          });
        });
      }).catch(function(error){
        console.log("loading notes error: "+error);
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
        id: null,
        note: null,
        can_edit: false,
        edit: false
      };
    },
    computed: {
      text_rendered: function() {
        return this.note ? md.render(this.note.text) : " ... ";
      }
    },
    created: function() {
      var id = window.location.pathname.match(/^.*\/([^\/]*)$/)[1];
      var that = this;
      db.collection("notes").doc(id).get().then(function(doc) {
        that.id = id;
        that.note = doc.data();
        var user = that.$parent.user;
        that.can_edit = (that.note.author_uid == null) ||
          (user && that.note.author_uid == user.uid);
      }).catch(function(error){
        console.log("loading notes/" + id + " error: " + error);
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
        var user = this.$parent.user;
        var note = this.note;
        note.title = document.getElementById('note_title').innerText;
        note.text = document.getElementById('note_text').innerText;
        note.author_uid = user ? user.uid : null;
        var id = this.id;
        db.collection("notes").doc(id).set(note).then(function () {
          console.log("document " + id + " successfully written!");
        }).catch(function (err) {
          console.log("error writing " + id + ": " + err);
          alert("error: " + err);
        });
      }
    },
    template:
      '<div v-if="note">' +
      '<h1 id="note_title" v-bind:class="{editing: edit}" v-bind:contenteditable="edit" v-on:keydown="keydown_note_title">{{ note.title }}</h1>' +
      '<p id="note_text" v-show="edit" class=editing contenteditable="true" v-text="note.text"></p>' +
      '<p v-html="text_rendered"></p>' +
      '<button v-if="!edit" v-on:click="edit_note"><i class="fa fa-edit">edit</i></button>' +
      '<button class="editing" id="note_title_save" v-if="edit" v-on:click="save_note"><i class="fa fa-save">save</i></button>' +
      '</div>'
  });

  Vue.filter('matify', function(value){
    return md.render(value);
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
