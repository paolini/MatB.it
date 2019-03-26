
Vue.component("note-item", {
  data: function(){
    return {
      debug: "this is a note-item",
      id: null,
      note: null,
      original: null,
      edit: false
    };
  },
  computed: {
    text_rendered: function() {
      this.renderMathjax();
      return this.note ? md.render(this.note.text) : " ... ";
    },
    can_edit: function() {
      return (this.note
        && (this.note.author_uid == null
            || (this.$parent.user != null
                && this.note.author_uid == this.$parent.user.uid)));
    },
    changed: function() {
      return this.original == null ||
        this.note.text != this.original.text ||
        this.note.title != this.original.title;
    }
  },
  created: function() {
    var id = window.location.pathname.match(/^.*\/([^\/]*)$/)[1];
    if (id == 'new') {
      id = null;
      this.id = id;
      this.note = {
        title: 'no title',
        text: '',
        author: {uid: this.$parent.user ? this.$parent.user.uid : null},
        created_timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.original = {
        title: this.note.title,
        text: this.note.text
      };
      that = this;
      this.$nextTick().then(function(){that.edit_note()});
    } else {
      var that = this;
      axios.get('/api/v0/note/' + id).then(
        function(data) {
          if ('note' in data.data) {
            that.id = id;
            that.note = data.data.note;
            that.original = {
              title: that.note.title,
              text: that.note.text
            }
          } else {
            console.log("loading note " + id + " error: " + data.error);
          }
        });
    }
  },
  methods: {
    render(event) {
      this.note.text = this.$refs.text.innerText;
    },
    renderMathjax(event) {
        var that=this;
        this.$nextTick().then(function() {
          window.MathJax.Hub.Queue(
            ["Typeset",
             window.MathJax.Hub,
             that.$refs.text_rendered]);
         });
    },
    edit_note(event) {
      this.edit = true;
      el = this.$refs.text;
      el.innerText = this.note.text;
      el.focus();
    },
    keydown_note_title(event) {
      if (event.keyCode == 13) {event.preventDefault();}
    },
    cancel_note(event) {
      this.note.title = this.original.title;
      this.note.text = this.original.text;
      this.edit = false;
    },
    save_note(event) {
      this.edit = false;
      var user = this.$parent.user;
      var that = this;
      var note = this.note;
      note.title = this.$refs.title.innerText;
      note.text = this.$refs.text.innerText;
      data = {
        title: note.title,
        text: note.text
      }
      config = {
        headers: {'Authorization': 'Bearer ' + this.$parent.authToken}
      }
      var id = this.id;
      var p;
      if (id == null) {
        p = axios.post('/api/v0/note', data, config);
        /*
        db.collection("notes").add(note).then(function(docRef) {
          that.id = docRef.id;
          console.log("new note " + docRef.id + "created");
          window.location.href = "/note/" + docRef.id;
        }).catch(function (err){
          console.log("error creating new doc: " + err);
        });
        */
      } else {
        p = axios.put('/api/v0/note/' + id, data, config);
      }
      p.then(function (out) {
          that.original.title = that.note.title;
          that.original.text = that.note.text;
          if (id == null) {
              that.id = out.data.id;
              console.log("new note " + out.data.id + " created");
              window.location.href = "/note/" + out.data.id;
          } else {
             console.log("document " + id + " successfully written!");
          }
      }).catch(function (err) {
          console.log("error writing " + id + ": " + err);
          alert("error: " + err);
      });
    }
  },
  template:
    '<div v-if="note">' +
    '<h1 ref="title" :class="{editing: edit}" :contenteditable="edit" @keydown="keydown_note_title">{{ note.title }}</h1>' +
    '<p ref="text" v-show="edit" class=editing contenteditable="true" @input="render" ></p>' +
    '<p v-if="edit">' +
    '<button class="editing" @click="cancel_note"><i class="fa fa-times">cancel</i></button>' +
    '<button class="editing" v-if="changed" @click="save_note"><i class="fa fa-save">save</i></button>' +
    '</p>' +
    '<p ref="text_rendered" v-html="text_rendered"></p>' +
    '<p>' +
    '<span v-if="note.author.uid==null">[no author]</span><span v-else>by: {{ note.author.displayName }}<img class="thumbnail" :src="note.author.photoURL" /></span>' +
    ' ' +
    '<button v-if="can_edit && !edit" @click="edit_note"><i class="fa fa-edit">edit</i></button>' +
    '</p>' +
    '</div>'
});
