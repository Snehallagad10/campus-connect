package com.example.campusconnect

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.SslErrorHandler
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null
    private var pendingDownload: DownloadRequest? = null
    private var pendingFileSave: PendingFileSave? = null
    private val activeDownloadIds = mutableSetOf<Long>()
    private val downloadManager by lazy { getSystemService(DOWNLOAD_SERVICE) as DownloadManager }

    private data class DownloadRequest(val url: String, val fileName: String, val mimeType: String)
    private data class PendingFileSave(val bytes: ByteArray, val fileName: String, val mimeType: String)

    private val downloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
            val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            if (!activeDownloadIds.remove(id)) return

            val query = DownloadManager.Query().setFilterById(id)
            downloadManager.query(query).use { cursor ->
                if (!cursor.moveToFirst()) {
                    showToast("Excel download failed. Check Downloads and try again.")
                    return
                }
                when (cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
                    DownloadManager.STATUS_SUCCESSFUL ->
                        showToast("Marks_Report.xlsx saved to Downloads")
                    else -> {
                        val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                        showToast("Excel download failed (code $reason). Check your connection and try again.")
                    }
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val completeFilter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, completeFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(downloadReceiver, completeFilter)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_REQUEST)
        }

        WebView.setWebContentsDebuggingEnabled(isDebuggableBuild())

        setContent {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { context ->
                    WebView(context).apply {
                        webView = this
                        clearCache(true)
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                        settings.loadsImagesAutomatically = true
                        settings.allowFileAccess = false
                        addJavascriptInterface(DownloadBridge(), "CampusConnectDownloads")

                        webViewClient = object : WebViewClient() {
                            override fun shouldInterceptRequest(
                                view: WebView,
                                request: WebResourceRequest
                            ): android.webkit.WebResourceResponse? {
                                if (request.url.host == API_HOST) {
                                    Log.i(TAG, "API request ${request.method} ${request.url.host}${request.url.encodedPath}")
                                }
                                return super.shouldInterceptRequest(view, request)
                            }

                            override fun onReceivedError(
                                view: WebView,
                                request: WebResourceRequest,
                                error: WebResourceError
                            ) {
                                if (request.url.host == API_HOST || request.url.host == FRONTEND_HOST) {
                                    Log.e(TAG, "WebView network error ${request.method} ${safeUrl(request.url)} code=${error.errorCode} ${redact(error.description.toString())}")
                                }
                                super.onReceivedError(view, request, error)
                            }

                            override fun onReceivedHttpError(
                                view: WebView,
                                request: WebResourceRequest,
                                response: android.webkit.WebResourceResponse
                            ) {
                                if (request.url.host == API_HOST && response.statusCode >= 400) {
                                    Log.e(TAG, "API HTTP ${response.statusCode} ${request.method} ${safeUrl(request.url)}")
                                }
                                super.onReceivedHttpError(view, request, response)
                            }

                            override fun onReceivedSslError(
                                view: WebView,
                                handler: SslErrorHandler,
                                error: SslError
                            ) {
                                Log.e(TAG, "TLS validation failed for ${error.url}: ${error.primaryError}")
                                handler.cancel()
                            }
                        }
                        webChromeClient = object : WebChromeClient() {
                            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                                if (consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                                    Log.e(TAG, "JavaScript error at ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}: ${redact(consoleMessage.message())}")
                                }
                                return true
                            }
                        }
                        setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
                            val name = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType)
                            beginDownload(DownloadRequest(url, name, mimeType ?: XLSX_MIME_TYPE))
                        })
                        loadUrl("https://campus-connect-gamma-taupe.vercel.app/");
                    }
                }
            )
        }
    }

    private fun isDebuggableBuild(): Boolean =
        applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0

    private fun safeUrl(uri: Uri): String = "${uri.host}${uri.encodedPath.orEmpty()}"

    private fun redact(value: String): String = value
        .replace(Regex("(?i)(password|token|authorization|cookie)(\\s*[:=]\\s*)[^\\s,;&]+")) {
            "${it.groupValues[1]}${it.groupValues[2]}[REDACTED]"
        }
        .replace(Regex("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"), "[REDACTED_EMAIL]")
        .take(300)

    private inner class DownloadBridge {
        @JavascriptInterface
        fun saveBase64File(base64Data: String?, fileName: String?, mimeType: String?): Boolean {
            return try {
                if (base64Data.isNullOrBlank() || fileName.isNullOrBlank()) {
                    throw IllegalArgumentException("The Excel report data is empty.")
                }
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                if (bytes.isEmpty() || bytes.size > MAX_EXPORT_BYTES) {
                    throw IllegalArgumentException("The Excel report is empty or too large to save.")
                }
                val safeName = fileName.substringAfterLast('/').substringAfterLast('\\')
                    .replace(Regex("[^A-Za-z0-9._ -]"), "_")
                    .let { if (it.endsWith(".xlsx", ignoreCase = true)) it else "$it.xlsx" }
                val save = PendingFileSave(
                    bytes,
                    safeName,
                    mimeType?.takeIf { it == XLSX_MIME_TYPE } ?: XLSX_MIME_TYPE,
                )
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                ) {
                    runOnUiThread {
                        pendingFileSave = save
                        requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), STORAGE_PERMISSION_REQUEST)
                    }
                    return true
                }
                saveFileToDownloads(save)
                true
            } catch (error: Exception) {
                Log.e(TAG, "Excel report save failed", error)
                showToast("Could not save Marks_Report.xlsx. Check available storage and try again.")
                return false
            }
        }
    }

    private fun saveFileToDownloads(save: PendingFileSave) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, save.fileName)
                put(MediaStore.Downloads.MIME_TYPE, save.mimeType)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Downloads storage is unavailable.")
            try {
                contentResolver.openOutputStream(uri, "w")?.use { it.write(save.bytes) }
                    ?: throw IllegalStateException("Could not open the Downloads file.")
                val completed = ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }
                contentResolver.update(uri, completed, null, null)
            } catch (error: Exception) {
                contentResolver.delete(uri, null, null)
                throw error
            }
        } else {
            val directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!directory.exists() && !directory.mkdirs()) throw IllegalStateException("Downloads folder is unavailable.")
            java.io.File(directory, save.fileName).outputStream().use { it.write(save.bytes) }
        }
        showToast("${save.fileName} saved to Downloads")
    }

    private fun beginDownload(request: DownloadRequest) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
        ) {
            pendingDownload = request
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), STORAGE_PERMISSION_REQUEST)
            return
        }
        enqueueDownload(request)
    }

    private fun enqueueDownload(request: DownloadRequest) {
        try {
            val uri = Uri.parse(request.url)
            val downloadRequest = DownloadManager.Request(uri)
                .setTitle(request.fileName)
                .setDescription("Downloading marks report")
                .setMimeType(request.mimeType)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, request.fileName)
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(false)

            CookieManager.getInstance().getCookie(request.url)?.let { downloadRequest.addRequestHeader("Cookie", it) }
            webView?.settings?.userAgentString?.let { downloadRequest.addRequestHeader("User-Agent", it) }
            webView?.url?.let { downloadRequest.addRequestHeader("Referer", it) }

            val id = downloadManager.enqueue(downloadRequest)
            activeDownloadIds.add(id)
            showToast("Excel download started. Track progress in notifications.")
        } catch (_: Exception) {
            showToast("Could not start Excel download. Check storage access and try again.")
        }
    }

    @Deprecated("Deprecated by Android; retained for API 24–28 storage permission callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) return
        if (requestCode != STORAGE_PERMISSION_REQUEST) return
        val request = pendingDownload
        pendingDownload = null
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED && request != null) {
            enqueueDownload(request)
        } else if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED && pendingFileSave != null) {
            val save = pendingFileSave
            pendingFileSave = null
            if (save != null) {
                try {
                    saveFileToDownloads(save)
                } catch (error: Exception) {
                    Log.e(TAG, "Excel report save failed", error)
                    showToast("Could not save ${save.fileName}. Check available storage and try again.")
                }
            }
        } else {
            pendingFileSave = null
            showToast("Storage permission was denied. The Excel file was not saved.")
        }
    }

    private fun showToast(message: String) {
        runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(downloadReceiver)
        } catch (_: IllegalArgumentException) {
            // Receiver was already unregistered by the system.
        }
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    companion object {
        private const val TAG = "CampusConnectWebView"
        private const val FRONTEND_HOST = "campus-connect-gamma-taupe.vercel.app"
        private const val API_HOST = "campus-connect-4pif.vercel.app"
        private const val STORAGE_PERMISSION_REQUEST = 4102
        private const val NOTIFICATION_PERMISSION_REQUEST = 4103
        private const val XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        private const val MAX_EXPORT_BYTES = 25 * 1024 * 1024
    }
}
