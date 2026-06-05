# WeatherFinder — Pertemuan 10 Praktikum

Aplikasi cuaca real-time React Native + Expo yang
mendemonstrasikan useEffect, debounce, dan integrasi API.

## Fitur
- Cari cuaca berdasarkan nama kota
- Debounce 500ms (hemat request)
- 4 kondisi UI: kosong / loading / error / sukses
- Data dari Open-Meteo (gratis, tanpa API key)

## Konsep yang Dipakai
- useState (4 state), useEffect (dependency array)
- Debounce dengan setTimeout + clearTimeout
- AbortController untuk cleanup & anti race-condition
- Conditional rendering dengan operator &&

## Cara Menjalankan
1. npm install
2. npx expo start
3. Scan QR dengan Expo Go

## Link
- Expo Snack: [[snack expo akses](https://snack.expo.dev/@stephanizz/weatherfinder)]

## Screenshot
![Kondisi Awal](screenshots/empty.png)
![Loading](screenshots/loading.png)
![Hasil](screenshots/result.png)

## Author
[Stephani Della Christin Zai] - [243303621228] - Universitas Prima Indonesia
