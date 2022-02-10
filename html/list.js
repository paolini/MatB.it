Vue.component("note-list", {
  props: {
    private: Boolean
  },
  data: function(){
    return {
      notes: null
    };
  },
  created() {
    var that = this;
    var p = Promise.resolve({});
    if (this.private) {
      p = get_auth_config(that.$root.auth_user);
    }
    p.then(function (config) {
      if (that.private) {
        config.params = {private: 1};
      } else {
        config.params = {dummy: "pippo"};
      }

      return axios.get('/api/v0/note', config);
    }).then(function (res) {
        that.notes = res.data.data.notes;
        that.notes.forEach(function(note){
          note.created_on = new Date(note.created_on);
          note.updated_on = new Date(note.updated_on);
        });
    }).catch(function(err) {
      console.log(err);
    });
  },
  template:
    '<div class="note-list">' +
    '<ul v-if="notes !== null">' +
    '  <li v-if="!notes.length">...no items...</li>' +
    '  <li v-for="note in notes"><a v-bind:href="\'note/\' + note._id ">{{ note.title }}</a>' +
    '  <span v-if="note.author">by {{ note.author.displayName }}</span>' +
    '  on {{ note.created_on.toDateString() }}' +
    '  </li>' +
    '</ul>' +
    '<p v-else>...loading...</p>' +
    '</div>'
});
