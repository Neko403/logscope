const dgram = require('dgram');
const EventEmitter = require('events');
const logParser = require('./logParser');

/**
 * Syslog Server untuk menerima log dari Mikrotik
 * Protocol: UDP Syslog (RFC 3164)
 * Default Port: 514
 */
class SyslogServer extends EventEmitter {
    constructor(port = 514, host = '0.0.0.0') {
        super();
        this.port = port;
        this.host = host;
        this.server = null;
        this.isRunning = false;
        this.stats = {
            received: 0,
            parsed: 0,
            errors: 0
        };
    }

    start() {
        if (this.isRunning) {
            console.log('Syslog server already running');
            return;
        }

        this.server = dgram.createSocket('udp4');

        this.server.on('error', (err) => {
            console.error(`Syslog server error:\n${err.stack}`);
            this.emit('error', err);
            this.server.close();
        });

        this.server.on('message', (msg, rinfo) => {
            this.handleMessage(msg, rinfo);
        });

        this.server.on('listening', () => {
            const address = this.server.address();
            console.log(`📡 Syslog server listening on ${address.address}:${address.port}`);
            this.isRunning = true;
            this.emit('listening', address);
        });

        this.server.bind(this.port, this.host);
    }

    handleMessage(msg, rinfo) {
        try {
            this.stats.received++;
            
            const message = msg.toString('utf8');
            console.log(`Received from ${rinfo.address}:${rinfo.port} - ${message}`);
            
            // Parse syslog message
            const parsedLog = this.parseSyslogMessage(message, rinfo);
            
            if (parsedLog) {
                this.stats.parsed++;
                
                // Register device jika deviceManager tersedia
                if (global.deviceManager && parsedLog.hostname) {
                    global.deviceManager.registerDevice(parsedLog.hostname, rinfo.address);
                }
                
                this.emit('log', parsedLog);
            } else {
                this.stats.errors++;
            }
        } catch (error) {
            this.stats.errors++;
            console.error('Error handling syslog message:', error);
            this.emit('error', error);
        }
    }

    parseSyslogMessage(message, rinfo) {
        try {
            // RFC 3164 Syslog format: <PRI>TIMESTAMP HOSTNAME TAG: MESSAGE
            // Mikrotik format: <PRI>MMM DD HH:MM:SS topic,level: message
            // Mikrotik minimal format: <PRI>topic,level: message
            
            // Extract priority
            const priMatch = message.match(/^<(\d+)>/);
            const priority = priMatch ? parseInt(priMatch[1]) : 0;
            
            // Remove priority from message
            let messageWithoutPri = message.replace(/^<\d+>/, '').trim();
            
            // Try to parse as Mikrotik log dengan RFC 3164 format (dengan timestamp dan hostname)
            const mikrotikMatch = messageWithoutPri.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(.+?)\s+([\w,]+):\s+(.+)$/);
            
            if (mikrotikMatch) {
                const [, timestamp, hostname, topicLevel, logMessage] = mikrotikMatch;
                const [topic, level] = this.parseTopicLevel(topicLevel);
                
                return {
                    id: Date.now() + Math.random(),
                    timestamp: this.parseTimestamp(timestamp),
                    source: rinfo.address,
                    hostname: hostname,
                    category: topic,
                    level: level,
                    message: logMessage.trim(),
                    priority: priority,
                    facility: Math.floor(priority / 8),
                    severity: priority % 8,
                    raw: message
                };
            }
            
            // Format minimal Mikrotik: topic,level: message (tanpa timestamp dan hostname)
            // Gunakan hostname/IP dari device mapping
            const minimalMatch = messageWithoutPri.match(/^([\w,]+):\s+(.+)$/);
            
            if (minimalMatch) {
                const [, topicLevel, logMessage] = minimalMatch;
                const [topic, level] = this.parseTopicLevel(topicLevel);
                
                // Coba dapat hostname dari device mapping
                let hostname = 'unknown';
                if (global.deviceManager) {
                    const device = global.deviceManager.getDeviceByIP(rinfo.address);
                    if (device) {
                        hostname = device;
                    }
                }
                
                return {
                    id: Date.now() + Math.random(),
                    timestamp: new Date(),
                    source: rinfo.address,
                    hostname: hostname,
                    category: topic,
                    level: level,
                    message: logMessage.trim(),
                    priority: priority,
                    facility: Math.floor(priority / 8),
                    severity: priority % 8,
                    raw: message
                };
            }
            
            // Fallback: generic syslog parsing
            const genericMatch = messageWithoutPri.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(.+?)\s+(.+)$/);
            
            if (genericMatch) {
                const [, timestamp, hostname, logMessage] = genericMatch;
                
                return {
                    id: Date.now() + Math.random(),
                    timestamp: this.parseTimestamp(timestamp),
                    source: rinfo.address,
                    hostname: hostname,
                    category: 'system',
                    level: this.severityToLevel(priority % 8),
                    message: logMessage.trim(),
                    priority: priority,
                    facility: Math.floor(priority / 8),
                    severity: priority % 8,
                    raw: message
                };
            }
            
            // If no pattern matches, create a basic log entry
            return {
                id: Date.now() + Math.random(),
                timestamp: new Date(),
                source: rinfo.address,
                hostname: 'unknown',
                category: 'system',
                level: 'info',
                message: messageWithoutPri,
                priority: priority,
                facility: Math.floor(priority / 8),
                severity: priority % 8,
                raw: message
            };
            
        } catch (error) {
            console.error('Error parsing syslog message:', error);
            return null;
        }
    }

    parseTopicLevel(topicLevel) {
        const parts = topicLevel.split(',');
        
        if (parts.length === 1) {
            return [parts[0], 'info'];
        }
        
        const topic = parts.slice(0, -1).join(',');
        const level = parts[parts.length - 1];
        
        return [topic, level];
    }

    parseTimestamp(timestamp) {
        try {
            // Syslog timestamp format: MMM DD HH:MM:SS
            const now = new Date();
            const months = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            
            const parts = timestamp.split(/\s+/);
            const month = months[parts[0]];
            const day = parseInt(parts[1]);
            const timeParts = parts[2].split(':');
            const hour = parseInt(timeParts[0]);
            const minute = parseInt(timeParts[1]);
            const second = parseInt(timeParts[2]);
            
            const date = new Date(now.getFullYear(), month, day, hour, minute, second);
            
            // If date is in the future, it's probably from last year
            if (date > now) {
                date.setFullYear(date.getFullYear() - 1);
            }
            
            return date;
        } catch (error) {
            return new Date();
        }
    }

    severityToLevel(severity) {
        const levels = {
            0: 'critical', // Emergency
            1: 'critical', // Alert
            2: 'critical', // Critical
            3: 'error',    // Error
            4: 'warning',  // Warning
            5: 'warning',  // Notice
            6: 'info',     // Informational
            7: 'info'      // Debug
        };
        return levels[severity] || 'info';
    }

    stop() {
        if (this.server && this.isRunning) {
            this.server.close(() => {
                console.log('Syslog server stopped');
                this.isRunning = false;
                this.emit('stop');
            });
        }
    }

    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            port: this.port,
            host: this.host
        };
    }

    resetStats() {
        this.stats = {
            received: 0,
            parsed: 0,
            errors: 0
        };
    }
}

module.exports = SyslogServer;
