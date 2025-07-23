# Başvuru Botu

Discord sunucuları için başvuru sistemi sağlar. Kullanıcılar belirlenen kanaldan başvuru formu doldurabilir, yöneticiler başvuruları yönetim kanalından onaylayabilir veya reddedebilir.

## Kurulum

1. Gerekli bağımlılıkları yükle:
   ```
   npm install
   ```
2. `.env` dosyasına bot tokenini ekle:
   ```
   TOKEN=senin-bot-tokenin
   ```
3. Botu başlat:
   ```
   node index.js
   ```

## Kullanım
- `/basvuru-kurulum` komutuyla başvuru ve yönetim kanallarını ayarla.
- Kullanıcılar başvuru kanalındaki butona tıklayarak form doldurur.
- Başvurular yönetim kanalına gelir, yöneticiler onaylayabilir veya reddedebilir.

## Özellikler
- Modern ve sade başvuru formu
- 6 saatte bir başvuru limiti
- DM ile bilgilendirme
- Kolay kurulum ve kullanım

---
Geliştirici: erslly