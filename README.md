# Perabot 3D

Studio desain bangunan & perabot 3D berbasis Web (siap untuk GitHub Pages dan fondasi konversi ke aplikasi Mobile).

## Fitur Awal (Fondasi MVP)
- **UI Studio Responsif (Desktop & Mobile Touch)**: Tata letak gelap ala Blender yang nyaman dipakai di browser PC maupun layar sentuh HP/Tablet.
- **Spawn Bentuk Dasar 3D**:
  - **Kubus** (balok, dinding, lantai)
  - **Segitiga** (prisma segitiga / atap bangunan)
  - **Silinder** (tiang, pilar, tabung)
- **Gizmo Panah Merah, Hijau, Biru (Ala Blender)**:
  - **Merah (Sumbu X)** — Geser kanan / kiri
  - **Hijau (Sumbu Y)** — Geser atas / bawah
  - **Biru (Sumbu Z)** — Geser depan / belakang
  - Dilengkapi mode **Putar (`R`)**, **Skala (`S`)**, **Snap Grid**, **Tempel ke Lantai (`Y=0`)**, **Duplikat**, dan **Undo/Redo**.
- **Ekspor `.GLB` & `.GLTF`**: Langsung dapat dibuka di Blender, Godot, Unity, Unreal Engine, atau Prisma3D.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

## Menghidupkan di GitHub Pages

Hasil build statis siap tayang sudah tersedia langsung di folder `/docs` (dengan `base: './'` dan `.nojekyll`). Untuk menyalakannya:
1. Buka **Settings → Pages** di repositori GitHub.
2. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
3. Pilih branch aktif (mis. `arena/e60f71ee-perabot` atau `main` setelah digabung) dan pilih folder **`/docs`**, lalu klik **Save**.

Untuk memperbarui isi `/docs` setelah mengubah kode:
```bash
npm run build:pages
```
