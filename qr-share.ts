#!/usr/bin/env bun

import { serve } from "bun";
import qrcode from "qrcode";
import { networkInterfaces } from "os";

function generateHTML(fileName: string, qrDataUrl: string, url: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>QR Share - ${fileName}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .container {
            text-align: center;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
        }
        img {
            max-width: 300px;
            margin: 20px 0;
        }
        .url {
            word-break: break-all;
            margin: 10px 0;
            padding: 10px;
            background-color: #f8f8f8;
            border-radius: 5px;
            font-family: monospace;
        }
        #status {
            color: #666;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Scan to download ${fileName}</h2>
        <img src="${qrDataUrl}" alt="QR Code">
        <p class="url">${url}</p>
        <p id="status">Server running. You can close this window when done sharing.</p>
    </div>
    <script>
        const ws = new WebSocket('ws://' + window.location.host + '/ws');

        setInterval(() => {
            ws.send('heartbeat');
        }, 5000); // Every 5 seconds

        window.addEventListener('beforeunload', () => {
            ws.send('close');
        });
    </script>
</body>
</html>
    `;
}

function getLocalIP(): string {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        const interfaces = nets[name];
        if (!interfaces) continue;
        
        for (const net of interfaces) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

async function main() {
    if (process.argv.length !== 3) {
        console.error('Usage: qr-share <file-path>');
        process.exit(1);
    }

    const filePath = process.argv[2];
    const fileName = filePath.split('/').pop() ?? 'unknown';
    const file = Bun.file(filePath);

    if (!await file.exists()) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const sockets = new Set();
    const lastHeartbeats = new Map(); // Track last heartbeat time for each socket
    const HEARTBEAT_TIMEOUT = 15000; // 15 seconds timeout

    const ip = getLocalIP();
    const port = 3000;  // Could be anything
    const url = `http://${ip}:${port}/${encodeURIComponent(fileName)}`;
    const qrDataUrl = await qrcode.toDataURL(url);
    
    const html = generateHTML(fileName, qrDataUrl, url);

    // Check for stale connections periodically
    // just in case the client doesn't close the connection
    const heartbeatChecker = setInterval(() => {
        const now = Date.now();
        for (const [socket, lastHeartbeat] of lastHeartbeats.entries()) {
            if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
                console.log('Client heartbeat timeout, closing connection...');
                socket.end();
                lastHeartbeats.delete(socket);
                sockets.delete(socket);
            }
        }

        if (lastHeartbeats.size === 0 && sockets.size > 0) {
            console.log('No active connections, shutting down...');
            clearInterval(heartbeatChecker);
            process.exit(0);
        }
    }, 5000); // Check every 5 seconds

    const server = serve({
        port: port,
        fetch(req) {
            const url = new URL(req.url);

            if (url.pathname === "/ws") {
                if (server.upgrade(req)) {
                    return;
                }
            }

            if (decodeURIComponent(url.pathname.slice(1)) === fileName) {
                return new Response(file, {
                    headers: {
                        "Content-Disposition": `attachment; filename="${fileName}"`,
                    }
                });
            }

            return new Response(html, {
                headers: { "Content-Type": "text/html" }
            });
        },
        websocket: {
            message(ws, message) {
                if (message === 'close') {
                    console.log('Client closed, shutting down server...');
                    clearInterval(heartbeatChecker);
                    process.exit(0);
                }
                if (message === 'heartbeat') {
                    lastHeartbeats.set(ws, Date.now());
                }
            },
            close(ws) {
                sockets.delete(ws);
                lastHeartbeats.delete(ws);
                if (sockets.size === 0) {
                    console.log('All clients disconnected, shutting down...');
                    clearInterval(heartbeatChecker);
                    process.exit(0);
                }
            }
        },
    });

    // Open browser
    Bun.spawn(["open", `http://localhost:${port}`]);
    
    console.log(`Server running on port ${port}`);
    console.log(`Sharing: ${fileName}`);
    console.log(`URL: ${url}`);
}

main().catch(console.error);
