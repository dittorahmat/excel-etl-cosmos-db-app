#!/usr/bin/env node

const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware to parse JSON and raw body for signature verification
app.use('/webhook', express.json({ verify: (req, res, buf) => {
    req.rawBody = buf;
}}));

// Webhook endpoint
app.post('/webhook', (req, res) => {
    // Verify GitHub signature
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.error('Invalid signature');
        return res.status(401).send('Not authorized');
    }

    // Check if it's a push event to main branch
    if (req.body.ref === 'refs/heads/main' || (req.body.ref && req.body.ref.includes('main'))) {
        console.log('Push to main branch detected, triggering deployment...');

        // Respond immediately to acknowledge webhook
        res.status(200).send('Webhook received, deployment triggered');

        // Run deployment in background
        setTimeout(() => {
            // Write a signal file that a monitoring process can detect
            fs.writeFileSync('/tmp/deploy_signal', Date.now().toString());
        }, 100);
    } else {
        res.status(200).send('Webhook received but not on main branch');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
    console.log(`Webhook server listening on port ${PORT}`);
});