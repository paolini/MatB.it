var db = firebase.firestore();
var md = window.markdownit();
md.use(window.markdownitMathjax());
vueApp = {
  el: '#app',
  data: {
    debug: "this is the main app",
    user: null
  },
  methods: {
    logout(event) {
      firebase.auth().signOut();
    }
  },
  created: function() {
    var that = this;
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in.
        that.user = user;
        user.getIdToken().then(function(accessToken) {});
      } else {
        that.user = null;
      }
    }, function(error) {
      console.log(error);
    });
  }
};

window.addEventListener('load', function() {
  var app = new Vue(vueApp);
});
