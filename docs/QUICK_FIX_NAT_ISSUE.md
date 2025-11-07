# QUICK FIX: Source IP Gateway Issue (NAT Problem)

## ⚡ Problem Anda
```
LogScope terima Source IP: 192.168.100.1 (Gateway)
Seharusnya: 192.168.203.254 (IP Mikrotik asli)
```

## ✅ Solusi Instant (3 Pilihan)

### 🟢 PILIHAN 1: Best Solution (Recommended)
**Setup Mikrotik untuk kirim syslog langsung ke server (bypass gateway)**

**Di Mikrotik (Winbox → Terminal):**
```
/system logging action
add name=logmtk target=remote remote=192.168.1.100 remote-port=1514

/system logging
add action=logmtk topics=info,warning,error,critical
```

**Requirement:**
- Ganti `192.168.1.100` dengan IP server LogScope
- Server harus accessible langsung dari Mikrotik (ping test)
- Tidak boleh melalui gateway yang melakukan NAT

**Verifikasi:**
```bash
# Dari Mikrotik, ping server
/ping 192.168.1.100
# Harus reply, berarti bisa direct connect
```

**Result:**
```
Source IP: 192.168.203.254 ✅ BENAR!
```

---

### 🟡 PILIHAN 2: Fallback (Jika direct connect tidak bisa)
**Gunakan API untuk set IP manual di LogScope**

```bash
curl -X PUT http://localhost:3000/api/devices/unknown \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Mikrotik-Kantor",
    "actualIP": "192.168.203.254",
    "location": "Ruang Server"
  }'
```

**Result:**
```json
{
  "hostname": "unknown",
  "sentFromIP": "192.168.100.1",      ← Gateway (dari NAT)
  "displayName": "Mikrotik-Kantor",   ← Nama custom
  "actualIP": "192.168.203.254"       ← ✅ IP actual
}
```

---

### 🔵 PILIHAN 3: Check Network Path
**Pastikan dulu apakah bisa direct connect atau harus via gateway**

```bash
# SSH ke Mikrotik
/tool traceroute 192.168.1.100
```

**Jika output:**
```
1  192.168.1.100 (direct)  ← BISA direct ✅ gunakan PILIHAN 1
1  192.168.100.1 (gateway) ← HARUS via gateway, gunakan PILIHAN 2
2  192.168.1.100
```

---

## 📋 Summary Table

| Pilihan | Effort | Source IP | Rekomendasi |
|---------|--------|-----------|-------------|
| 1: Direct Connection | 🟢 Mudah | ✅ Benar | **BEST** |
| 2: Manual API Set | 🟢 Mudah | 🟡 Config | Alternatif |
| 3: Check Path | 🟡 Medium | 📊 Info | Diagnosis |

---

## 🔧 Step-by-Step untuk Pilihan 1

### Step 1: Check Network
```bash
# SSH ke Mikrotik
/ping 192.168.1.100
```
**Jika reply → lanjut Step 2, Jika timeout → gunakan Pilihan 2**

### Step 2: Create Logging Action
```
/system logging action
add name=logmtk target=remote remote=192.168.1.100 remote-port=1514
```

### Step 3: Add Logging Rules
```
/system logging
add action=logmtk topics=info
add action=logmtk topics=warning
add action=logmtk topics=error
add action=logmtk topics=critical
```

### Step 4: Verify di LogScope
```bash
# Wait 5 seconds for logs to come in
curl http://localhost:3000/api/devices
```

**Expected output:**
```json
{
  "hostname": "unknown",
  "sentFromIP": "192.168.203.254",  ← ✅ NOW CORRECT!
  "firstSeen": "2025-11-07..."
}
```

---

## 🚀 Next Steps

1. **Pilih solusi** berdasarkan network Anda (1 atau 2)
2. **Implementasi** langkah-langkah di atas
3. **Verify** dengan curl command
4. **Selesai!** Source IP akan benar

---

## 📚 Dokumentasi Lengkap

- `docs/NAT_SOURCE_IP_ISSUE.md` - Penjelasan detail tentang NAT issue
- `docs/MIKROTIK_SYSLOG_CONFIG.md` - Guide konfigurasi Mikrotik lengkap
- `docs/SOURCE_IP_MAPPING.md` - Device mapping mechanism

---

## 💡 Tips

- **Jika masih bingung**: Cek dokumentasi di atas
- **Jika tidak bisa direct**: Gunakan Pilihan 2 (API manual set)
- **Jika perlu bantuan**: Siapkan output dari `/tool traceroute` dan `/ip route print`
