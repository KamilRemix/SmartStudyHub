package com.smartstudyhub.mobile;

import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppChannel")
public class AppChannelPlugin extends Plugin {

    @PluginMethod
    public void getInstaller(PluginCall call) {
        String installer = "UNKNOWN";
        try {
            PackageManager pm = getContext().getPackageManager();
            installer = pm.getInstallerPackageName(getContext().getPackageName());
            if (installer == null) {
                installer = "UNKNOWN";
            }
        } catch (Exception e) {
            installer = "UNKNOWN";
        }

        JSObject ret = new JSObject();
        ret.put("installer", installer);
        call.resolve(ret);
    }
}
