#!/bin/bash

# Generate self-signed certificate for HTTPS
mkdir -p certs
cd certs

# Generate private key with stronger encryption
openssl genrsa -out server.key 2048

# Generate a more comprehensive certificate signing request
cat > server.conf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = Organization
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate certificate signing request
openssl req -new -key server.key -out server.csr -config server.conf

# Generate self-signed certificate with SAN
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt -extensions v3_req -extfile server.conf

# Set proper permissions
chmod 600 server.key
chmod 644 server.crt

echo "Self-signed certificate generated in certs/ directory"
echo "Certificate: certs/server.crt"
echo "Private key: certs/server.key"
echo ""
echo "WARNING: This is a self-signed certificate. Browsers will show security warnings."
echo "For production use, replace with a certificate from a trusted Certificate Authority."