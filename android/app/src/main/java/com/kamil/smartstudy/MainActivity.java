package com.kamil.smartstudy;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the InAppUpdate plugin before super.onCreate()
        registerPlugin(InAppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
