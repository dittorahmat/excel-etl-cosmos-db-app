# Certificate Renewal Setup

This document explains the automatic certificate renewal setup for the Excel to Cosmos DB Dashboard application.

## Overview

Let's Encrypt certificates expire every 90 days. To ensure continuous service without manual intervention, automatic certificate renewal has been set up using cron.

## Cron Job

A cron job has been added to check for certificate renewal twice daily:

```
0 2,14 * * * /home/iesr/excel-etl-cosmos-db-app/renew-certs.sh >> /var/log/certbot-renew.log 2>&1
```

This job runs at:
- 2:00 AM daily
- 2:00 PM daily

## Script

The renewal process is handled by `/home/iesr/excel-etl-cosmos-db-app/renew-certs.sh`, which:

1. Uses `certbot renew` to check if certificates need renewal
2. Copies renewed certificates to the application directory
3. Fixes file permissions
4. Reloads nginx to use the new certificates

## Log File

Renewal attempts and results are logged to `/var/log/certbot-renew.log`.

## Manual Renewal

To manually check for certificate renewal:

```bash
/home/iesr/excel-etl-cosmos-db-app/renew-certs.sh
```

## Verification

To check the current crontab entries:

```bash
crontab -l
```

## Troubleshooting

If certificate renewal fails:
1. Check the log file: `tail -f /var/log/certbot-renew.log`
2. Manually run the renewal script to see detailed output
3. Ensure port 80 is accessible for the renewal process