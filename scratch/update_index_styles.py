import re
import os

# 1. Update public/index.html
index_file = 'public/index.html'
with open(index_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add VK ID SDK script
vk_sdk_script = '<script src="https://unpkg.com/@vkid/sdk@<2.0.0/dist-sdk/umd/index.js"></script>'
if vk_sdk_script not in content:
    content = content.replace('<script src="https://accounts.google.com/gsi/client" async defer></script>',
                              f'<script src="https://accounts.google.com/gsi/client" async defer></script>\n    {vk_sdk_script}')

# Initialize VKIDSDK
vk_init = '''
      if (typeof VKIDSDK !== 'undefined') {
          VKIDSDK.Config.init({
              app: 54715318,
              redirectUrl: "https://studio-9933447149-80d6a.web.app",
              responseMode: VKIDSDK.Config.ResponseMode.Callback
          });
      }
'''
if 'VKIDSDK.Config.init' not in content:
    content = content.replace('window.firebaseAuth = firebase.auth();',
                              'window.firebaseAuth = firebase.auth();\n' + vk_init)

with open(index_file, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update style.css
style_file = 'public/style.css'
with open(style_file, 'r', encoding='utf-8') as f:
    style_content = f.read()

# Unified button styles
old_btn_style = '''.google-signin-btn, .github-signin-btn, .vk-signin-btn, button.google, button.github, button.vk {
    width: 100%;
    padding: 12px 20px;
    border: 1px solid #d0d0d0;'''

new_btn_style = '''.google-signin-btn, .github-signin-btn, .vk-signin-btn, button.google, button.github, button.vk {
    width: 100%;
    height: 48px;
    padding: 0 20px;
    border-radius: 12px;
    border: none;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.3s ease;'''

if old_btn_style in style_content:
    style_content = style_content.replace(old_btn_style, new_btn_style)

# VK button specific style
vk_old = '''.vk-signin-btn {
    width: 100%;
    padding: 12px 20px;
    transition: all 0.3s ease;
    font-family: var(--font-family);
}'''

vk_new = '''.vk-signin-btn {
    background: #0077FF;
    color: white;
}
.vk-signin-btn .auth-btn-icon-svg path {
    fill: white;
}'''
style_content = re.sub(r'\.vk-signin-btn\s*\{[^}]*\}', '', style_content, count=2)
style_content += '\n' + vk_new + '\n'

with open(style_file, 'w', encoding='utf-8') as f:
    f.write(style_content)

print("Updated index.html and style.css")
