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
    '  <a v-bind:href="\'note/\' + note.id ">{{ note.data.title }}</a>' +
    '</ul>' +
    '</div>'
});
