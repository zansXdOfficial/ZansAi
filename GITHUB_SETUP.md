# Upload ke GitHub & hidupkan ZANE AI Studio

## 1. Buat repository
Di GitHub, buat repository baru, misalnya `zane-ai-studio`.
Jangan upload file `.env`.

## 2. Upload semua isi folder ini
Upload seluruh isi project ke repository tersebut.

## 3. Deploy
Kamu bisa deploy ke hosting Node.js yang mendukung environment variables.
Contoh alur:
- Connect repository GitHub.
- Build/install command: `npm install`
- Start command: `npm start`
- Environment variable:
  `OPENAI_API_KEY` = API key OpenAI kamu
- Port: gunakan `PORT` dari environment hosting; server sudah membaca `process.env.PORT`.

## 4. Watermark
Semua hasil generate/edit diberi watermark permanen:
`ZANE OFC`
di pojok kanan bawah dengan gaya font script/handwritten yang mendekati Matcha Mint.

Catatan: jika kamu memiliki file font resmi "Matcha Mint" dengan lisensi yang mengizinkan redistribusi,
letakkan file font di `public/fonts/` dan ubah `font-family` pada SVG watermark agar memakai file tersebut.
Project tidak menyertakan font berlisensi pihak ketiga tanpa izin.

## 5. Keamanan
- Jangan commit `.env`.
- Jangan menaruh API key di `public/app.js`.
- Gunakan environment variable pada hosting.
