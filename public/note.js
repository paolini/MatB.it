
Vue.component("note-item", {
  data: function(){
    return {
      debug: "this is a note-item",
      id: null,
      note: null,
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
    }
  },
  created: function() {
    var id = window.location.pathname.match(/^.*\/([^\/]*)$/)[1];
    var that = this;
    db.collection("notes").doc(id).get().then(function(doc) {
      that.id = id;
      that.note = doc.data();
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
    '<h1 ref="title" :class="{editing: edit}" :contenteditable="edit" @keydown="keydown_note_title">{{ note.title }}</h1>' +
    '<p ref="text" v-show="edit" class=editing contenteditable="true" @input="render" ></p>' +
    '<p ref="text_rendered" v-html="text_rendered"></p>' +
    '<button v-if="can_edit && !edit" @click="edit_note"><i class="fa fa-edit">edit</i></button>' +
    '<button class="editing" v-if="edit" @click="save_note"><i class="fa fa-save">save</i></button>' +
    '</div>'
});
