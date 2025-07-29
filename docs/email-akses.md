Pak Ruben

Saya mau minta bantuan terkait akses aplikasi Excel ETL App, untuk permission deploy API & backend nya.  Untuk UI / frontendnya sudah bisa diakses di https://gray-flower-09b086c00.6.azurestaticapps.net/login , hanya saja belum tersambung dengan backend nya. 

Mohon bantuannya untuk memeriksa dan menyesuaikan pengaturan berikut di Azure Portal:

1.  **Verifikasi Konfigurasi Aplikasi API**:
    *   Navigasi ke **Azure Active Directory**.
    *   Di menu sebelah kiri, klik **"App registrations"**.
    *   Cari dan pilih aplikasi API Anda yang memiliki **Application ID URI** (juga dikenal sebagai `identifierUris`) `api://1a6232b5-e392-4b8d-9a30-23fb8642d9c0`.
    *   Setelah memilih aplikasi, di menu sebelah kiri, klik **"Expose an API"**.
    *   Pastikan bahwa scope `.default` sudah terdaftar dan statusnya **"Published"**.

2.  **Verifikasi Konfigurasi Aplikasi Klien**:
    *   Kembali ke **Azure Active Directory** > **"App registrations"**.
    *   Cari dan pilih aplikasi klien Anda yang memiliki **Client ID** `1a6232b5-e392-4b8d-9a30-23fb8642d9c0`.
    *   Setelah memilih aplikasi, di menu sebelah kiri, klik **"API permissions"**.
    *   Pastikan bahwa aplikasi ini telah diberikan izin (permission) untuk mengakses aplikasi API (`api://1a6232b5-e392-4b8d-9a30-23fb8642d9c0`).
    *   **Sangat Penting**: Di bagian atas halaman "API permissions", mohon klik tombol **"Grant admin consent for [Nama Tenant Anda]"** untuk memberikan persetujuan admin terhadap izin-izin tersebut.

Terima kasih sebelumnya atas waktu dan bantuannya 

