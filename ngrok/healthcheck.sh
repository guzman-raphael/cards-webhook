#! /bin/bash

# curl --fail http://localhost:4040/api/tunnels || exit 1

NGROK_URL=$(curl --fail http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name|test("http")) | .public_url')
RESP=$(curl --fail $NGROK_URL)
echo $RESP | grep -iv expire
