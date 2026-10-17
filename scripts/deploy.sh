#!/bin/sh
# Installare come root in /root/docker/matbit/deploy.sh (proprietario root,
# permessi 700). Gli aggiornamenti della copia installata sono manuali.
# La configurazione SSH/sudo e le istruzioni sono in .github/workflows/deploy.yml.
set -eu
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

[ "$#" -eq 0 ] || exit 2

exec 9>/run/lock/deploy-matbit.lock
flock -n 9 || {
    echo "Un deploy è già in corso" >&2
    exit 1
}

cd /root/docker/matbit
docker compose pull matbit
docker compose up -d --no-deps --no-build --wait --wait-timeout 120 matbit
