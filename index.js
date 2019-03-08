var db = firebase.firestore();
var number_span = document.getElementById("number_span");

function main() {
  db.collection("global").doc("public").get().then(
    function(r) {
      data = r.data();
      number_span.textContent = "" + data.counter;
    });
}

main();
