#! /bin/bash
# ./monitor-docker.sh &

docker-compose up -d --build
NGROK=$(docker ps --format "{{.Names}}" | grep ngrok)

STATE=$(docker inspect --format "{{json .State.Health}}" $NGROK | jq -r '.Status')
while [ "$STATE" != "unhealthy" ] && [ "$STATE" != "null" ]
do
    sleep 30
    STATE=$(docker inspect --format "{{json .State.Health}}" $NGROK | jq -r '.Status')
done

docker-compose down
./monitor-docker.sh
