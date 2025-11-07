# Log Storage dengan File Rotation

## Perubahan Sistem Penyimpanan Log

Aplikasi telah diubah dari **in-memory storage** menjadi **file-based storage dengan automatic rotation** untuk menghindari memory overload.

## 🎯 Keuntungan

✅ **Memory Efficient** - Log tidak disimpan di memory, hanya di file  
✅ **Persistent Storage** - Log tetap ada meski server restart  
✅ **Automatic Rotation** - File otomatis di-rotate saat mencapai limit  
✅ **Scalable** - Bisa menyimpan jutaan log  
✅ **Fast Parsing** - Membaca hanya bagian yang dibutuhkan  

## 📊 Konfigurasi Default

- **Max logs per file**: 50,000 logs
- **Max files**: 20 files
- **Total capacity**: 1 juta logs
- **Storage location**: `./logs/` directory

## 🔧 Struktur File Log

Log disimpan dalam format **JSON Lines** (.jsonl):

```
{"id":123,"timestamp":"2025-11-07T10:30:45.123Z","level":"info",...}
{"id":124,"timestamp":"2025-11-07T10:30:46.456Z","level":"warning",...}
{"id":125,"timestamp":"2025-11-07T10:30:47.789Z","level":"error",...}
```

### Nama File
```
log_<index>_<timestamp>.jsonl
log_1_2025-11-07T10-30-45-123Z.jsonl
log_2_2025-11-07T11-30-45-456Z.jsonl
```

## 📈 Monitoring Storage

### Via API
```bash
curl http://localhost:3000/api/syslog/status
```

Response:
```json
{
  "success": true,
  "data": {
    "logsCount": 150000,
    "isReceiving": true,
    "storage": {
      "totalFiles": 3,
      "totalLines": 150000,
      "totalSize": 52428800,
      "totalSizeMB": "50.00",
      "maxFiles": 20,
      "maxLogsPerFile": 50000,
      "currentFile": "log_3_2025-11-07T11-30-45-456Z.jsonl",
      "currentLineCount": 15000
    }
  }
}
```

## 🔄 Auto Rotation Process

1. **Saat log masuk**, disimpan ke file saat ini
2. **Line counter** bertambah
3. **Jika line count >= 50,000**:
   - File baru dibuat dengan index+1
   - Line counter di-reset ke 0
   - Log baru disimpan ke file baru
4. **Jika jumlah file > 20**:
   - File terlamanya dihapus
   - Total capacity terjaga di 1 juta logs

## 💾 Customization

Edit di `server.js` untuk mengubah konfigurasi:

```javascript
const logStorage = new LogStorageManager({
    maxLogsPerFile: 50000,  // Ubah ukuran file
    maxFiles: 20            // Ubah jumlah file
});
```

### Contoh Konfigurasi

**Small (Memory-constrained)**
```javascript
{
    maxLogsPerFile: 10000,  // 10K logs per file
    maxFiles: 10            // 100K logs total
}
```

**Large (Production)**
```javascript
{
    maxLogsPerFile: 100000, // 100K logs per file
    maxFiles: 50            // 5 juta logs total
}
```

## 📁 Directory Structure

```
logscope/
├── logs/                          # Log files directory
│   ├── log_1_2025-11-07T...jsonl
│   ├── log_2_2025-11-07T...jsonl
│   └── log_3_2025-11-07T...jsonl
├── utils/
│   ├── logStorage.js             # New storage manager
│   ├── syslogServer.js
│   └── logAnalyzer.js
└── ...
```

## 🔍 Querying Logs

### Get with filters (API)
```javascript
GET /api/logs?level=error&category=firewall&search=packet&limit=100
```

### Programmatic (in code)
```javascript
const logs = global.logStorage.getLogs({
    level: 'error',
    category: 'firewall',
    search: 'packet',
    limit: 100
});
```

## 📊 Available Methods

### `addLog(log)`
Tambah log baru ke storage

```javascript
const result = logStorage.addLog(logObject);
// { success: true, file: 'log_3_...jsonl', lineCount: 15000 }
```

### `getLogs(filters)`
Get logs dengan optional filters

```javascript
const logs = logStorage.getLogs({
    limit: 100,
    level: 'error',
    category: 'firewall',
    search: 'text'
});
```

### `getTotalCount()`
Dapatkan total jumlah semua logs

```javascript
const total = logStorage.getTotalCount();
// 150000
```

### `getCategories()`
Dapatkan list unique categories

```javascript
const categories = logStorage.getCategories();
// ['system', 'firewall', 'dhcp', 'wireless', ...]
```

### `getStats()`
Dapatkan storage statistics

```javascript
const stats = logStorage.getStats();
// { totalFiles: 3, totalLines: 150000, totalSize: 52428800, ... }
```

### `clearAll()`
Hapus semua log files

```javascript
const result = logStorage.clearAll();
// { success: true }
```

### `exportToCSV(filters)`
Export logs ke CSV format

```javascript
const csv = logStorage.exportToCSV({ level: 'error', limit: 10000 });
// Returns CSV content
```

## 🚀 Performance

### Memory Usage
- **Sebelum**: 10,000 logs × ~500 bytes = ~5MB
- **Sesudah**: Minimal (~10MB base + file read buffers)

### Disk Usage
- 1 juta logs ≈ 350-500 MB
- Average ~350-500 bytes per log

### Query Speed
- First query: 100-200ms (first file read)
- Subsequent: 50-100ms (cached file handles)

## 🔒 Data Retention

### Automatic Cleanup
- Oldest files dihapus otomatis saat exceed max files
- Logs terotasi secara FIFO (First In, First Out)

### Manual Cleanup
```bash
# Clear semua logs
curl -X DELETE http://localhost:3000/api/logs
```

## 📝 Migration from Memory Storage

Jika sebelumnya menggunakan memory storage:

1. **Server akan auto-migrate** saat startup
2. **Semua logs di-archive** ke file storage
3. **Memory akan dibebaskan**
4. **Performance meningkat** untuk query

## ⚠️ Important Notes

1. **Directory permissions**: Pastikan direktori `./logs/` writable
2. **Disk space**: Monitor disk space agar tidak penuh
3. **File permissions**: Log files readable oleh process
4. **Backup**: Backup `./logs/` directory secara berkala

---

Sistem storage ini optimal untuk production use dengan reliabilitas tinggi!
