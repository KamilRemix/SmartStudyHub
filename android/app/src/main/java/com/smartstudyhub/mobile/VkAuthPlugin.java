package com.smartstudyhub.mobile;

import android.content.Context;
import android.telephony.TelephonyManager;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.LifecycleOwner;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.vk.id.VKID;
import com.vk.id.auth.VKIDAuthCallback;
import com.vk.id.VKIDAuthFail;
import com.vk.id.auth.VKIDAuthParams;
import com.vk.id.auth.AuthCodeData;
import com.vk.id.AccessToken;

import java.util.Locale;

@CapacitorPlugin(name = "VkAuth")
public class VkAuthPlugin extends Plugin {

    public static final String VK_APP_ID = "54715317";
    private boolean isVkInitialized = false;

    @Override
    public void load() {
        super.load();
        try {
            VKID.Companion.init(getContext());
            isVkInitialized = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

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
        if (!isVkInitialized) {
            JSObject err = new JSObject();
            err.put("webFallback", true);
            err.put("reason", "VKID not initialized");
            call.resolve(err);
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                LifecycleOwner owner = (LifecycleOwner) getActivity();
                VKIDAuthParams params = new VKIDAuthParams.Builder().build();

                VKID.Companion.getInstance().authorize(owner, new VKIDAuthCallback() {
                    @Override
                    public void onAuth(AccessToken token) {
                        JSObject ret = new JSObject();
                        ret.put("token", token.getToken());
                        if (token.getIdToken() != null) {
                            ret.put("idToken", token.getIdToken());
                        }
                        call.resolve(ret);
                    }

                    @Override
                    public void onFail(VKIDAuthFail fail) {
                        JSObject err = new JSObject();
                        err.put("error", fail.getDescription());
                        call.reject(fail.getDescription());
                    }

                    @Override
                    public void onAuthCode(AuthCodeData data, boolean isCompletion) {
                        // Not needed for simple auth flow
                    }
                }, params);
            } catch (Exception e) {
                JSObject err = new JSObject();
                err.put("webFallback", true);
                err.put("reason", e.getMessage());
                call.resolve(err);
            }
        });
    }
}
