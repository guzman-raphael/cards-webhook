#! /bin/bash

ngrok authtoken $NGROK_TOKEN
ngrok start -config /src/ngrok.yml --all > /dev/null &
# ngrok http hook:4000 > /dev/null &

sleep 5

echo $(curl http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name|test("http")) | .public_url')

"$@"