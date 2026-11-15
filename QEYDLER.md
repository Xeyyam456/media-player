# Qeydlər — görülən işlər

## 2026-11-15

### Bildirişdə növbəti / əvvəlki / pauza düymələrinin itməsi
- **Problem:** 2-3 mahnı dəyişəndən sonra bildiriş panelində düymələr itirdi, vaxt `00:00 / 00:00` görünürdü.
- **Səbəb:** `load()` hər mahnıda `setActiveForLockScreen`-i 2 dəfə çağırırdı. expo-audio native tərəfdə (`AudioControlsService.setPlayableOptions`) hər çağırışda `MediaSession`-ı bağlayıb yenisini qurur. Bildiriş bu arada bağlanmış sessiyaya düşəndə düymələr itirdi.
- **Həll:** `src/data/player.tsx` — `setActiveForLockScreen` yalnız bir dəfə çağırılır, sonrakı mahnılarda `updateLockScreenMetadata` işlənir (sessiyanı yenidən qurmur).

### Bildirişdən ardıcıl basılmaların udulması
- **Problem:** bildirişdə "növbəti"yə tez-tez basanda yalnız ilki işləyirdi, hər basılma arasında bir neçə saniyə gözləmək lazım idi.
- **Səbəb:** `once` filtri təkrar hadisəni 3 saniyə yox sayırdı (əvvəllər sessiya hər dəfə yenidən qurulduğu üçün bir basılma iki dəfə gəlirdi).
- **Həll:** pəncərə 300 ms-ə endirildi. Ölçmə: indi hər basılmada bir hadisə gəlir.

### Pleyer ekranında seek bar-ın yuxarı-aşağı tullanması
- **Səbəb:** ekran `justifyContent: 'space-between'` ilə qurulub, mahnı adı 1 və ya 2 sətir olanda blok hündürlüyü dəyişirdi.
- **Həll:** `src/app/player.tsx` — ad + ifaçı blokuna sabit hündürlük (2 sətir), mətn aşağıya düzülür.

### WhatsApp audiolarının açılmaması
- **Səbəb:** WhatsApp Business qovluğunda 67 faylın 56-sı boşdur (0 bayt) — WhatsApp silinmiş səsləri yer tutucu kimi saxlayır. ExoPlayer: `UnrecognizedInputFormatException`. Adi WhatsApp `.opus` faylları normal çalır.
- **Həll:** `src/data/library.tsx` — müddəti 0 olan fayllar siyahıya salınmır.

### Yalnız mp3 və mp4
- `src/data/library.tsx` — kitabxanada audiolardan yalnız `.mp3`, videolardan yalnız `.mp4` göstərilir.

### Mahnıya klik edəndə tam ekran pleyer
- `src/data/open-item.ts` — siyahıda mahnıya klik edəndə mahnı çalınır və `/player` ekranı açılır (kitabxana, sevimlilər, pleylist).

## Qeyd edilməli
- `src/data/player.tsx`-də `dbg()` lokal şəbəkəyə (`192.168.100.9:9999`) debug sorğuları göndərir — silinməlidir.
- `patches/expo-audio+58.0.12.patch` bildirişdə növbəti/əvvəlki düymələri üçün vacibdir (`npm install` zamanı `patch-package` tətbiq edir); expo-audio yenilənəndə yoxlanmalıdır.
