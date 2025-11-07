const express = require('express');
const router = express.Router();
const logAnalyzer = require('../utils/logAnalyzer');

// Get logs with filters
router.get('/logs', (req, res) => {
    try {
        const { level, category, search, limit = 100 } = req.query;
        
        // Get logs from file storage with filters
        const filteredLogs = global.logStorage.getLogs({
            level: level,
            category: category,
            search: search,
            limit: parseInt(limit) || 100
        });

        const totalLogs = global.logStorage.getTotalCount();

        res.json({ 
            success: true, 
            data: filteredLogs,
            total: totalLogs,
            filtered: filteredLogs.length
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching logs: ' + error.message 
        });
    }
});

// Get statistics
router.get('/stats', (req, res) => {
    try {
        const logs = global.logStorage.getLogs({ limit: 10000 });
        const stats = logAnalyzer.getStatistics(logs);
        res.json({ 
            success: true, 
            data: stats 
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating statistics: ' + error.message 
        });
    }
});

// Get timeline data
router.get('/timeline', (req, res) => {
    try {
        const logs = global.logStorage.getLogs({ limit: 10000 });
        const timeline = logAnalyzer.getTimeline(logs);
        res.json({ 
            success: true, 
            data: timeline 
        });
    } catch (error) {
        console.error('Timeline error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating timeline: ' + error.message 
        });
    }
});

// Clear logs
router.delete('/logs', (req, res) => {
    try {
        global.logStorage.clearAll();
        res.json({ 
            success: true, 
            message: 'Logs cleared successfully' 
        });
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error clearing logs: ' + error.message 
        });
    }
});

// Get syslog server status
router.get('/syslog/status', (req, res) => {
    try {
        const stats = global.logStorage.getStats();
        res.json({
            success: true,
            data: {
                logsCount: stats.totalLines,
                isReceiving: stats.totalLines > 0,
                storage: stats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get unique categories
router.get('/categories', (req, res) => {
    try {
        const categories = global.logStorage.getCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get all registered devices
router.get('/devices', (req, res) => {
    try {
        const devices = global.deviceManager.getAllDevices();
        res.json({
            success: true,
            data: devices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get device info by hostname
router.get('/devices/:hostname', (req, res) => {
    try {
        const device = global.deviceManager.getDeviceByHostname(req.params.hostname);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update device info
router.put('/devices/:hostname', (req, res) => {
    try {
        const { displayName, actualIP, location, notes } = req.body;
        const success = global.deviceManager.setDeviceInfo(req.params.hostname, {
            displayName: displayName,
            actualIP: actualIP,
            location: location,
            notes: notes
        });

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = global.deviceManager.getDeviceByHostname(req.params.hostname);
        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
