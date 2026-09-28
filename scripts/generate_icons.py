import os
from PIL import Image, ImageDraw, ImageFilter
from collections import deque

USER_IMAGE_PATH = r"C:\Users\samsu\.gemini\antigravity\brain\ee22b923-d056-49ff-97d0-f71be1d313a6\.user_uploaded\media_1790587718474.png"
ROOT_DIR = r"c:\projects\SmartStudyHub"

def create_dirs(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def extract_clean_transparent_logo(src_img):
    w, h = src_img.size

    # Floodfill from 4 corners to isolate exterior white background
    visited = set()
    queue = deque([(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)])
    for pt in queue:
        visited.add(pt)

    def is_bg(r, g, b):
        return r > 235 and g > 235 and b > 235

    while queue:
        cx, cy = queue.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                r, g, b, a = src_img.getpixel((nx, ny))
                if is_bg(r, g, b):
                    visited.add((nx, ny))
                    queue.append((nx, ny))

    mask = Image.new("L", (w, h), 255)
    for (x, y) in visited:
        mask.putpixel((x, y), 0)

    smooth_mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    transparent_logo = src_img.copy()
    transparent_logo.putalpha(smooth_mask)

    # Crop tightly to content bounds
    bbox = transparent_logo.getbbox()
    cropped = transparent_logo.crop(bbox)
    cw, ch = cropped.size

    # Pad to 1:1 square canvas
    max_dim = max(cw, ch)
    square_logo = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
    offset_x = (max_dim - cw) // 2
    offset_y = (max_dim - ch) // 2
    square_logo.paste(cropped, (offset_x, offset_y), cropped)
    return square_logo

def make_round_icon(logo, dim):
    # Pure circle with clean white background, transparent outside
    icon = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    draw.ellipse([(0, 0), (dim - 1, dim - 1)], fill=(255, 255, 255, 255))

    logo_dim = int(dim * 0.74)
    scaled = logo.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
    offset = (dim - logo_dim) // 2
    icon.paste(scaled, (offset, offset), scaled)

    # Anti-aliased circle mask
    mask = Image.new("L", (dim, dim), 0)
    ImageDraw.Draw(mask).ellipse([(0, 0), (dim - 1, dim - 1)], fill=255)
    icon.putalpha(mask)
    return icon

def make_squircle_icon(logo, dim):
    # Rounded rectangle (radius ~22%) with clean white background, transparent outside
    icon = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    radius = int(dim * 0.22)
    draw.rounded_rectangle([(0, 0), (dim - 1, dim - 1)], radius=radius, fill=(255, 255, 255, 255))

    logo_dim = int(dim * 0.74)
    scaled = logo.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
    offset = (dim - logo_dim) // 2
    icon.paste(scaled, (offset, offset), scaled)

    # Anti-aliased squircle mask
    mask = Image.new("L", (dim, dim), 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (dim - 1, dim - 1)], radius=radius, fill=255)
    icon.putalpha(mask)
    return icon

def make_adaptive_foreground(logo, fg_dim):
    # 108dp canvas with logo strictly in 66% (72dp) safe zone, transparent background
    fg = Image.new("RGBA", (fg_dim, fg_dim), (0, 0, 0, 0))
    logo_dim = int(fg_dim * 0.63)
    scaled = logo.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
    offset = (fg_dim - logo_dim) // 2
    fg.paste(scaled, (offset, offset), scaled)
    return fg

def make_splash_logo(logo, dim):
    # Transparent logo for splashscreen
    splash_logo = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    logo_dim = int(dim * 0.88)
    scaled = logo.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
    offset = (dim - logo_dim) // 2
    splash_logo.paste(scaled, (offset, offset), scaled)
    return splash_logo

