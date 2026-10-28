#!/bin/sh
# Self-signed certificate for https://localhost (spike only). Browsers will warn.
openssl req -x509 -newkey rsa:2048 -nodes -days 14 \
  -keyout localhost-key.pem -out localhost.pem \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
echo "Created localhost.pem and localhost-key.pem"
