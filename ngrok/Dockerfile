from node:slim

copy ./ngrok-stable-linux-amd64.zip /src/

run \
    apt-get update && \
    apt-get install -y unzip curl jq procps && \
    npm install --save express body-parser && \
    unzip /src/ngrok*.zip -d /src/ && \
    mv /src/ngrok /usr/local/bin/

copy ./entrypoint.sh ./healthcheck.sh /src/
run \
    chmod +x /src/entrypoint.sh && \
    chmod +x /src/healthcheck.sh


copy ./ngrok.yml /src/
workdir /src


HEALTHCHECK       \
    --timeout=3s \ 
    --retries=20  \
    CMD           \
        /src/healthcheck.sh

entrypoint ["/src/entrypoint.sh"]
cmd ["tail","-f","/dev/null"]
