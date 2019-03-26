Vue.component("note-list", {
  data: function(){
    return {
      notes: []
    };
  },
  created() {
    var that = this;
    axios.get('/api/v0/note').then(function (res) {
      that.notes = res.data.data.notes;
      that.notes.forEach(function(note){
        note.created_on = new Date(note.created_on);
        note.updated_on = new Date(note.updated_on);
      });
    }).catch(function(err){
      console.error(err);
    });
  },
  template:
    '<div class="note-list">' +
    '<h1 class="w3-text-teal">Notes</h1>' +
    '<a href="/note/new"><i class="fa fa-plus-square"> new</i></a>' +
    '<ul v-for="note in notes">' +
    '  <li><a v-bind:href="\'note/\' + note.id ">{{ note.title }}</a>' +
    '  <span v-if="note.author_uid">by {{ note.author_name }}</span>' +
    '  on {{ note.created_on.toDateString() }}' +
    '  </li>' +
    '</ul>' +
    '</div>'
});
