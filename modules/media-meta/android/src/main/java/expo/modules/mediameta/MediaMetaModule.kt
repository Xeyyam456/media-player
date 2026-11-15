package expo.modules.mediameta

import android.media.MediaMetadataRetriever
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/** Audio faylın tag-lərini (ad, ifaçı, albom) və gömülü albom şəklini oxuyur. */
class MediaMetaModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw IllegalStateException("React context yoxdur")

  override fun definition() = ModuleDefinition {
    Name("MediaMeta")

    AsyncFunction("getMeta") { uri: String, withArt: Boolean ->
      val retriever = MediaMetadataRetriever()
      val result = mutableMapOf<String, Any?>("title" to null, "artist" to null, "album" to null, "art" to null)
      try {
        retriever.setDataSource(context, Uri.parse(uri))
        result["title"] = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
        result["artist"] = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
          ?: retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST)
        result["album"] = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
        if (withArt) {
          val bytes = retriever.embeddedPicture
          if (bytes != null) {
            val dir = File(context.cacheDir, "art")
            dir.mkdirs()
            val file = File(dir, "${uri.hashCode()}.jpg")
            if (!file.exists()) file.writeBytes(bytes)
            result["art"] = "file://" + file.absolutePath
          }
        }
      } catch (e: Exception) {
        // oxunmayan fayl: boş nəticə qaytarılır
      } finally {
        try {
          retriever.release()
        } catch (e: Exception) {
        }
      }
      result
    }
  }
}
