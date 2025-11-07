# LogScope - Real-time Syslog Analyzer

## ✅ Aplikasi Berhasil Dibuat dan Berjalan!

**Status**: Server aktif dan sudah menerima log dari Mikrotik!  
**Web Interface**: http://localhost:3000  
**Syslog Port**: UDP 1514  

## 🎉 Perubahan Besar - Upload File → Real-time Syslog

Aplikasi telah diubah dari **upload file log** menjadi **real-time syslog receiver**:

### ✨ Fitur Baru:
- ✅ Real-time log monitoring via UDP Syslog (RFC 3164)
- ✅ WebSocket untuk push notification ke dashboard
- ✅ Auto-update dashboard saat log baru masuk
- ✅ Multi-source support (terima dari banyak Mikrotik)
- ✅ Buffer 10,000 log terakhir dalam memory
- ✅ Halaman Configuration dengan panduan setup

## 🚀 Quick Start

### 1. Jalankan Server
```bash
cd /home/dionipe/logscope

# Port 1514 (tidak perlu sudo)
SYSLOG_PORT=1514 npm start

# Atau port 514 (standard, perlu sudo)
sudo npm start
```

### 2. Konfigurasi Mikrotik

Buka Winbox atau SSH ke Mikrotik, jalankan:

```bash
# Buat syslog action (ganti IP_SERVER dengan IP server Anda)
/system logging action
add name=logscope target=remote remote=IP_SERVER remote-port=1514

# Aktifkan logging
/system logging
add action=logscope topics=info
add action=logscope topics=warning
add action=logscope topics=error
add action=logscope topics=critical
```

### 3. Buka Dashboard

Browser ke: **http://localhost:3000**

Log akan muncul otomatis saat Mikrotik mengirim!

## 📋 Halaman Aplikasi

### 1. Dashboard (/)
- Real-time statistics cards
- Timeline chart (log per jam)
- Category distribution chart
- Recent errors table
- Auto-update via WebSocket

### 2. Configuration (/config)
- Server information (IP, port)
- Copy-paste Mikrotik commands
- Step-by-step setup guide
- Troubleshooting tips
- Test connection button

### 3. Analysis (/analysis)
- Advanced filtering (level, category, search)
- Sortable table
- Log details dialog
- Export to CSV
- Pagination

## 🛠️ Teknologi Stack

**Backend:**
- Express.js - Web framework
- dgram (Node.js) - UDP socket untuk syslog
- Socket.IO - Real-time WebSocket
- moment - Date/time parsing

**Frontend:**
- EJS - Template engine
- Element UI - Vue.js components
- Alpine.js - Lightweight reactivity
- Chart.js - Data visualization
- Axios - HTTP client

## 📊 Arsitektur

```
Mikrotik Router(s)
    │
    │ UDP Syslog (Port 1514)
    ↓
Syslog Server (dgram)
    │
    │ Parse & Store
    ↓
Global logsStore (Memory)
    │
    ├─→ REST API (/api/*)
    │
    └─→ WebSocket (Socket.IO)
         │
         ↓
    Dashboard (Browser)
```

## 🔧 Konfigurasi

### Environment Variables
```bash
PORT=3000           # Web server port
SYSLOG_PORT=1514    # Syslog UDP port
```

### Firewall
```bash
# UFW
sudo ufw allow 1514/udp
sudo ufw allow 3000/tcp

# iptables
sudo iptables -A INPUT -p udp --dport 1514 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## 📝 Format Log Mikrotik

Syslog RFC 3164 format:
```
<PRI>MMM DD HH:MM:SS hostname topic,level: message
```

Contoh:
```
<30>Nov  7 10:30:45 MikrotikRouter system,info router started
<28>Nov  7 10:31:00 MikrotikRouter firewall,warning: dropped packet
<27>Nov  7 10:31:15 MikrotikRouter dhcp,error: lease failed
```

## 🎯 Topics Mikrotik

Common topics untuk monitoring:

| Topic | Keterangan |
|-------|-----------|
| `system` | System events, startup, config changes |
| `firewall` | Firewall rules, dropped packets |
| `dhcp` | DHCP server assignments |
| `wireless` | WiFi client connect/disconnect |
| `hotspot` | Hotspot user login/logout |
| `ppp` | PPPoE/VPN connections |
| `interface` | Interface up/down |

### Log Semua Topics:
```bash
/system logging
add action=logscope topics=!debug
```

## 💡 Tips

### 1. Multiple Mikrotik
Semua Mikrotik bisa kirim ke server yang sama:
```bash
# Mikrotik 1
/system logging action
add name=logscope target=remote remote=192.168.1.100 remote-port=1514

