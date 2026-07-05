package com.fatpaper.minemonopoly;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "NativeUpdater")
public class NativeUpdaterPlugin extends Plugin {
    private DownloadManager downloadManager;
    private long downloadId = -1L;
    private String downloadedFileName;
    private long lastTransferred = 0L;
    private long lastSpeedTimestamp = 0L;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private Runnable progressRunnable;
    private boolean receiverRegistered = false;

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (completedId != downloadId) {
                return;
            }

            stopProgressPolling();
            DownloadSnapshot snapshot = queryDownloadSnapshot();
            if (snapshot == null) {
                notifyDownloadFailed("安装包下载状态未知，请重试");
                return;
            }

            if (snapshot.status == DownloadManager.STATUS_SUCCESSFUL) {
                notifyListeners("downloadComplete", new JSObject());
            } else {
                notifyDownloadFailed(snapshot.errorMessage);
            }
        }
    };

    @Override
    public void load() {
        super.load();
        downloadManager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (!receiverRegistered) {
            ContextCompat.registerReceiver(
                getContext(),
                downloadReceiver,
                new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                ContextCompat.RECEIVER_NOT_EXPORTED
            );
            receiverRegistered = true;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopProgressPolling();
        if (receiverRegistered) {
            getContext().unregisterReceiver(downloadReceiver);
            receiverRegistered = false;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            JSObject ret = new JSObject();
            ret.put("versionName", info.versionName != null ? info.versionName : "0.0.0");
            ret.put("versionCode", PackageInfoCompat.getLongVersionCode(info));
            ret.put("packageName", context.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("读取应用版本失败: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version", "latest");

        if (url == null || url.trim().isEmpty()) {
            call.reject("更新地址不能为空");
            return;
        }
        if (downloadManager == null) {
            call.reject("下载服务不可用");
            return;
        }

        try {
            if (downloadId != -1L) {
                downloadManager.remove(downloadId);
            }

            downloadedFileName = "MineMonopoly-Android-" + version + ".apk";
            File targetFile = getDownloadedApkFile();
            if (targetFile.exists() && !targetFile.delete()) {
                call.reject("无法覆盖旧的安装包，请手动清理后重试");
                return;
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("MineMonopoly 客户端更新");
            request.setDescription("正在下载底座安装包");
            request.setMimeType("application/vnd.android.package-archive");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(
                getContext(),
                Environment.DIRECTORY_DOWNLOADS,
                downloadedFileName
            );

            downloadId = downloadManager.enqueue(request);
            lastTransferred = 0L;
            lastSpeedTimestamp = 0L;
            startProgressPolling();
            call.resolve();
        } catch (Exception e) {
            call.reject("下载安装包失败: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void installDownloadedApk(PluginCall call) {
        File apkFile = getDownloadedApkFile();
        if (!apkFile.exists()) {
            call.reject("未找到已下载的安装包，请先重新下载");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settingsIntent);
            call.reject("请先允许当前应用安装未知来源应用，然后重试安装");
            return;
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(installIntent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("当前设备无法拉起安装器", e);
        } catch (Exception e) {
            call.reject("拉起安装器失败: " + e.getMessage(), e);
        }
    }

    private File getDownloadedApkFile() {
        File downloadDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        return new File(downloadDir, downloadedFileName != null ? downloadedFileName : "MineMonopoly-Android-latest.apk");
    }

    private void startProgressPolling() {
        stopProgressPolling();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                DownloadSnapshot snapshot = queryDownloadSnapshot();
                if (snapshot == null) {
                    return;
                }

                if (snapshot.status == DownloadManager.STATUS_RUNNING
                    || snapshot.status == DownloadManager.STATUS_PAUSED
                    || snapshot.status == DownloadManager.STATUS_PENDING) {
                    JSObject progress = new JSObject();
                    progress.put("percent", snapshot.percent);
                    progress.put("transferred", snapshot.transferred);
                    progress.put("total", snapshot.total);
                    progress.put("bytesPerSecond", snapshot.bytesPerSecond);
                    notifyListeners("download", progress);
                    progressHandler.postDelayed(this, 500);
                    return;
                }

                if (snapshot.status == DownloadManager.STATUS_FAILED) {
                    stopProgressPolling();
                    notifyDownloadFailed(snapshot.errorMessage);
                }
            }
        };
        progressHandler.post(progressRunnable);
    }

    private void stopProgressPolling() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }

    private DownloadSnapshot queryDownloadSnapshot() {
        if (downloadManager == null || downloadId == -1L) {
            return null;
        }

        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = downloadManager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                return null;
            }

            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long transferred = cursor.getLong(
                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
            );
            long total = cursor.getLong(
                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
            );
            int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));

            long now = System.currentTimeMillis();
            long bytesPerSecond = 0L;
            if (transferred > 0 && lastTransferred > 0 && lastSpeedTimestamp > 0L) {
                long elapsedMs = now - lastSpeedTimestamp;
                long deltaBytes = transferred - lastTransferred;
                if (elapsedMs > 0 && deltaBytes >= 0) {
                    bytesPerSecond = Math.round(deltaBytes / (elapsedMs / 1000.0));
                }
            }
            lastTransferred = transferred;
            lastSpeedTimestamp = now;

            double percent = total > 0 ? (transferred * 100.0) / total : 0;
            return new DownloadSnapshot(status, transferred, total, percent, bytesPerSecond, mapReason(reason));
        } catch (Exception e) {
            return null;
        }
    }

    private void notifyDownloadFailed(String message) {
        JSObject error = new JSObject();
        error.put("error", message != null ? message : "下载安装包失败");
        notifyListeners("downloadFailed", error);
    }

    private String mapReason(int reason) {
        switch (reason) {
            case DownloadManager.ERROR_CANNOT_RESUME:
                return "下载中断，无法继续";
            case DownloadManager.ERROR_DEVICE_NOT_FOUND:
                return "未找到存储设备";
            case DownloadManager.ERROR_FILE_ALREADY_EXISTS:
                return "安装包文件已存在";
            case DownloadManager.ERROR_FILE_ERROR:
                return "安装包文件写入失败";
            case DownloadManager.ERROR_HTTP_DATA_ERROR:
                return "网络数据错误";
            case DownloadManager.ERROR_INSUFFICIENT_SPACE:
                return "存储空间不足";
            case DownloadManager.ERROR_TOO_MANY_REDIRECTS:
                return "下载地址重定向过多";
            case DownloadManager.ERROR_UNHANDLED_HTTP_CODE:
                return "服务器返回了异常状态";
            case DownloadManager.ERROR_UNKNOWN:
            default:
                return "下载安装包失败";
        }
    }

    private static class DownloadSnapshot {
        final int status;
        final long transferred;
        final long total;
        final double percent;
        final long bytesPerSecond;
        final String errorMessage;

        DownloadSnapshot(
            int status,
            long transferred,
            long total,
            double percent,
            long bytesPerSecond,
            String errorMessage
        ) {
            this.status = status;
            this.transferred = transferred;
            this.total = total;
            this.percent = percent;
            this.bytesPerSecond = bytesPerSecond;
            this.errorMessage = errorMessage;
        }
    }
}
