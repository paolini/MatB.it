* install

npm install -g firebase-tools
npm install
cd functions ; npm install  # necessario?

* serve on localhost:

gcloud auth application-default login  # una tantum
firebase serve

in caso di errore di autenticazione prova: 
    firebase logout 
    firebase login

* deployment to http://matb.it:

firebase deploy
