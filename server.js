const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
// Updated to use your open HTTP port
const PORT = 8082; 

app.use(express.static(path.join(__dirname, 'public')));

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 TRADING JOURNAL SERVER IS LIVE ON PORT ${PORT}!`);
    console.log(`==================================================`);
    console.log(`💻 Local Access:    http://localhost:${PORT}`);
    console.log(`📶 Wi-Fi Access:    http://${localIP}:${PORT}`);
    console.log(`==================================================`);
    console.log(`[CLOSING THIS CONSOLE WINDOW WILL TURN THE SITE OFF]`);
});
