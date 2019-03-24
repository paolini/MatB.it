
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
      this.renderMathjax();
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
    save_note(event) {
      this.edit = false;
      var user = this.$parent.user;
      var note = this.note;
      note.title = this.$refs.title.innerText;
      note.text = this.$refs.text.innerText;
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
    '<h1 ref="title" v-bind:class="{editing: edit}" v-bind:contenteditable="edit" v-on:keydown="keydown_note_title">{{ note.title }}</h1>' +
    '<p ref="text" v-show="edit" class=editing contenteditable="true" @input="render" ></p>' +
    '<p ref="text_rendered" v-html="text_rendered"></p>' +
    '<button v-if="!edit" v-on:click="edit_note"><i class="fa fa-edit">edit</i></button>' +
    '<button class="editing" v-if="edit" v-on:click="save_note"><i class="fa fa-save">save</i></button>' +
    '<button @click="renderMathjax">mathjax</button>' +
    '</div>'
});
