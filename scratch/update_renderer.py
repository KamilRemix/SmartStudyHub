import re
import os

renderer_file = 'public/renderer.js'
with open(renderer_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Update window.signInWithProvider to include better error handling
auth_func_old = '''async function signInWithProvider(providerId, button) {
    if (authActionInFlight) return;
    if (!providerId || !firebaseAuth) return;'''

auth_func_new = '''async function signInWithProvider(providerId, button) {
    if (authActionInFlight) return;
    if (!providerId || !firebaseAuth) return;'''

# We want to replace the VK web logic
vk_web_logic = '''                    } else if (providerId === 'oidc.vk-id') {
                        const provider = new firebase.auth.OAuthProvider('oidc.vk-id');
                        const userCredential = await firebaseAuth.signInWithPopup(provider);
                        return finalizeSignIn(userCredential);
                    } else {'''

vk_web_logic_new = '''                    } else if (providerId === 'oidc.vk-id') {
                        if (typeof VKIDSDK !== 'undefined') {
                            VKIDSDK.Auth.login().then(async (response) => {
                                if (response.payload && (response.payload.token || response.payload.uuid)) {
                                    const provider = new firebase.auth.OAuthProvider('oidc.vk-id');
                                    const credential = provider.credential({ idToken: response.payload.token || response.payload.uuid });
                                    const userCredential = await firebaseAuth.signInWithCredential(credential);
                                    return finalizeSignIn(userCredential);
                                }
                            }).catch(e => { console.error('VK ID Auth Error:', e); throw e; });
                        } else {
                            const provider = new firebase.auth.OAuthProvider('oidc.vk-id');
                            const userCredential = await firebaseAuth.signInWithPopup(provider);
                            return finalizeSignIn(userCredential);
                        }
                    } else {'''

content = content.replace(vk_web_logic, vk_web_logic_new)

# Add console.error to Google/GitHub signInWithPopup
google_github_logic = '''                        const userCredential = await firebaseAuth.signInWithPopup(provider);
                        return finalizeSignIn(userCredential);'''
                        
google_github_logic_new = '''                        const userCredential = await firebaseAuth.signInWithPopup(provider).catch(error => {
                            console.error('Auth Error:', error);
                            throw error;
                        });
                        return finalizeSignIn(userCredential);'''

content = content.replace(google_github_logic, google_github_logic_new)

with open(renderer_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated renderer.js")
