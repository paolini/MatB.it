
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
    this.$parent.$on('userLogin', this.userChanged);
    if (id == 'new') {
      id = null;
      this.id = id;
      this.note = {
        title: 'some title',
        text: 'some text',
        author: {uid: this.$parent.user ? this.$parent.user.uid : null},
      };
      this.original = Object.assign({}, this.note);
      this.edit_note();
    } else {
      var that = this;
      axios.get('/api/v0/note/' + id).then(
        function(data) {
          that.id = id;
          that.note = data.data.note;
          that.original = Object.assign({}, that.note);
        }).catch(function(err){
          console.log("loading note " + id + " error: " + err);
        });
    }
  },
  beforeDestroy: function() {
    this.$parent.$off('userLogin');
  },
  methods: {
    render(event) {
      this.note.text = this.$refs.text.innerText;
    },
    userChanged(event) {
      if (this.edit) {
        if (this.can_edit) {
          // I was editing the note as anonymous,
          // now set the correct author
          this.edit_note();
        } else {
          // I can no longer edit the note, let's cancel
          this.cancel_note();
        }
      }
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
      if (this.$parent.user) {
        this.note.author = {};
        this.note.author.uid = this.$parent.user.uid;
        this.note.author.displayName = this.$parent.user.displayName;
        this.note.author.photoURL = this.$parent.user.photoURL;
      }
      that = this;
      this.$nextTick().then(function(){
        el = that.$refs.text;
        el.innerText = that.note.text;
        el.focus();
      });
    },
    cancel_note(event) {
      this.note = Object.assign({}, this.original)
      this.edit = false;
    },
    delete_note(event) {
      var id = this.id;
      axios.delete('/api/v0/note/' + id)
      .then(function (out) {
        window.location.href = '/';
      })
    },
    save_note(event) {
      this.edit = false;
      var user = this.$parent.user;
      var that = this;
      var note = this.note;
      note.title = this.$refs.title.innerText;
      note.text = this.$refs.text.innerText;
      var data = {
        title: note.title,
        text: note.text
      }
      var config = {};
      if (user) {
        config.headers = {'Authorization': 'Bearer ' + this.$parent.authToken};
      }
      var id = this.id;
      var p;
      if (id == null) {
        p = axios.post('/api/v0/note', data, config);
      } else {
        p = axios.put('/api/v0/note/' + id, data, config);
      }
      p.then(function (out) {
          that.original = Object.assign({}, that.note);
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
    '<h1 ref="title" :class="{editing: edit}" :contenteditable="edit" @keydown.enter.prevent>{{ note.title }}</h1>' +
    '<p ref="text" v-show="edit" class=editing contenteditable="true" @input="render" ></p>' +
    '<p v-if="edit">' +
    '<button class="editing" @click="cancel_note"><i class="fa fa-times">cancel</i></button>' +
    '<button class="editing" v-if="changed" @click="save_note"><i class="fa fa-save">save</i></button>' +
    '</p>' +
    '<p ref="text_rendered" v-html="text_rendered"></p>' +
    '<p>' +
    '<span v-if="note.author==null">[no author]</span><span v-else>by: {{ note.author.displayName }}<img class="thumbnail" :src="note.author.photoURL" /></span>' +
    ' ' +
    '<button v-if="can_edit && !edit" @click="edit_note"><i class="fa fa-edit">edit</i></button>' +
    '<button v-if="can_edit && !edit" @click="delete_note"><i class="fa fa-trash">delete</i></button>' +
    '</p>' +
    '</div>'
});
