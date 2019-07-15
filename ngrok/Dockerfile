from node:slim

copy ./ngrok-stable-linux-amd64.zip /src/

run \
    apt-get update && \
    apt-get install -y unzip curl jq && \
    npm install --save express body-parser && \
    unzip /src/ngrok*.zip -d /src/ && \
    mv /src/ngrok /usr/local/bin/

copy ./entrypoint.sh /src/
run \
    chmod +x /src/entrypoint.sh


copy ./ngrok.yml /src/
workdir /src


HEALTHCHECK       \
    --timeout=3s \ 
    --retries=20  \
    CMD           \
        curl --fail http://localhost:4040/api/tunnels || exit 1  

entrypoint ["/src/entrypoint.sh"]
# cmd ngrok authtoken $TOK && ngrok http 80
# cmd ngrok authtoken $TOK && ngrok http 80 > /dev/null
cmd ["tail","-f","/dev/null"]


# ngrok http 80 > /dev/null &

# $(curl http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.name|test("http")) | .public_url')