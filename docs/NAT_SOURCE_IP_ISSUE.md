# NAT Source IP Issue - Penjelasan & Solusi

## 🔴 Masalah yang Anda Hadapi

```
Mikrotik (192.168.203.254)
    ↓
    ↓ Syslog via UDP:1514
    ↓
Gateway/NAT Server (192.168.100.1) ← Melakukan NAT/Masquerading
    ↓
    ↓ Paket UDP tampak berasal dari 192.168.100.1
    ↓
LogScope Server
    ↓
❌ Source IP ditangkap: 192.168.100.1 (Gateway, bukan Mikrotik!)
```

## 🔍 Mengapa Ini Terjadi?

Ketika paket UDP melalui gateway yang melakukan **NAT (Network Address Translation)** atau **Masquerading**, OS kernel mengganti source IP di header paket:

| Layer | IP |
|-------|-----|
| Original packet (Mikrotik) | 192.168.203.254 |
| After NAT (di gateway) | 192.168.100.1 ← LogScope menerima ini |

**Penting:** Ini bukan bug LogScope, ini adalah cara kerja NAT/masquerading di network layer!

---

## ✅ Solusi: Bypass NAT

### 🟢 Solusi Terbaik: Direct Connection (No NAT)

```
Mikrotik (192.168.203.254)
    ↓
    ↓ Syslog UDP:1514 (langsung, no NAT)
    ↓
LogScope Server (192.168.1.100)
    ↓
✅ Source IP: 192.168.203.254 (BENAR!)
```

**Konfigurasi di Mikrotik:**

```bash
# Option 1: Jika server dalam network yang sama
/system logging action
add name=logscope target=remote remote=192.168.1.100 remote-port=1514

/system logging
add action=logscope topics=info,warning,error,critical
```

**Requirement:**
- Server LogScope harus accessible langsung dari Mikrotik
- Tidak melalui gateway/NAT
- Network topology yang memungkinkan direct routing

---

### 🟡 Solusi Alternatif: Gunakan Hostname Mapping

Jika direct connection tidak bisa, LogScope sudah punya solusi:

```json
// config/devices.json
{
  "unknown": {
    "hostname": "Mikrotik-Main",        ← Identitas dari syslog
    "sentFromIP": "192.168.100.1",      ← IP yang diterima (gateway)
    "displayName": "Mikrotik-Kantor",
    "actualIP": "192.168.203.254",      ← Anda bisa set manual
    "location": "Ruang Server"
  }
}
```

Meskipun `sentFromIP` adalah gateway, Anda bisa set `actualIP` dan `displayName` untuk identifikasi yang benar.

**Via API:**
```bash
curl -X PUT http://localhost:3000/api/devices/unknown \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Mikrotik-Kantor-A",
    "actualIP": "192.168.203.254",
    "location": "Ruang Server Utama"
  }'
```

---

## 🎯 Diagnosis Network Anda

### Step 1: Check Network Path

```bash
# SSH ke Mikrotik, trace route ke server
/tool traceroute <IP_SERVER_LOGMTKLIZER>

# Output akan tunjukkan apakah melalui gateway atau direct
```

**Hasil Direct:**
```
1   192.168.1.100  (server langsung)
```

**Hasil Via Gateway (NAT):**
```
1   192.168.100.1  (gateway)
2   192.168.1.100  (server)
```

### Step 2: Test Ping Langsung

```bash
# Dari Mikrotik, ping server
/ping 192.168.1.100

# Jika reply, berarti bisa direct connect ✅
```

### Step 3: Setup Direct Connection

Jika direct connection mungkin:

```bash
# Di Mikrotik, set routing
/ip route add dst-address=<IP_SERVER>/32 gateway=<GATEWAY_TO_SERVER>

# Atau jika dalam network yang sama (no gateway needed)
/ip route print
```

---

## 📊 Tabel Solusi

| Situasi | Solusi | Source IP | Implementation |
|---------|--------|-----------|-----------------|
| Server dalam LAN yang sama | Direct target | ✅ Benar | Easy |
| Server di network berbeda + direct route possible | Direct + routing | ✅ Benar | Medium |
| Server hanya accessible via NAT gateway | Hostname mapping | 🟡 Gateway | Easy (built-in) |
| Multiple Mikrotik + gateway | Device aliases | 🟡 Gateway | Already ready |

---

## 🔧 Rekomendasi Implementasi

### For You (Admin):

1. **Check network connectivity:**
   ```bash
   # Dari Mikrotik
   /ping <IP_SERVER_LOGMTKLIZER>
   ```

2. **If ping OK → Gunakan Solusi 1 (Direct)**
   ```bash
   /system logging action
   add name=logmtk target=remote remote=<IP_SERVER> remote-port=1514
   ```

3. **If ping FAIL → Gunakan Solusi 2 (Hostname Mapping)**
   ```bash
   # Keep current setup, use API to set actual IP:
   curl -X PUT http://localhost:3000/api/devices/unknown \
     -d '{"actualIP":"192.168.203.254"}'
   ```

---

## 🚀 Verifikasi Setelah Setup

```bash
# Check registered devices
curl http://localhost:3000/api/devices

# Output harus menunjukkan IP Mikrotik yang benar di field yang sesuai:
# - sentFromIP: IP yang diterima UDP header
# - actualIP: IP actual Mikrotik (setelah Anda set)
# - displayName: Nama device
```

---

## 📚 Dokumentasi Lengkap

Untuk detail lebih lanjut tentang konfigurasi, lihat:
- `docs/MIKROTIK_SYSLOG_CONFIG.md` - Guide konfigurasi Mikrotik lengkap
- `docs/SOURCE_IP_MAPPING.md` - Source IP mapping mechanism

---

## 📝 Kesimpulan

| Aspek | Status |
|-------|--------|
| NAT gateway source IP problem | ✅ Dipahami |
| Root cause | ✅ Network layer (bukan app bug) |
| Solusi 1: Direct connection | ✅ Recommended |
| Solusi 2: Hostname mapping | ✅ Already built-in |
| Device tracking | ✅ Automatic |
| API untuk custom IP | ✅ Available |

**Action Item:**
1. Cek apakah server bisa di-akses direct dari Mikrotik
2. Jika ya → Setup direct connection di Mikrotik
3. Jika tidak → Gunakan API untuk set actualIP manual

**Support:** Jika butuh bantuan, siapkan output dari:
- `/tool traceroute <IP_SERVER>`
- `/ip route print`
- `/system logging print`
