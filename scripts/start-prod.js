const { spawn } = require('child_process');
const net = require('net');

async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

async function findAvailablePort(startPort) {
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        port++;
    }
    return port;
}

async function start() {
    const port = await findAvailablePort(3003);
    console.log(`Starting Study Assistant on port ${port}...`);
    
    const next = spawn('npx', ['next', 'start', '-p', port], {
        cwd: './web',
        stdio: 'inherit',
        shell: true
    });

    next.on('close', (code) => {
        process.exit(code);
    });
}

start();
