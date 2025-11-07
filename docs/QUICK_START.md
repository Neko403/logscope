# 🚀 LogScope - Quick Start Guide

**File-based Mikrotik Log Analyzer dengan Real-time Monitoring**

## ⚡ Quick Start (2 menit)

### 1. Start Server
```bash
cd /home/dionipe/logscope
SYSLOG_PORT=1514 npm start
```

Harapkan output:
```
📂 Log storage initialized. Latest file: log_1_...jsonl (0 lines)
📡 Syslog server listening on 0.0.0.0:1514
🚀 LogScope server is running on http://localhost:3000
```

### 2. Buka Dashboard
```
http://localhost:3000
```

### 3. Configure Mikrotik
Di Mikrotik RouterOS:
```mikrotik
/system logging action
add name=remote target=remote remote=<YOUR_SERVER_IP> remote-port=1514

/system logging
add action=remote topics=info,warning,error,critical
```

## 📊 Dashboard Features

### Tab 1: Dashboard (Real-Time)
- **Live Stats Cards**: Info/Warning/Error/Total counts
- **Timeline Chart**: Logs per hour (last 24 hours)
- **Category Distribution**: Pie chart by log category
- **Recent Errors**: Table of latest error logs
- **Auto-Refresh**: Updates setiap log baru dari Mikrotik

### Tab 2: Configuration
- Server IP dan port information
- Step-by-step Mikrotik setup guide
- Topic selection options
- Troubleshooting tips

### Tab 3: Analysis & Filter
- Filter by Log Level (info/warning/error/critical)
- Filter by Category (system/firewall/dhcp/wireless/etc)
- Full-text search in messages
- Export to CSV
- Sortable table view

## 📁 File Storage System

### Where Logs Are Stored
```
./logs/log_<index>_<timestamp>.jsonl
```

### Auto-Rotation Rules
- **Trigger**: 50,000 logs per file
- **Cleanup**: Keep max 20 files (1M logs total)
- **Format**: JSON Lines (one log per line)

### Storage Status API
```bash
curl http://localhost:3000/api/syslog/status
```

Response:
```json
{
  "success": true,
  "data": {
    "logsCount": 1234,
    "isReceiving": true,
    "storage": {
      "totalFiles": 1,
      "totalLines": 1234,
      "totalSize": 425890,
      "totalSizeMB": "0.41",
      "maxFiles": 20,
      "maxLogsPerFile": 50000,
      "currentFile": "log_1_2025-11-07T13-12-18-928Z.jsonl",
      "currentLineCount": 1234
    }
  }
}
```

## 🔌 API Endpoints

### Get Logs
```bash
GET /api/logs?level=error&category=firewall&search=dropped&limit=100
```

Parameters:
- `level` - info, warning, error, critical (optional)
- `category` - filter by log category (optional)
- `search` - search in message field (optional)
- `limit` - number of logs to return (default: 100)

### Get Statistics
```bash
GET /api/stats
```

Returns: Info/Warning/Error counts, top categories

### Get Timeline
```bash
GET /api/timeline
```

Returns: Hourly aggregated log counts

### Get Categories
```bash
GET /api/categories
```

Returns: List of unique categories

### Delete All Logs
```bash
DELETE /api/logs
```

Hati-hati! Ini menghapus semua log files.

### Get Storage Status
```bash
GET /api/syslog/status
```

Returns: Storage statistics dan info

## 🔧 Configuration

### Customize Storage Size

Edit `server.js` line 18-21:

```javascript
const logStorage = new LogStorageManager({
    maxLogsPerFile: 50000,   // 👈 Ubah ukuran file
    maxFiles: 20             // 👈 Ubah jumlah file
});
```

### Change Syslog Port

```bash
SYSLOG_PORT=5140 npm start
```

### Change HTTP Port

```bash
PORT=8080 npm start
```

## 💾 Performance

### Memory Usage
- Constant ~10-20 MB (regardless of log volume)
- No memory accumulation over time
- Safe for long-running servers

### Disk Usage
- ~350-500 bytes per log entry
- 1 million logs ≈ 350-500 MB
- Auto-cleanup prevents disk overflow

### Query Speed
- First query: 100-200ms
- Subsequent queries: 50-100ms
- Efficient filtering with file-based storage

## 📊 Example Workflows

### Workflow 1: Monitor Failed Logins
```
1. Go to Analysis tab
2. Filter by level = "error"
3. Filter by category = "system"
4. Search for "login" atau "deny"
5. Click CSV Export
```

### Workflow 2: Find Firewall Issues
```
1. Dashboard tab → see timeline
2. Analysis tab
3. Filter category = "firewall"
4. Sort by latest first
5. Check message details
```

### Workflow 3: Export Daily Report
```
1. Analysis tab
2. Set level filters
3. Search by keywords
4. Click "Export to CSV"
5. Open in Excel/Google Sheets
```

## 🐛 Troubleshooting

### Logs tidak terima
**Problem**: Server running tapi Mikrotik logs tidak masuk
- Verifikasi firewall rules membolehkan port 1514 UDP
- Check IP address Mikrotik benar
- Verify log action dan logging rules di Mikrotik

### Dashboard kosong
**Problem**: Dashboard shows 0 logs
- Tunggu beberapa saat (logs mungkin belum diterima)
- Check `/logs` directory punya file
- Test API: `curl http://localhost:3000/api/logs`

### Port already in use
**Problem**: Error "EADDRINUSE: address already in use :::3000"
```bash
# Kill existing process
pkill -f "node server.js"
# Or use different port
PORT=3001 npm start
```

### Memory masih tinggi
**Problem**: Memory usage tidak stabil
- Verifikasi LogStorageManager initialization di server.js
- Check `/logs` directory has files (not in-memory)
- Restart server: `pkill -f "node server.js" && npm start`

## 📈 Monitoring Tips

### Check Storage Size
```bash
du -sh /home/dionipe/logscope/logs/
```

### Count Total Logs
```bash
wc -l /home/dionipe/logscope/logs/*.jsonl | tail -1
```

### View Recent Logs
```bash
tail -20 /home/dionipe/logscope/logs/log_1_*.jsonl
```

### Verify JSON Format
```bash
head -1 /home/dionipe/logscope/logs/log_1_*.jsonl | python3 -m json.tool
```

## 🔐 Data Retention

### Auto-cleanup
- Oldest files deleted automatically
- Keeps exactly `maxFiles` count
- No manual cleanup needed

### Manual Cleanup
```bash
# Clear all logs
curl -X DELETE http://localhost:3000/api/logs

# Or manually delete directory
rm -rf /home/dionipe/logscope/logs/
```

## 📝 Log Entry Format

```json
{
  "id": 1762521192818.3762,
  "timestamp": "2025-11-07T13:13:12.818Z",
  "source": "192.168.203.254",
  "hostname": "unknown",
  "category": "system",
  "level": "info",
  "message": "system,info,account user noc logged in from 192.168.202.202 via api",
  "priority": 0,
  "facility": 0,
  "severity": 0,
  "raw": "system,info,account user noc logged in from 192.168.202.202 via api"
}
```

## 🆘 Support

### Documentation Files
- `LOG_STORAGE.md` - Detailed storage documentation
- `IMPLEMENTATION_REPORT.md` - Technical implementation details
- `README.md` - Project overview

### Check Logs
```bash
# Application logs in terminal
npm start

# Stored logs in files
cat /home/dionipe/logscope/logs/log_*.jsonl
```

---

**Status**: ✅ Production Ready

**Version**: 1.0 with File-Based Storage

**Last Updated**: 2025-11-07
