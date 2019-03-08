function main() {
  var db = firebase.firestore();
  db.collection("global").doc("public").get().then(
    function(r) {
      var number_span = document.getElementById("number_span");
      data = r.data();
      number_span.textContent = "" + data.counter;
    });
}

initApp = function() {
    document.getElementById("logout_a").onclick = function() {
      firebase.auth().signOut();};
    firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      var displayName = user.displayName;
      var email = user.email;
      var emailVerified = user.emailVerified;
      var photoURL = user.photoURL;
      var uid = user.uid;
      var phoneNumber = user.phoneNumber;
      var providerData = user.providerData;
      user.getIdToken().then(function(accessToken) {
        document.getElementById('if_logged_out').style.display = "none";
        document.getElementById('if_logged_in').style.display = "block";
        document.getElementById('account-details').innerHTML =
          displayName + " "
          + "<img src='"+ photoURL + "'>";
      });
    } else {
      // User is signed out.
      document.getElementById('if_logged_out').style.display = "block";
      document.getElementById('if_logged_in').style.display = "none";
      document.getElementById('account-details').textContent = 'null';
    }
  }, function(error) {
    console.log(error);
  });
};

window.addEventListener('load', function() {
  initApp();
  main();
});
