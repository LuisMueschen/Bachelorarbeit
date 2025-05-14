FROM node:24-alpine3.20

# Root-Zugriff für Paketinstallation
USER root

# Arbeitsverzeichnis und Rechte setzen
WORKDIR /home/node

# Python + Pip + Abhängigkeiten installieren
RUN apk add --no-cache python3 py3-pip

# Benutzer setzen, Verzeichnis anlegen
USER node

# Code kopieren mit korrekten Rechten
COPY --chown=node:node . /home/node/

# Abhängigkeiten installieren & builden
RUN npm install
RUN npm run build

# Start-Befehl
CMD ["python3", "./server/frontendServer.py"]