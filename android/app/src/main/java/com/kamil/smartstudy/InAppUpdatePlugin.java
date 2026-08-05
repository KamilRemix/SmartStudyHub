package com.kamil.smartstudy;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Capacitor plugin that launches the system PackageInstaller
 * for a downloaded APK file. Uses FileProvider with content:// URIs
 * to comply with Google Play Protect security requirements.
 *
 * NO silent / hidden installs — the user always sees the standard
 * Android installation confirmation screen.
 */
@CapacitorPlugin(name = "InAppUpdate")
public class InAppUpdatePlugin extends Plugin {

    @PluginMethod()
    public void installApk(PluginCall call) {
        String filePath = call.getString("path");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("Missing 'path' argument");
            return;
        }

        try {
            File apkFile = new File(filePath);
            if (!apkFile.exists()) {
                call.reject("APK file not found: " + filePath);
                return;
            }

            // Build a content:// URI via FileProvider (required for Android 7+)
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getContext().startActivity(intent);

            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            call.reject("Failed to launch installer: " + e.getMessage(), e);
        }
    }
}
