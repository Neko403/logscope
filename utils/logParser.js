const moment = require('moment');

/**
 * Parse Mikrotik log file
 * Expected format: 
 * Jan/01/2025 10:30:45 system,info router started
 * Jan/01/2025 10:30:46 firewall,info input: in:ether1 out:(none), proto TCP (SYN)
 */
class LogParser {
    parse(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const logs = [];

        for (let i = 0; i < lines.length; i++) {
            const log = this.parseLine(lines[i], i + 1);
            if (log) {
                logs.push(log);
            }
        }

        return logs;
    }

    parseLine(line, lineNumber) {
        try {
            // Regex untuk format Mikrotik log
            // Format: MMM/DD/YYYY HH:mm:ss category,level message
            const regex = /^(\w{3}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\s+([\w,]+)\s+(.+)$/;
            const match = line.match(regex);

            if (!match) {
                // Try alternative format: YYYY-MM-DD HH:mm:ss
                const altRegex = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+([\w,]+)\s+(.+)$/;
                const altMatch = line.match(altRegex);
                
                if (altMatch) {
                    return this.createLogObject(altMatch, lineNumber);
                }
                
                // If no match, return raw line
                return {
                    id: lineNumber,
                    timestamp: new Date(),
                    category: 'unknown',
                    level: 'info',
                    message: line,
                    raw: line
                };
            }

            return this.createLogObject(match, lineNumber);
        } catch (error) {
            console.error('Error parsing line:', error);
            return null;
        }
    }

    createLogObject(match, lineNumber) {
        const [, timestamp, categoryLevel, message] = match;
        const [category, level] = this.parseCategoryLevel(categoryLevel);

        return {
            id: lineNumber,
            timestamp: this.parseTimestamp(timestamp),
            category: category,
            level: level,
            message: message.trim(),
            raw: match[0]
        };
    }

    parseCategoryLevel(categoryLevel) {
        const parts = categoryLevel.split(',');
        
        if (parts.length === 1) {
            return [parts[0], 'info'];
        }

        const category = parts.slice(0, -1).join(',');
        const level = parts[parts.length - 1];

        return [category, level];
    }

    parseTimestamp(timestamp) {
        // Try multiple formats
        const formats = [
            'MMM/DD/YYYY HH:mm:ss',
            'YYYY-MM-DD HH:mm:ss',
            'DD/MMM/YYYY HH:mm:ss'
        ];

        for (const format of formats) {
            const parsed = moment(timestamp, format);
            if (parsed.isValid()) {
                return parsed.toDate();
            }
        }

        return new Date();
    }
}

module.exports = new LogParser();
