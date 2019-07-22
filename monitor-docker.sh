#! /bin/bash

cd /github/raphael/github-webhook

docker-compose -d --build
NGROK=$(docker ps --format "{{.Names}}" | grep ngrok)

STATE=$(docker inspect --format "{{json .State.Health}}" $NGROK | jq -r '.Status')
while [ "$STATE" != "unhealthy" ] && [ "$STATE" != "null" ]
do
    STATE=$(docker inspect --format "{{json .State.Health}}" $NGROK | jq -r '.Status')
done

docker-compose down
./monitor-docker.sh
