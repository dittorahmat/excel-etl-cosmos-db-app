# HTTPS Setup for IP-based Access

Since you're accessing your application via IP address rather than a domain name, we'll use the self-signed certificates that are already included in your project.

## What's Been Configured

1. **Nginx** is set up to:
   - Listen on ports 80 and 443
   - Redirect all HTTP traffic to HTTPS
   - Use the self-signed certificates in the `certs` directory

2. **Docker Compose** is configured to:
   - Mount your certificates to the nginx container
   - Expose ports 80 and 443

## Deployment Steps

1. Make sure your `.env` file is properly configured with your Azure settings

2. Start the application:
   ```bash
   docker-compose up -d
   ```

3. Access your application:
   - Open your browser to `https://YOUR_SERVER_IP`
   - You'll see a security warning about the self-signed certificate
   - Proceed anyway (in Chrome: Advanced → Proceed to [IP])

## Certificate Information

The self-signed certificates are already included in your `certs` directory:
- `server.crt` - Certificate file
- `server.key` - Private key file

## Security Note

Since you're using self-signed certificates, browsers will show security warnings. This is expected behavior. For production use with a domain name, you should obtain valid certificates from a Certificate Authority like Let's Encrypt.

## Troubleshooting

1. **Port issues**: Ensure ports 80 and 443 are open on your VPS
2. **Permission errors**: Check that the certs directory and files have appropriate read permissions
3. **Connection refused**: Verify that the containers are running with `docker-compose ps`