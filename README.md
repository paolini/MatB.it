* install

npm install -g firebase-tools
npm install
cd functions ; npm install  # necessario?

* serve on localhost:

gcloud auth application-default login  # una tantum
firebase serve

* deployment to http://matb.in:

firebase deploy
