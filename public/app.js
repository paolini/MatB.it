var db = firebase.firestore();
var md = window.markdownit();
md.use(window.markdownitMathjax());

function get_auth_config(auth_user) {
  /*
  create config for axios.put/post request with
  user auth information
  */
  if (auth_user) {
    return auth_user.getIdToken().then(function (token) {
      var config = {};
      config.headers = {'Authorization': 'Bearer ' + token};
      return config;
    });
  } else {
    return new Promise(function(resolve,reject){
      var config = {};
      resolve(config);
    });
  }
}

vueApp = {
  el: '#app',
  data: {
    debug: "this is the main app",
    user: null,
  },
  methods: {
    logout(event) {
      firebase.auth().signOut();
    }
  },
  created: function() {
    var that = this;
    firebase.auth().onAuthStateChanged(function(user) {
      old_user = that.user;
      if (user) {
        user.getIdToken().then(function(idToken) {
          axios.post('/api/v0/user/login', {}, {
            headers: {'Authorization': 'Bearer ' + idToken}
          }).then(function(data) {
            that.user = data.data.user;
            that.auth_user = user;
          }).catch(function(err) {
            console.log("error sending login message: " + err);
          });
        });
        that.$emit('userLogin', user);
      } else {
        that.$emit('userLogout', that.user);
        that.user = null;
        that.auth_user = null;
      }
    }, function(error) {
      console.log(error);
    });
  }
};

window.addEventListener('load', function() {
  var app = new Vue(vueApp);
});
