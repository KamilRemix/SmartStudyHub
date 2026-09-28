import os
from PIL import Image, ImageDraw

USER_IMAGE_PATH = r"C:\Users\samsu\.gemini\antigravity\brain\ee22b923-d056-49ff-97d0-f71be1d313a6\.user_uploaded\media_1790587718474.png"
ROOT_DIR = r"c:\projects\SmartStudyHub"

def create_dirs(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def generate_all():
    src_img = Image.open(USER_IMAGE_PATH).convert("RGBA")
    print(f"Loaded source image: {src_img.size}")

    # 1. Canonical icon files
    canonical_paths = [
        os.path.join(ROOT_DIR, "icon.png"),
        os.path.join(ROOT_DIR, "public", "favicon.png"),
        os.path.join(ROOT_DIR, "mobile-expo", "assets", "icon.png"),
        os.path.join(ROOT_DIR, "assets", "icon.png"),
    ]
    for p in canonical_paths:
        create_dirs(p)
        src_img.save(p, "PNG")
        print(f"Saved: {p}")

    # Favicon 48x48
    fav48 = src_img.resize((48, 48), Image.Resampling.LANCZOS)
    fav48.save(os.path.join(ROOT_DIR, "mobile-expo", "assets", "favicon.png"), "PNG")
    
    # Favicon.ico
    ico_path = os.path.join(ROOT_DIR, "public", "favicon.ico")
    src_img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Saved ICO: {ico_path}")

    # 2. Splash image for mobile-expo assets
    splash_w, splash_h = 1242, 2436
    splash_bg = Image.new("RGBA", (splash_w, splash_h), (18, 18, 18, 255))
    logo_size = 320
    scaled_logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    logo_x = (splash_w - logo_size) // 2
    logo_y = (splash_h - logo_size) // 2 - 80
    splash_bg.paste(scaled_logo, (logo_x, logo_y), scaled_logo)
    splash_path = os.path.join(ROOT_DIR, "mobile-expo", "assets", "splash.png")
    splash_bg.save(splash_path, "PNG")
    print(f"Saved splash: {splash_path}")

    # 3. Android Splashscreen logos (drawable-*)
    # Replaces the dreaded grey grid circles!
    drawable_sizes = {
        "drawable-mdpi": 160,
        "drawable-hdpi": 240,
        "drawable-xhdpi": 320,
        "drawable-xxhdpi": 480,
        "drawable-xxxhdpi": 640,
    }
    for folder, dim in drawable_sizes.items():
        splash_logo = src_img.resize((dim, dim), Image.Resampling.LANCZOS)
        out_p = os.path.join(ROOT_DIR, "mobile-expo", "android", "app", "src", "main", "res", folder, "splashscreen_logo.png")
        create_dirs(out_p)
        splash_logo.save(out_p, "PNG")
        print(f"Saved splashscreen logo: {out_p}")

    # 4. Android Mipmap icons (adaptive foreground and legacy icons)
    mipmap_configs = {
        "mipmap-mdpi": {"legacy": 48, "foreground": 108},
        "mipmap-hdpi": {"legacy": 72, "foreground": 162},
        "mipmap-xhdpi": {"legacy": 96, "foreground": 216},
        "mipmap-xxhdpi": {"legacy": 144, "foreground": 324},
        "mipmap-xxxhdpi": {"legacy": 192, "foreground": 432},
    }

    def make_legacy_icon(dim, is_round=False):
        # Create dark rounded background #121212
        base = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        draw = ImageDraw.Draw(base)
        corner_radius = dim // 2 if is_round else dim // 5
        draw.rounded_rectangle([(0, 0), (dim - 1, dim - 1)], radius=corner_radius, fill=(18, 18, 18, 255))
        # Inner logo with 15% padding
        inner_dim = int(dim * 0.72)
        inner = src_img.resize((inner_dim, inner_dim), Image.Resampling.LANCZOS)
        offset = (dim - inner_dim) // 2
        base.paste(inner, (offset, offset), inner)
        return base

    def make_foreground(fg_dim):
        # 108dp canvas with center 66% (72dp) containing logo
        fg = Image.new("RGBA", (fg_dim, fg_dim), (0, 0, 0, 0))
        logo_dim = int(fg_dim * 0.64)
        scaled = src_img.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
        offset = (fg_dim - logo_dim) // 2
        fg.paste(scaled, (offset, offset), scaled)
        return fg

    for folder, sizes in mipmap_configs.items():
        base_dir = os.path.join(ROOT_DIR, "mobile-expo", "android", "app", "src", "main", "res", folder)
        create_dirs(os.path.join(base_dir, "dummy.txt"))

        # ic_launcher.png
        icon = make_legacy_icon(sizes["legacy"], is_round=False)
        icon.save(os.path.join(base_dir, "ic_launcher.png"), "PNG")

        # ic_launcher_round.png
        icon_round = make_legacy_icon(sizes["legacy"], is_round=True)
        icon_round.save(os.path.join(base_dir, "ic_launcher_round.png"), "PNG")

        # ic_launcher_foreground.png
        fg = make_foreground(sizes["foreground"])
        fg.save(os.path.join(base_dir, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated mipmaps for {folder}")

    # Also update Capacitor Android res if present
    for folder, sizes in mipmap_configs.items():
        base_dir = os.path.join(ROOT_DIR, "android", "app", "src", "main", "res", folder)
        if os.path.exists(base_dir):
            icon = make_legacy_icon(sizes["legacy"], is_round=False)
            icon.save(os.path.join(base_dir, "ic_launcher.png"), "PNG")
            icon_round = make_legacy_icon(sizes["legacy"], is_round=True)
            icon_round.save(os.path.join(base_dir, "ic_launcher_round.png"), "PNG")
            fg = make_foreground(sizes["foreground"])
            fg.save(os.path.join(base_dir, "ic_launcher_foreground.png"), "PNG")

    print("All icons and splash graphics successfully generated!")

if __name__ == "__main__":
    generate_all()
