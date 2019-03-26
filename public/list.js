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
    }).catch(function(err){
      console.error(err);
    });
  },
  template:
    '<div class="note-list">' +
    '<h1 class="w3-text-teal">Notes</h1>' +
    '<a href="/note/new"><i class="fa fa-plus-square"> new</i></a>' +
    '<ul v-for="note in notes">' +
    '  <li><a v-bind:href="\'note/\' + note.id ">{{ note.data.title }}</a>' +
    '  <span v-if="note.data.author_uid">by {{ note.data.author_name }}</span>' +
    '  </li>' +
    '</ul>' +
    '</div>'
});
