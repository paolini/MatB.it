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
    }
  },
  created: function() {
    var that = this;
    axios.get('/api/v0/user').then(function (res) {
      that.user = res.data.user;
    }).catch(function(err){
      console.error(err);
    });
  }
};

window.addEventListener('load', function() {
  var app = new Vue(vueApp);
});
