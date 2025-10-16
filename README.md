# Belote-Enterprise
An enterpriese level application for semester 7 - Complex Software Systems at Fontys UAS.

## Run it yourself
This repository (currently) contains packages for the belote client and server applications. To run them, run the following commands in a terminal:
```
docker run -d --name belote-client -p 5173:80 ghcr.io/jimmmmothy/belote-client:latest
```
```
docker run -d --name belote-server -p 3000:3000 ghcr.io/jimmmmothy/belote-server:latest
```
Then, open four browser tabs at http://localhost:5173. Once you open four clients, the game knows it can start to play.