#! /bin/bash

ORG=vathes
REPO=provision-k8s

ngrok authtoken $NGROK_TOKEN
ngrok start -config /src/ngrok.yml --all > /dev/null &
# ngrok http hook:4000 > /dev/null &

sleep 5

NGROK_URL=$(curl http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name|test("http")) | .public_url')

OBJ=$(curl -X GET \
  https://api.github.com/repos/${ORG}/${REPO}/hooks \
  -H "Authorization: Bearer $GITHUB_TOKEN")

WH_ID=$(echo $OBJ | jq -r '.[].id')

curl -X PATCH \
  "https://api.github.com/repos/${ORG}/${REPO}/hooks/${WH_ID}" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "active": true,
    "events": [
        "issues",
        "pull_request"
    ],
    "config": {
        "content_type": "json",
        "insecure_ssl": "0",
        "url": "'$NGROK_URL'"
    }
}'

echo $NGROK_URL
date

"$@"