def generate_all():
    src_img = Image.open(USER_IMAGE_PATH).convert("RGBA")
    print(f"Loaded source image: {src_img.size}")

    master_logo = extract_clean_transparent_logo(src_img)
    print("Clean transparent master logo extracted!")

    # 1. Canonical Icons
    round_512 = make_round_icon(master_logo, 512)
    squircle_512 = make_squircle_icon(master_logo, 512)
    adaptive_1024 = make_adaptive_foreground(master_logo, 1024)

    # Assets icon (512x512 squircle)
    squircle_512.save(os.path.join(ROOT_DIR, "icon.png"), "PNG")
    squircle_512.save(os.path.join(ROOT_DIR, "assets", "icon.png"), "PNG")
    squircle_512.save(os.path.join(ROOT_DIR, "mobile-expo", "assets", "icon.png"), "PNG")
    adaptive_1024.save(os.path.join(ROOT_DIR, "mobile-expo", "assets", "adaptive-icon.png"), "PNG")

    # Favicons
    round_512.save(os.path.join(ROOT_DIR, "public", "favicon.png"), "PNG")
    fav48 = round_512.resize((48, 48), Image.Resampling.LANCZOS)
    fav48.save(os.path.join(ROOT_DIR, "mobile-expo", "assets", "favicon.png"), "PNG")

    ico_path = os.path.join(ROOT_DIR, "public", "favicon.ico")
    round_512.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("Saved canonical and web icons.")

    # 2. Splash Screen for Mobile Expo
    splash_w, splash_h = 1242, 2436
    splash_bg = Image.new("RGBA", (splash_w, splash_h), (18, 18, 18, 255))
    splash_logo_size = 380
    scaled_splash_logo = master_logo.resize((splash_logo_size, splash_logo_size), Image.Resampling.LANCZOS)
    logo_x = (splash_w - splash_logo_size) // 2
    logo_y = (splash_h - splash_logo_size) // 2 - 80
    splash_bg.paste(scaled_splash_logo, (logo_x, logo_y), scaled_splash_logo)
    splash_path = os.path.join(ROOT_DIR, "mobile-expo", "assets", "splash.png")
    splash_bg.save(splash_path, "PNG")
    print(f"Saved mobile splash: {splash_path}")

    # 3. Android Splashscreen logos (drawable-*)
    drawable_sizes = {
        "drawable-mdpi": 160,
        "drawable-hdpi": 240,
        "drawable-xhdpi": 320,
        "drawable-xxhdpi": 480,
        "drawable-xxxhdpi": 640,
    }
    for folder, dim in drawable_sizes.items():
        splash_l = make_splash_logo(master_logo, dim)
        out_p = os.path.join(ROOT_DIR, "mobile-expo", "android", "app", "src", "main", "res", folder, "splashscreen_logo.png")
        create_dirs(out_p)
        splash_l.save(out_p, "PNG")

    # 4. Android Mipmap icons (round, squircle, adaptive foreground)
    mipmap_configs = {
        "mipmap-mdpi": {"legacy": 48, "foreground": 108},
        "mipmap-hdpi": {"legacy": 72, "foreground": 162},
        "mipmap-xhdpi": {"legacy": 96, "foreground": 216},
        "mipmap-xxhdpi": {"legacy": 144, "foreground": 324},
        "mipmap-xxxhdpi": {"legacy": 192, "foreground": 432},
    }

    for folder, sizes in mipmap_configs.items():
        base_dir = os.path.join(ROOT_DIR, "mobile-expo", "android", "app", "src", "main", "res", folder)
        create_dirs(os.path.join(base_dir, "dummy.txt"))

        # ic_launcher.png (neat squircle)
        sq_icon = make_squircle_icon(master_logo, sizes["legacy"])
        sq_icon.save(os.path.join(base_dir, "ic_launcher.png"), "PNG")

        # ic_launcher_round.png (neat circle)
        rd_icon = make_round_icon(master_logo, sizes["legacy"])
        rd_icon.save(os.path.join(base_dir, "ic_launcher_round.png"), "PNG")

        # ic_launcher_foreground.png (transparent background adaptive foreground)
        fg_icon = make_adaptive_foreground(master_logo, sizes["foreground"])
        fg_icon.save(os.path.join(base_dir, "ic_launcher_foreground.png"), "PNG")

        print(f"Generated clean mipmaps for {folder}")

    # Mirror for Capacitor Android res if present
    for folder, sizes in mipmap_configs.items():
        base_dir = os.path.join(ROOT_DIR, "android", "app", "src", "main", "res", folder)
        if os.path.exists(base_dir):
            sq_icon = make_squircle_icon(master_logo, sizes["legacy"])
            sq_icon.save(os.path.join(base_dir, "ic_launcher.png"), "PNG")
            rd_icon = make_round_icon(master_logo, sizes["legacy"])
            rd_icon.save(os.path.join(base_dir, "ic_launcher_round.png"), "PNG")
            fg_icon = make_adaptive_foreground(master_logo, sizes["foreground"])
            fg_icon.save(os.path.join(base_dir, "ic_launcher_foreground.png"), "PNG")

    print("All icons successfully regenerated with round / squircle shapes and zero black artifacts!")

if __name__ == "__main__":
    generate_all()
