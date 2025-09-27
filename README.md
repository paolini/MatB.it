## development
Requirements:

* a mongodb database

Use docker to setup a database for local development.
The following command will start a mongodb server in a container using the local folder `/database` to store data permanently and exposing to the default port for mongo:
```bash
    docker-compose up -d
```
Use `docker-compose down` to stop the container. Use `mongo` to access the database.

### Clonare il database di produzione in locale

1. Esegui il dump dal server remoto (es. contabo3) e scaricalo:
> Prima verifica il nome del container MongoDB con:
```bash
ssh contabo3 'docker ps --format "{{.Names}}"'
```
Poi usa il nome corretto (ad esempio `matbit-mongodb` o `mongodb`):
```bash
ssh contabo3 'docker exec matbit-mongodb mongodump --archive' > dump.archive
```
2. Ripristina il dump nel database locale (assicurati che il container mongo sia attivo):
```bash
sudo docker exec -i docker-mongodb-1 mongorestore --archive < dump.archive
```

### Clonare il database di produzione in locale (one-liner)

Esegui direttamente (sostituisci il nome del container se necessario):
```bash
ssh contabo3 'docker exec matbit-mongodb mongodump --archive' | sudo docker exec -i docker-mongodb-1 mongorestore --archive
```

To install node libraries:
```bash
    npm ci
```
To start the server locally:
```bash
    npm run dev
```

Change version number in `package.json`.

## create docker image

```bash
docker build . -t paolini/matbit
docker tag paolini/matbit paolini/matbit:1.2.3
docker push paolini/matbit
```

## configuration

Use environment variables.
```
MONGODB_URI=mongodb://127.0.0.1:27017/matbit
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Environment variables can also be put in a `.env` file
in the root directory.

### Autenticazione

MatBit supporta autenticazione tramite provider OAuth (GitHub, Google) e autenticazione tramite email (magic link).

#### OAuth Providers

Per GitHub:
```bash
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

Per Google:
```bash
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Autenticazione Email

L'autenticazione tramite email utilizza "magic link" - non servono password, viene inviato un link sicuro via email.

**Opzione 1: SMTP (Gmail raccomandato)**
```bash
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

Configurazione Gmail:
1. Abilita l'autenticazione a due fattori
2. Genera una "App Password" dedicata in [Google Account Security](https://myaccount.google.com/security)
3. Usa la App Password come `EMAIL_SERVER_PASSWORD`

**Opzione 2: Resend (servizio email per sviluppatori)**
```bash
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
```

**NextAuth configurazione:**
```bash
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000  # o il tuo dominio in produzione
```

#### Sviluppo Locale - Email Testing

Per testare in locale senza inviare email reali, usa MailHog:
```bash
EMAIL_SERVER_HOST=localhost
EMAIL_SERVER_PORT=1025
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM=test@localhost
```

## migrations

See also `package.json` for script shortcuts.

Status:
```
npx migrate-mongo status
```
create a migration:
```
npx migrate-mongo create nome-della-migrazione
```
apply migrations:
```
npx migrate-mongo up
```
revert last migration:
```
npx migrate-mongo down
```

## deployment

create a `docker-compose.yml` starting from the template `docker-deploy.yml`.
Set a custom `SECRET`. Get your google keys.
Configure environment variables.

To start the service:
```bash
docker-compose up -d
```

To update the image:
```bash
docker-compose pull matbit
docker-compose up -d
```