# Mikrotik 2 (sama)
/system logging action
add name=logscope target=remote remote=192.168.1.100 remote-port=1514
```

### 2. Filter by Source IP
Di halaman Analysis, search by IP untuk filter log dari Mikrotik tertentu.

### 3. Export untuk Report
Filter log yang diperlukan, klik Export untuk download CSV.

### 4. Clear Buffer
```bash
curl -X DELETE http://localhost:3000/api/logs
```

## 🐛 Troubleshooting

### No logs appearing?

1. **Test network connectivity**
   ```bash
   # Dari Mikrotik
   /ping 192.168.1.100
   ```

2. **Check firewall**
   ```bash
   sudo ufw status
   telnet 192.168.1.100 1514
   ```

3. **Verify Mikrotik config**
   ```bash
   /system logging print
   /system logging action print
   ```

4. **Monitor UDP traffic**
   ```bash
   sudo tcpdump -i any -n udp port 1514
   ```

### Permission denied on port 514?

Gunakan port >= 1024 atau run dengan sudo:
```bash
# Option 1: Use non-privileged port
SYSLOG_PORT=1514 npm start

# Option 2: Run with sudo
sudo npm start  # Uses port 514
```

### Memory usage tinggi?

Default buffer: 10,000 logs. Edit `server.js` line 40-42 untuk adjust:
```javascript
if (global.logsStore.length > 10000) {
    global.logsStore = global.logsStore.slice(0, 10000);
}
```

## 📚 File Structure

```
logscope/
├── server.js                  # Main server + Syslog integration
├── routes/
│   ├── index.js              # Page routes
│   └── api.js                # REST API endpoints
├── utils/
│   ├── syslogServer.js       # Syslog UDP receiver
│   ├── logParser.js          # Log parsing utilities
│   └── logAnalyzer.js        # Statistics & analysis
├── views/
│   ├── layout.ejs            # Main layout template
│   ├── index.ejs             # Dashboard (real-time)
│   ├── config.ejs            # Configuration guide
│   ├── analysis.ejs          # Log analysis & filtering
│   ├── 404.ejs              # 404 page
│   └── error.ejs            # Error page
├── public/css/
│   └── style.css             # Custom styles
└── package.json
```

## 🔌 API Endpoints

- `GET /api/logs?level=&category=&search=&limit=` - Get filtered logs
- `GET /api/stats` - Get statistics
- `GET /api/timeline` - Get timeline data
- `GET /api/syslog/status` - Get syslog server status
- `DELETE /api/logs` - Clear all logs

## 🌐 WebSocket Events

**Server → Client:**
- `newLog` - New log received
- `stats` - Statistics update

**Client → Server:**
- `requestStats` - Request current stats

## 🚀 Production Deployment

### Recommendations:
1. Use PM2 for process management
2. Setup reverse proxy (nginx)
3. Use database (PostgreSQL/MongoDB) instead of memory
4. Implement authentication
5. Setup log rotation
6. Monitor disk space

### PM2 Example:
```bash
npm install -g pm2
pm2 start server.js --name logscope
pm2 startup
pm2 save
```

## 📞 Support

- Check `/config` page untuk setup guide
- View console untuk error messages
- Test dengan `/log warning "test"` di Mikrotik

---

**LogScope - Real-time Mikrotik Syslog Analysis** 🎯  
Built with Express, EJS, Element UI, Alpine.js & Socket.IO
