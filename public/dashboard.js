Vue.component("dashboard", {
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
    '<div class="dashboard">' +
    '  <h1 class="w3-text-teal">Notes</h1>' +
    '  <a href="/note/new"><i class="fa fa-plus-square"> new</i></a>' +
    '  <note-list></note-list>' +
    '  <div v-if="$root.user && $root.user.pro">' +
    '    <h1 class="w3-text-teal">Your Private Notes</h1>' +
    '    <note-list private></note-list>' +
    '  </div>' +
    '</div>'
});
