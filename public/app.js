var db = firebase.firestore();
var md = window.markdownit();

vueApp = {
  el: '#app',
  data: {
    debug: "this is the main app",
    user: null
  },
  created: function() {
    var that = this;
    document.getElementById("logout_a").onclick = function() {
      firebase.auth().signOut();
    };
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in.
        that.user = user;
        user.getIdToken().then(function(accessToken) {
          document.getElementById('if_logged_out').style.display = "none";
          document.getElementById('if_logged_in').style.display = "block";
          document.getElementById('user_display_name').textContent = user.displayName;
          document.getElementById('user_photo').src = user.photoURL;
        });
      } else {
        // User is signed out.
        document.getElementById('if_logged_out').style.display = "block";
        document.getElementById('if_logged_in').style.display = "none";
        document.getElementById('user_display_name').textContent = "anonymous";
        document.getElementById('user_photo').src = "";
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
