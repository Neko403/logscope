# Konfigurasi Syslog Mikrotik untuk Source IP yang Benar

## Masalah
Source IP yang ditampilkan di LogScope adalah IP Gateway/NAT Server, bukan IP Mikrotik asli.

**Contoh:**
- IP Mikrotik asli: `192.168.203.254`
- IP yang ditangkap: `192.168.100.1` (IP gateway/NAT server)

## Penyebab
Ketika Mikrotik mengirim syslog melalui gateway yang melakukan NAT, UDP packet header menunjukkan IP sumber dari NAT device (gateway), bukan IP Mikrotik asli.

## Solusi

### ✅ Solusi 1: Target Server Langsung (Rekomendasi Terbaik)

Jika server LogScope bisa diakses langsung dari Mikrotik **tanpa harus melalui gateway**, konfigurasikan Mikrotik untuk mengirim langsung ke server:

**Di Mikrotik (Winbox atau SSH):**
```bash
/system logging action
add name=logscope_action target=remote remote=<IP_SERVER_LOGMTKLIZER> remote-port=1514

/system logging
add action=logscope_action topics=info
add action=logscope_action topics=warning
add action=logscope_action topics=error
add action=logscope_action topics=critical
```

**Di mana:**
- `<IP_SERVER_LOGMTKLIZER>` = IP server LogScope yang bisa diakses langsung dari Mikrotik
- Contoh: `192.168.1.100` (jika server dalam network yang sama)

**Keuntungan:**
- ✅ Source IP akan benar-benar IP Mikrotik asli
- ✅ Tidak melalui NAT

---

### ✅ Solusi 2: Gunakan Interface Loopback pada Mikrotik

Jika Mikrotik terpaksa kirim melalui gateway, pastikan menggunakan IP loopback/management Mikrotik sebagai source:

**Di Mikrotik:**
```bash
/ip address
add address=10.0.0.254/32 interface=loopback
print

/system logging action
add name=logscope_action target=remote remote=<IP_SERVER> remote-port=1514 src-address=10.0.0.254
```

**Catatan:** IP source tidak akan berubah (tetap IP gateway) karena NAT dilakukan di layer network, tapi at least source configuration sudah konsisten.

---

### ✅ Solusi 3: Port Forwarding Khusus (Jika Harus Melalui Gateway)

Jika Mikrotik harus mengirim melalui gateway karena routing:

**Di Gateway/NAT Server, forward port khusus:**
```bash
# Contoh di Linux gateway:
iptables -t nat -A PREROUTING -p udp --dport 1514 -j DNAT --to-destination 192.168.1.100:1514
iptables -t nat -A POSTROUTING -p udp -d 192.168.1.100 --dport 1514 -j SNAT --to-source <GATEWAY_IP>

# Atau di iptables modern:
nft add rule nat prerouting udp dport 1514 dnat ip saddr map { <MIKROTIK_IP>: 192.168.1.100 }
```

**Catatan:** Ini kompleks dan tidak dijamin bekerja dengan baik.

---

### ✅ Solusi 4: Gunakan Hostname + DNS Reverse Lookup (Alternatif)

Jika IP source tidak bisa diperbaiki, gunakan hostname Mikrotik dari syslog message:

**Di Mikrotik:**
```bash
# Set hostname dengan unik
/system identity set name=Mikrotik-Main

# Pastikan syslog include hostname
/system logging
add action=logscope_action topics=info
```

**Di LogScope:**
- LogScope sudah mendapatkan hostname dari pesan syslog
- Hostname ditampilkan dalam logs sebagai identitas device
- Di `config/devices.json`, hostname dipetakan ke IP yang mengirim

---

### ✅ Solusi 5: Identifikasi via DHCP Client ID atau Custom Header

Jika Mikrotik terhubung via DHCP, minta admin network untuk:
1. Assign IP statis ke Mikrotik
2. Atau backup config Mikrotik dengan identitas unik

**Di Mikrotik (backup config):**
```bash
/system identity set name=MikroTik_Kantor_A
/system package print
```

---

## Recommended Flow

**Untuk setup yang optimal:**

