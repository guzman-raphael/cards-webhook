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
cmd ["tail","-f","/dev/null"]
