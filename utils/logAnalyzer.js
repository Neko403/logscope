const moment = require('moment');

/**
 * Analyze parsed Mikrotik logs
 */
class LogAnalyzer {
    getStatistics(logs) {
        const stats = {
            total: logs.length,
            byLevel: {},
            byCategory: {},
            topCategories: [],
            recentErrors: [],
            timeRange: null
        };

        // Count by level
        logs.forEach(log => {
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        });

        // Count by category
        logs.forEach(log => {
            stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
        });

        // Top categories
        stats.topCategories = Object.entries(stats.byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Recent errors
        stats.recentErrors = logs
            .filter(log => log.level === 'error' || log.level === 'critical')
            .slice(-10)
            .reverse();

        // Time range
        if (logs.length > 0) {
            const timestamps = logs.map(log => new Date(log.timestamp));
            stats.timeRange = {
                start: new Date(Math.min(...timestamps)),
                end: new Date(Math.max(...timestamps))
            };
        }

        return stats;
    }

    getTimeline(logs, interval = 'hour') {
        const timeline = {};

        logs.forEach(log => {
            const time = moment(log.timestamp);
            let key;

            switch (interval) {
                case 'minute':
                    key = time.format('YYYY-MM-DD HH:mm');
                    break;
                case 'hour':
                    key = time.format('YYYY-MM-DD HH:00');
                    break;
                case 'day':
                    key = time.format('YYYY-MM-DD');
                    break;
                default:
                    key = time.format('YYYY-MM-DD HH:00');
            }

            if (!timeline[key]) {
                timeline[key] = {
                    timestamp: key,
                    total: 0,
                    info: 0,
                    warning: 0,
                    error: 0,
                    critical: 0
                };
            }

            timeline[key].total++;
            timeline[key][log.level] = (timeline[key][log.level] || 0) + 1;
        });

        return Object.values(timeline).sort((a, b) => 
            a.timestamp.localeCompare(b.timestamp)
        );
    }

    searchLogs(logs, query) {
        const searchTerm = query.toLowerCase();
        return logs.filter(log => 
            log.message.toLowerCase().includes(searchTerm) ||
            log.category.toLowerCase().includes(searchTerm)
        );
    }

    filterByLevel(logs, level) {
        return logs.filter(log => log.level === level);
    }

    filterByCategory(logs, category) {
        return logs.filter(log => log.category === category);
    }

    filterByTimeRange(logs, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= end;
        });
    }

    getUniqueCategories(logs) {
        const categories = new Set();
        logs.forEach(log => categories.add(log.category));
        return Array.from(categories).sort();
    }

    getUniqueLevels(logs) {
        const levels = new Set();
        logs.forEach(log => levels.add(log.level));
        return Array.from(levels).sort();
    }
}

module.exports = new LogAnalyzer();
