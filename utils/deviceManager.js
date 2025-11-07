const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

/**
 * Device Manager
 * Menyimpan dan mengelola mapping antara device (hostname/IP Mikrotik)
 * dan IP pengirim syslog (bisa berbeda karena NAT)
 */
class DeviceManager {
    constructor(configFile = null) {
        this.configDir = path.join(__dirname, '../config');
        this.configFile = configFile || path.join(this.configDir, 'devices.json');
        this.devices = {};
        this.reverseMap = {}; // Map dari rinfo.address ke device info
        this.hostnames = new Set();
        
        // Pastikan config directory ada
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        
        this.loadDevices();
    }

    loadDevices() {
        try {
            if (fs.existsSync(this.configFile)) {
                const data = fs.readFileSync(this.configFile, 'utf8');
                this.devices = JSON.parse(data);
                
                // Rebuild reverse map
                for (const [hostname, device] of Object.entries(this.devices)) {
                    if (device.sentFromIP) {
                        this.reverseMap[device.sentFromIP] = hostname;
                    }
                    this.hostnames.add(hostname);
                }
                
                console.log(`📱 Loaded ${Object.keys(this.devices).length} devices from config`);
            }
        } catch (error) {
            console.warn('Warning loading devices config:', error.message);
        }
    }

    saveDevices() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.devices, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving devices config:', error);
        }
    }

    /**
     * Register a device from syslog source
     * @param {string} hostname - Device hostname from syslog
     * @param {string} sentFromIP - IP address that sent the syslog packet
     * @returns {Object} Device info
     */
    registerDevice(hostname, sentFromIP) {
        // Jika device sudah ada
        if (this.devices[hostname]) {
            // Update IP jika berbeda
            if (this.devices[hostname].sentFromIP !== sentFromIP) {
                console.log(`🔄 Device "${hostname}" IP updated: ${this.devices[hostname].sentFromIP} → ${sentFromIP}`);
                this.devices[hostname].sentFromIP = sentFromIP;
                this.devices[hostname].lastUpdated = new Date().toISOString();
                this.reverseMap[sentFromIP] = hostname;
                this.saveDevices();
            }
            return this.devices[hostname];
        }

        // Buat device baru
        const device = {
            hostname: hostname,
            sentFromIP: sentFromIP,
            firstSeen: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            displayName: hostname // Bisa di-customize di UI
        };

        this.devices[hostname] = device;
        this.reverseMap[sentFromIP] = hostname;
        this.hostnames.add(hostname);
        this.saveDevices();
        
        console.log(`✅ New device registered: ${hostname} (from ${sentFromIP})`);
        return device;
    }

    /**
     * Get device info by hostname
     */
    getDeviceByHostname(hostname) {
        return this.devices[hostname] || null;
    }

    /**
     * Get device info by sent-from IP
     */
    getDeviceByIP(ip) {
        const hostname = this.reverseMap[ip];
        return hostname ? this.devices[hostname] : null;
    }

    /**
     * Get device hostname by any identifier
     * @param {string} identifier - Hostname atau IP
     */
    getDeviceHostname(identifier) {
        // Cek apakah identifier adalah hostname
        if (this.devices[identifier]) {
            return identifier;
        }

        // Cek apakah identifier adalah sent-from IP
        if (this.reverseMap[identifier]) {
            return this.reverseMap[identifier];
        }

        return null;
    }

    /**
     * Get all registered devices
     */
    getAllDevices() {
        return Object.values(this.devices);
    }

    /**
     * Get unique device hostnames
     */
    getDeviceNames() {
        return Array.from(this.hostnames);
    }

    /**
     * Update device display name
     */
    updateDeviceDisplayName(hostname, displayName) {
        if (this.devices[hostname]) {
            this.devices[hostname].displayName = displayName;
            this.saveDevices();
            return true;
        }
        return false;
    }

    /**
     * Set custom device info (IP Mikrotik asli, lokasi, dll)
     */
    setDeviceInfo(hostname, info) {
        if (this.devices[hostname]) {
            Object.assign(this.devices[hostname], info);
            this.devices[hostname].lastUpdated = new Date().toISOString();
            this.saveDevices();
            return true;
        }
        return false;
    }

    /**
     * Try to resolve hostname to actual Mikrotik IP via DNS
     * (Berguna jika DNS sudah di-config dengan benar)
     */
    async tryResolveHostname(hostname) {
        try {
            const addresses = await dns.resolve4(hostname);
            if (addresses && addresses.length > 0) {
                return addresses[0]; // Return IP pertama
            }
        } catch (error) {
            // DNS resolution failed, not critical
        }
        return null;
    }
}

module.exports = DeviceManager;
