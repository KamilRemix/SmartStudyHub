package com.smartstudyhub.mobile;

import android.content.pm.PackageManager;
import android.telephony.TelephonyManager;
import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

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

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
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

        String simCountry = "";
        try {
            TelephonyManager tm = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                simCountry = tm.getNetworkCountryIso();
            }
        } catch (Exception e) {
            simCountry = "";
        }

        String systemLanguage = Locale.getDefault().getLanguage();

        JSObject ret = new JSObject();
        ret.put("installer", installer);
        ret.put("simCountry", simCountry != null ? simCountry.toLowerCase() : "");
        ret.put("systemLanguage", systemLanguage != null ? systemLanguage.toLowerCase() : "");
        
        call.resolve(ret);
    }
}