### Skenario A: Network Internal (Recommended)
```
Mikrotik (192.168.203.254) 
    ↓ UDP:1514 (direct, no NAT)
    ↓
LogScope Server (192.168.1.100)
    ↓
Source IP: 192.168.203.254 ✅ BENAR
```

**Konfigurasi:**
```bash
# Di Mikrotik
/system logging action
add name=logscope target=remote remote=192.168.1.100 remote-port=1514
```

### Skenario B: Network Terpisah (Melalui Gateway)
```
Mikrotik (192.168.203.254)
    ↓
    ↓ (via gateway NAT)
    ↓
LogScope Server
    ↓
Source IP: <Gateway IP> ⚠️ GATEWAY, bukan Mikrotik
```

**Solusi terbaik:**
- Buat route khusus untuk LogScope server di Mikrotik
- Atau move LogScope ke network yang lebih dekat dengan Mikrotik
- Atau map IP source dari syslog message hostname

---

## Verifikasi Konfigurasi

### Test dari Mikrotik
```bash
# SSH ke Mikrotik, test koneksi ke server
/tool fetch url="http://<IP_SERVER_LOGMTKLIZER>:3000/api/devices" keep-result=no
# Atau gunakan nc/netcat
/tool send-to-address address=<IP_SERVER> port=1514 data=test
```

### Check di LogScope
```bash
# Lihat last registered device
cat config/devices.json

# Check logs
tail -f logs/log_*.jsonl | grep -o '"source":"[^"]*"'
```

---

## Tabel Perbandingan Solusi

| Solusi | Effort | IP Benar | Notes |
|--------|--------|----------|-------|
| 1. Target Langsung | 🟢 Mudah | ✅ Ya | Best option, recommend |
| 2. Loopback Interface | 🟡 Sedang | ⚠️ Mungkin | Complex, not guaranteed |
| 3. Port Forward | 🔴 Sulit | ❌ Tidak | Not recommended |
| 4. Hostname Mapping | 🟢 Mudah | 🟡 Identitas | Already implemented |
| 5. Static IP + DHCP | 🟡 Sedang | ✅ Ya | Good alternative |

---

## Recommended Configuration Step-by-Step

### Step 1: Tentukan Network Architecture
```
1. Apakah Mikrotik bisa ping langsung ke server LogScope?
   - Jika YA → Gunakan solusi 1 (direct target)
   - Jika TIDAK → Lanjut ke step 2
```

### Step 2: Check Routing
```bash
# Di Mikrotik
/ip route print
/ip firewall nat print

# Lihat apakah ada masquerading yang mempengaruhi source
```

### Step 3: Implementasi Solusi 1 (Target Langsung)
```bash
# Di Mikrotik
/system logging action add \
    name=logscope_direct \
    target=remote \
    remote=<IP_SERVER_LOGMTKLIZER> \
    remote-port=1514 \
    src-address=<IP_MIKROTIK_YANG_AKAN_KE_SERVER>

/system logging add \
    action=logscope_direct \
    topics=info,warning,error,critical
```

### Step 4: Verify
```bash
# Check di LogScope
curl http://localhost:3000/api/devices
# Lihat sentFromIP - should be IP Mikrotik asli
```

---

## Debugging Commands di Mikrotik

```bash
# Lihat konfigurasi syslog
/system logging print
/system logging action print

# Test koneksi
/tool fetch url="http://<SERVER_IP>:3000" keep-result=no

# Ping server
/ping <SERVER_IP> count=3

# Trace route ke server
/tool traceroute <SERVER_IP>

# Lihat identity
/system identity print

# Lihat interfaces dan IP
/ip address print
/interface print
```

---

## Kesimpulan

**Root cause:** Syslog dari Mikrotik melalui NAT gateway, jadi UDP header source IP adalah gateway, bukan Mikrotik.

**Solusi terbaik:** Konfigurasi Mikrotik untuk mengirim syslog **langsung ke server LogScope tanpa melalui gateway** (Solusi 1).

**Fallback:** Gunakan hostname dari syslog message sebagai identitas, yang sudah ditangani oleh LogScope di `config/devices.json`.

**Untuk support lebih lanjut:**
1. Tentukan network topology Anda
2. Cek apakah Mikrotik bisa akses server LogScope langsung
3. Implementasikan solusi 1 atau 4 sesuai kebutuhan
