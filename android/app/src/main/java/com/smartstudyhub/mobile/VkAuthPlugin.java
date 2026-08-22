package com.smartstudyhub.mobile;

import android.content.Context;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "VkAuth")
public class VkAuthPlugin extends Plugin {

    public static final String VK_APP_ID = "54715317";

    @PluginMethod
    public void getSimCountry(PluginCall call) {
        String countryIso = "";
        try {
            TelephonyManager tm = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                countryIso = tm.getNetworkCountryIso();
                if (countryIso == null || countryIso.isEmpty()) {
                    countryIso = tm.getSimCountryIso();
                }
            }
        } catch (Exception e) {
            countryIso = "";
        }

        JSObject ret = new JSObject();
        ret.put("countryIso", countryIso != null ? countryIso.toUpperCase(Locale.US) : "");
        ret.put("language", Locale.getDefault().getLanguage());
        call.resolve(ret);
    }

    @PluginMethod
    public void startVkAuth(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("webFallback", true);
        ret.put("reason", "Native SDK compilation issue with 2.4.0");
        call.resolve(ret);
    }
}
