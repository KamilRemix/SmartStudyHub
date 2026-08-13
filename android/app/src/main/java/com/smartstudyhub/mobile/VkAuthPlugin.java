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
        try {
            com.vk.id.VKID.Companion.init(getContext());
            com.vk.id.VKID vkid = com.vk.id.VKID.Companion.getInstance();

            vkid.authorize(
                getActivity(),
                new com.vk.id.VKIDAuthCallback() {
                    @Override
                    public void onSuccess(com.vk.id.AccessToken accessToken) {
                        JSObject ret = new JSObject();
                        ret.put("token", accessToken.getToken());
                        ret.put("idToken", accessToken.getIdToken());
                        ret.put("userId", String.valueOf(accessToken.getUserId()));
                        call.resolve(ret);
                    }

                    @Override
                    public void Fail(com.vk.id.VKIDAuthFail fail) {
                        call.reject("VK Auth failed: " + fail.getDescription());
                    }
                },
                new com.vk.id.auth.VKIDAuthParams.Builder().build()
            );
        } catch (Throwable t) {
            JSObject ret = new JSObject();
            ret.put("webFallback", true);
            ret.put("reason", t.getMessage() != null ? t.getMessage() : "Native SDK unavailable");
            call.resolve(ret);
        }
    }
}
