# Dashboard Monitoring Baterai (Frontend)

Cara cepat menjalankan interface frontend secara lokal:

1. Buka file `frontend/index.html` di browser (klik dua kali atau `File -> Open`).
2. Tekan tombol "Mulai Simulasi" untuk melihat data contoh bergerak.

Catatan integrasi:
- Untuk mengirim data nyata, panggil `window.dashboard.pushReading({voltage, current, temp, capacity})` atau `window.dashboard.pushReading({voltage, current, temp, soc})` dari kode lain (mis. WebSocket handler). `capacity` adalah persentase (0-100).

Estimasi:
- UI sekarang menampilkan estimasi sisa waktu berdasarkan `voltage` & `current` dan asumsi kapasitas nominal 100Ah @ 12V. Anda dapat menyesuaikan `NOMINAL_CAPACITY_AH` dan `NOMINAL_VOLTAGE` di `assets/app.js`.
