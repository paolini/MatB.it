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
    title_rendered: function() {
      var that=this;
      this.$nextTick().then(function() {
         window.MathJax.Hub.Queue(
           ["Typeset",
            window.MathJax.Hub,
            that.$refs.title_rendered]);
       });
      return this.note ? md.render(this.note.title) : " ... ";
    },
    text_rendered: function() {
      var that=this;
      this.$nextTick().then(function() {
         window.MathJax.Hub.Queue(
           ["Typeset",
            window.MathJax.Hub,
            that.$refs.text_rendered]);
       });
      return this.note ? md.render(this.note.text) : " ... ";
    },
    can_edit: function() {
      return (this.note
        && (this.note.author == null
            || (this.$root.user != null
                && this.note.author.uid == this.$root.user.uid)));
    },
    changed: function() {
      return this.original == null ||
        this.note.text != this.original.text ||
        this.note.title != this.original.title ||
        this.note.private != this.original.private;
    }
  },
  created: function() {
    var id = window.location.pathname.match(/^.*\/([^\/]*)$/)[1];
    this.$root.$on('userLogin', this.userChanged);
    if (id == 'new') {
      id = null;
      this.id = id;
      this.note = {
        title: 'some title',
        text: 'some text',
        author: {uid: this.$root.user ? this.$root.user.uid : null},
        private: false
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
    this.$root.$off('userLogin');
  },
  methods: {
    title_input(event) {
      this.note.title = this.$refs.title.innerText;
    },
    text_input(event) {
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
    edit_note(event) {
      this.edit = true;
      if (this.$root.user) {
        this.note.author = {};
        this.note.author.uid = this.$root.user.uid;
        this.note.author.displayName = this.$root.user.displayName;
        this.note.author.photoURL = this.$root.user.photoURL;
      }
      that = this;
      this.$nextTick().then(function(){
        el = that.$refs.title;
        el.innerText = that.note.title;
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
      get_auth_config(this.$root.auth_user).then(function(config) {
        axios.delete('/api/v0/note/' + id, config)
        .then(function (out) {
          window.location.href = '/';
        }).catch(function(err) {
          alert("error: " + err);
        });
      });
    },
    save_note(event) {
      this.edit = false;
      var that = this;
      var note = this.note;
      note.title = this.$refs.title.innerText;
      note.text = this.$refs.text.innerText;
      var data = {
        title: note.title,
        text: note.text,
        private: note.private
      }

      get_auth_config(this.$root.auth_user).then(function(config) {
        var id = that.id;
        var p;
        if (id == null) {
          p = axios.post('/api/v0/note', data, config);
        } else {
          p = axios.put('/api/v0/note/' + id, data, config);
        }
        p.then(function (out) {
            that.original = Object.assign({}, that.note);
            if (id == null) {
                that.id = out.data.note._id;
                console.log("new note " + out.data.note._id + " created");
                window.location.href = "/note/" + out.data.note._id;
            } else {
               console.log("document " + id + " successfully written!");
            }
        }).catch(function (err) {
            console.log("error writing " + id + ": " + err);
            alert("error: " + err);
        });
      });
    }
  },
  template:
    '<div v-if="note">' +
    '<h1 v-if="edit" ref="title" :class="{editing: edit}" :contenteditable="edit" @input="title_input" @keydown.enter.prevent></h1>' +
    '<h1 v-else ref="title_rendered" v-html="title_rendered"></h1>' +
    '<p ref="text" v-show="edit" class=editing contenteditable="true" @input="text_input" ></p>' +
    '<p v-if="edit">' +
    '  <span class="editing" v-if="$root.user && $root.user.pro"><input type="checkbox" id="checkbox_private" v-model="note.private"></input><label for="checkbox_private">private</label></span>' +
    '  <button class="editing" @click="cancel_note"><i class="fa fa-times">cancel</i></button>' +
    '  <button class="editing" v-if="changed" @click="save_note"><i class="fa fa-save">save</i></button>' +
    '</p>' +
    '<p ref="text_rendered" v-html="text_rendered"></p>' +
    '<p>' +
    '<span v-if="!edit && note.private">private note</span> ' +
    '<span v-if="note.author==null">[no author]</span><span v-else>by: {{ note.author.displayName }}<img class="thumbnail" :src="note.author.photoURL" /></span>' +
    ' ' +
    '<button v-if="can_edit && !edit" @click="edit_note"><i class="fa fa-edit">edit</i></button>' +
    '<button v-if="can_edit && !edit" @click="delete_note"><i class="fa fa-trash">delete</i></button>' +
    '</p>' +
    '</div>'
});
