const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const SyslogServer = require('./utils/syslogServer');
const LogStorageManager = require('./utils/logStorage');
const DeviceManager = require('./utils/deviceManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;
const SYSLOG_PORT = process.env.SYSLOG_PORT || 1514;  // Changed to 1514 (non-privileged port)

// Initialize log storage with file rotation
// Options: maxLogsPerFile (default 50000), maxFiles (default 20)
const logStorage = new LogStorageManager({
    maxLogsPerFile: 50000,  // 50,000 logs per file
    maxFiles: 20            // Keep max 20 files (1 million logs total)
});

// Initialize device manager
const deviceManager = new DeviceManager();

// Initialize syslog server
const syslogServer = new SyslogServer(parseInt(SYSLOG_PORT));

// Global references
global.logStorage = logStorage;
global.deviceManager = deviceManager;
global.io = io;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');

app.use('/', indexRouter);
app.use('/api', apiRouter);

// Syslog event handlers
syslogServer.on('log', (log) => {
    // Store ke file dengan rotation
    const result = global.logStorage.addLog(log);
    
    if (result.success) {
        // Emit to connected clients via WebSocket
        io.emit('newLog', log);
        
        console.log(`📝 Log received & stored: [${log.level}] ${log.category} - ${log.message.substring(0, 50)}...`);
    }
});

syslogServer.on('error', (error) => {
    console.error('Syslog server error:', error);
});

syslogServer.on('listening', (address) => {
    console.log(`✅ Syslog server ready to receive logs`);
});

// Start syslog server
try {
    syslogServer.start();
} catch (error) {
    console.error('Failed to start syslog server:', error);
    console.log('💡 Tip: Run with sudo if port < 1024, or use port >= 1024');
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected via WebSocket');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
    
    socket.on('requestStats', () => {
        const logAnalyzer = require('./utils/logAnalyzer');
        const logs = global.logStorage.getLogs({ limit: 10000 });
        const stats = logAnalyzer.getStatistics(logs);
        socket.emit('stats', stats);
    });
});

// Error handling
app.use((req, res, next) => {
    res.status(404).render('404', { 
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Error',
        message: err.message || 'Something went wrong!'
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 LogScope server is running on http://localhost:${PORT}`);
    console.log(`📡 Syslog listening on UDP port ${SYSLOG_PORT}`);
    console.log(`\n📋 Configure your Mikrotik to send logs to this server:`);
    console.log(`   /system logging action`);
    console.log(`   add name=remote target=remote remote=<YOUR_SERVER_IP> remote-port=${SYSLOG_PORT}`);
    console.log(`   /system logging`);
    console.log(`   add action=remote topics=info,warning,error,critical\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    syslogServer.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;
