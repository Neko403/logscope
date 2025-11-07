const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Log Storage Manager
 * Menyimpan log ke file dengan automatic rotation
 * Default: 50,000 logs per file, max 20 files (1 juta logs total)
 */
class LogStorageManager {
    constructor(options = {}) {
        this.logsDir = options.logsDir || path.join(__dirname, '../logs');
        this.maxLogsPerFile = options.maxLogsPerFile || 50000;
        this.maxFiles = options.maxFiles || 20;
        this.currentFile = null;
        this.currentLineCount = 0;
        this.fileIndex = 0;
        
        // Pastikan directory ada
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }

        this.initialize();
    }

    initialize() {
        try {
            // Cari file log yang paling baru
            const files = this.getLogFiles();
            
            if (files.length > 0) {
                // Ambil file yang paling baru
                const latestFile = files[files.length - 1];
                this.fileIndex = parseInt(latestFile.match(/log_(\d+)/)[1]);
                this.currentFile = latestFile;
                
                // Hitung jumlah lines di file terakhir
                this.currentLineCount = this.countLines(latestFile);
                
                console.log(`📂 Log storage initialized. Latest file: ${path.basename(latestFile)} (${this.currentLineCount} lines)`);
            } else {
                // Buat file pertama
                this.createNewFile();
                console.log(`📂 Log storage initialized. Created new log file`);
            }
        } catch (error) {
            console.error('Error initializing log storage:', error);
            this.createNewFile();
        }
    }

    createNewFile() {
        this.fileIndex++;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `log_${this.fileIndex}_${timestamp}.jsonl`;
        this.currentFile = path.join(this.logsDir, filename);
        this.currentLineCount = 0;
        
        // Buat file kosong
        fs.writeFileSync(this.currentFile, '');
        
        console.log(`✨ New log file created: ${filename}`);
        
        // Check jika sudah exceed max files, delete yang terlamanya
        this.checkAndCleanOldFiles();
    }

    getLogFiles() {
        try {
            const files = fs.readdirSync(this.logsDir)
                .filter(f => f.match(/^log_\d+_/))
                .map(f => path.join(this.logsDir, f))
                .sort();
            return files;
        } catch (error) {
            console.error('Error reading log files:', error);
            return [];
        }
    }

    countLines(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (!content) return 0;
            return content.split('\n').filter(line => line.trim()).length;
        } catch (error) {
            console.error('Error counting lines:', error);
            return 0;
        }
    }

    checkAndCleanOldFiles() {
        try {
            const files = this.getLogFiles();
            
            if (files.length > this.maxFiles) {
                const filesToDelete = files.slice(0, files.length - this.maxFiles);
                
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file);
                        console.log(`🗑️  Deleted old log file: ${path.basename(file)}`);
                    } catch (error) {
                        console.error(`Error deleting file ${file}:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('Error cleaning old files:', error);
        }
    }

    addLog(log) {
        try {
            // Cek apakah perlu rotate
            if (this.currentLineCount >= this.maxLogsPerFile) {
                this.createNewFile();
            }

            // Simpan log sebagai JSON Lines format (satu JSON per line)
            const logLine = JSON.stringify(log) + '\n';
            fs.appendFileSync(this.currentFile, logLine);
            this.currentLineCount++;

            return {
                success: true,
                file: path.basename(this.currentFile),
                lineCount: this.currentLineCount
            };
        } catch (error) {
            console.error('Error adding log:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get logs dengan optional filter
     * @param {Object} filters - { limit, level, category, search }
     */
    getLogs(filters = {}) {
        try {
            const limit = filters.limit || 100;
            const level = filters.level && filters.level !== 'all' ? filters.level : null;
            const category = filters.category && filters.category !== 'all' ? filters.category : null;
            const search = filters.search ? filters.search.toLowerCase() : null;

            const logs = [];
            const files = this.getLogFiles().reverse(); // Baca dari file terbaru

            // Baca semua files dari yang paling baru
            for (const file of files) {
                if (logs.length >= limit) break;

                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const lines = content.split('\n').filter(l => l.trim());

                    // Baca dari belakang (newest logs first)
                    for (let i = lines.length - 1; i >= 0 && logs.length < limit; i--) {
                        try {
                            const log = JSON.parse(lines[i]);

                            // Apply filters
                            if (level && log.level !== level) continue;
                            if (category && log.category !== category) continue;
                            if (search && !log.message.toLowerCase().includes(search)) continue;

                            logs.push(log);
                        } catch (e) {
                            // Skip invalid JSON lines
                            continue;
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }

            return logs;
        } catch (error) {
            console.error('Error getting logs:', error);
            return [];
        }
    }

    /**
     * Get total logs count
     */
    getTotalCount() {
        try {
            const files = this.getLogFiles();
            let total = 0;

            files.forEach(file => {
                total += this.countLines(file);
            });

            return total;
        } catch (error) {
            console.error('Error getting total count:', error);
            return 0;
        }
    }

    /**
     * Get all unique categories dari semua files
     */
    getCategories() {
        try {
            const categories = new Set();
            const files = this.getLogFiles();

            files.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const lines = content.split('\n').filter(l => l.trim());

                    lines.forEach(line => {
                        try {
                            const log = JSON.parse(line);
                            categories.add(log.category);
                        } catch (e) {
                            // Skip
                        }
                    });
                } catch (error) {
                    // Skip file errors
                }
            });

            return Array.from(categories).sort();
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    /**
     * Clear semua log files
     */
    clearAll() {
        try {
            const files = this.getLogFiles();

            files.forEach(file => {
                try {
                    fs.unlinkSync(file);
                    console.log(`🗑️  Deleted: ${path.basename(file)}`);
                } catch (error) {
                    console.error(`Error deleting ${file}:`, error);
                }
            });

            // Buat file baru
            this.fileIndex = 0;
            this.createNewFile();

            console.log('✅ All logs cleared');
            return { success: true };
        } catch (error) {
            console.error('Error clearing logs:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get storage stats
     */
    getStats() {
        try {
            const files = this.getLogFiles();
            let totalSize = 0;
            let totalLines = 0;

            files.forEach(file => {
                try {
                    const stat = fs.statSync(file);
                    totalSize += stat.size;
                    totalLines += this.countLines(file);
                } catch (e) {
                    // Skip
                }
            });

            return {
                totalFiles: files.length,
                totalLines: totalLines,
                totalSize: totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                maxFiles: this.maxFiles,
                maxLogsPerFile: this.maxLogsPerFile,
                currentFile: this.currentFile ? path.basename(this.currentFile) : 'none',
                currentLineCount: this.currentLineCount
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }

    /**
     * Export logs ke file
     */
    exportToCSV(filters = {}) {
        try {
            const logs = this.getLogs({ ...filters, limit: 100000 });
            
            const headers = ['Timestamp', 'Source', 'Hostname', 'Level', 'Category', 'Message'];
            const rows = logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.source || '',
                log.hostname || '',
                log.level,
                log.category,
                '"' + (log.message || '').replace(/"/g, '""') + '"'
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            return csv;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return null;
        }
    }
}

module.exports = LogStorageManager;
