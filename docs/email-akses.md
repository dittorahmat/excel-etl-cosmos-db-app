Subjek: Permohonan Penyesuaian Konfigurasi Azure AD (Pembaruan Lokasi Pengaturan)

Yth. Bapak/Ibu [Nama Administrator/Tim IT],

Semoga email ini menemukan Anda dalam keadaan baik.

Saya ingin memberikan pembaruan lanjutan terkait kendala autentikasi yang saya alami saat mengakses aplikasi [Nama Aplikasi Anda, jika ada, atau sebutkan "aplikasi yang sedang dikembangkan"] menggunakan akun Microsoft personal saya ([alamat email Anda, misal: ditto.asnar@gmail.com]).

Setelah mencoba penyesuaian `signInAudience` di manifes aplikasi dan membahas pesan kesalahan "Application must accept Access Token Version 2", ada satu klarifikasi penting mengenai lokasi pengaturan "Allow personal Microsoft accounts".

Berdasarkan investigasi lebih lanjut, pengaturan untuk mengizinkan akun Microsoft personal tidak berada langsung di bawah "External collaboration settings" seperti yang saya sebutkan sebelumnya. Sebaliknya, pengaturan tersebut berada di bagian **"All identity providers"** (atau **"Identity providers"**) di Azure Active Directory.

Jadi, berikut adalah langkah-langkah yang perlu dilakukan di Azure AD:

1.  **Pengaturan Penyedia Identitas**:
    *   Mohon navigasi ke **Azure Active Directory** > **External identities** > **All identity providers** (atau **Identity providers**).
    *   Di sana, pastikan **"Microsoft account"** diaktifkan. Ini adalah penyedia identitas yang mencakup akun personal Microsoft seperti Gmail, Outlook.com, dll.

2.  **Manifes Aplikasi (Application Manifest) - Gunakan "Microsoft Graph App Manifest (New)"**:
    *   Untuk pendaftaran aplikasi [Nama Aplikasi Anda di Azure AD, jika diketahui], mohon ubah properti `signInAudience` di bagian **Manifest** dari nilai saat ini (kemungkinan `AzureADMyOrg` atau `AzureADMultipleOrgs`) menjadi `AzureADandPersonalMicrosoftAccount`.
    *   **Tambahan**: Mohon juga tambahkan atau ubah properti `accessTokenAcceptedVersion` di manifes aplikasi menjadi `2`. Ini memastikan aplikasi dapat menerima token akses dari endpoint v2.0 Microsoft identity platform.

Menggunakan "Microsoft Graph App Manifest (New)" adalah pendekatan yang benar karena "AAD Graph App Manifest (Deprecating Soon)" adalah format lama yang akan segera tidak didukung.

Dengan penyesuaian ini, saya seharusnya dapat masuk ke aplikasi menggunakan akun personal saya, yang akan sangat membantu kelancaran pekerjaan saya dalam proyek ini.

Mohon informasinya jika ada hal lain yang saya bisa bantu atau jika Anda memerlukan detail lebih lanjut.

Terima kasih atas perhatian dan bantuan Anda.

Hormat saya,

[Nama Anda]