# Source IP Mapping - Solusi NAT Issue

## Masalah
Ketika Mikrotik mengirim log melalui NAT, Source IP yang ditampilkan di Analysis page adalah IP pengirim paket UDP (IP NAT/gateway), bukan IP Mikrotik yang sebenarnya.

## Solusi yang Diterapkan

### 1. DeviceManager
LogScope sekarang menggunakan `DeviceManager` yang secara otomatis:
- **Mendeteksi** setiap Mikrotik yang mengirim syslog untuk pertama kalinya
- **Menyimpan mapping** antara hostname (dari log) dan IP pengirim sebenarnya (dari UDP packet header)
- **Memisimpan data** dalam file `config/devices.json` untuk referensi

### 2. Automatic Device Registration
Setiap kali syslog diterima, sistem akan:
1. Parse pesan log untuk mendapatkan hostname
2. Ambil Source IP dari UDP packet header (`rinfo.address`)
3. Membuat mapping: `hostname → sentFromIP`
4. Simpan ke `config/devices.json`

**Contoh devices.json:**
```json
{
  "unknown": {
    "hostname": "unknown",
    "sentFromIP": "192.168.203.254",     ← IP Mikrotik yang sebenarnya!
    "firstSeen": "2025-11-07T14:02:12.901Z",
    "lastUpdated": "2025-11-07T14:03:10.568Z",
    "displayName": "Mikrotik-Main",
    "actualIP": "192.168.203.254"
  }
}
```

### 3. API Endpoints untuk Device Management

#### GET /api/devices
Mendapatkan daftar semua devices yang ter-register
```bash
curl http://localhost:3000/api/devices
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "hostname": "unknown",
      "sentFromIP": "192.168.203.254",
      "displayName": "Mikrotik-Main",
      "actualIP": "192.168.203.254"
    }
  ]
}
```

#### GET /api/devices/:hostname
Mendapatkan info device tertentu
```bash
curl http://localhost:3000/api/devices/unknown
```

#### PUT /api/devices/:hostname
Update informasi device (ganti nama, lokasi, catatan, dll)
```bash
curl -X PUT http://localhost:3000/api/devices/unknown \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Mikrotik-Main-Office",
    "actualIP": "192.168.203.254",
    "location": "Ruang Server",
    "notes": "Main router untuk site utama"
  }'
```

## Cara Menggunakan

### Langkah 1: Verifikasi Device Registration
Buka Analysis page dan lihat logs. Device akan otomatis ter-register saat menerima log pertama.

### Langkah 2: Rename Device (Opsional)
Jika hostname menunjukkan "unknown", Anda bisa rename via API:

```bash
curl -X PUT http://localhost:3000/api/devices/unknown \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Mikrotik-kantor"}'
```

### Langkah 3: Lihat Device Mapping
```bash
curl http://localhost:3000/api/devices
```

Kolom penting:
- `sentFromIP`: **IP Mikrotik yang sebenarnya** (bukan NAT!)
- `displayName`: Nama yang bisa di-customize
- `hostname`: Nama dari syslog message

## Teknologi yang Digunakan

- **DeviceManager**: Mengelola device registration dan mapping
- **File-based storage** (`config/devices.json`): Persistent device data
- **API endpoints**: Untuk CRUD operations pada device

## File-file yang Terlibat

1. `utils/deviceManager.js` - Kelas untuk mengelola devices
2. `server.js` - Inisialisasi DeviceManager
3. `utils/syslogServer.js` - Registrasi device saat menerima log
4. `routes/api.js` - API endpoints untuk device management

## Informasi Teknis

### UDP Packet Header (rinfo)
Ketika syslog diterima via UDP, Node.js memberikan informasi:
```javascript
{
  address: '192.168.203.254',  ← IP Mikrotik asli (tidak bisa di-spoof)
  family: 'IPv4',
  port: 45801                   ← Port source
}
```

IP ini **tidak bisa di-spoof** karena datang langsung dari OS kernel saat menerima UDP packet.

## Jika Source IP Masih Menunjukkan Gateway (NAT Issue)

### Masalah
Jika Source IP yang tertangkap masih menunjukkan **IP Gateway/NAT Server** (bukan IP Mikrotik asli), ini adalah **masalah konfigurasi network**, bukan bug aplikasi.

### Solusi
Lihat **`MIKROTIK_SYSLOG_CONFIG.md`** untuk panduan lengkap tentang:
- ✅ **Solusi 1 (Terbaik)**: Target server LogScope langsung (tanpa NAT)
- ✅ **Solusi 2**: Gunakan loopback interface Mikrotik
- ✅ **Solusi 3**: Port forwarding khusus
- ✅ **Solusi 4**: Identifikasi via hostname
- ✅ **Solusi 5**: Static IP assignment

**Rekomendasi:** Baca `docs/MIKROTIK_SYSLOG_CONFIG.md` untuk setup yang optimal.

---

## Kesimpulan

- ✅ Source IP yang sebenarnya sudah **tertangkap di `sentFromIP`**
- ✅ Sistem secara **otomatis memetakan** setiap Mikrotik yang connect
- ✅ Data **persisten** disimpan di `config/devices.json`
- ✅ **API tersedia** untuk manage device information
- ✅ **Secure** - IP dari kernel UDP header tidak bisa di-spoof
- ✅ **Hostname mapping** sebagai fallback jika ada NAT

### Catatan tentang NAT
Jika Mikrotik mengirim syslog **melalui gateway yang melakukan NAT**, UDP header akan menunjukkan IP gateway. Ini bukan bug - solusinya adalah mengkonfigurasi Mikrotik untuk mengirim syslog **langsung ke server LogScope** tanpa melalui NAT. Lihat `MIKROTIK_SYSLOG_CONFIG.md` untuk detail lengkap.
