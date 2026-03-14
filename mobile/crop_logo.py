from PIL import Image
import sys
import os

def crop_transparent_padding(image_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path).convert("RGBA")
        bbox = img.getbbox()
        if bbox:
            print(f"Cropping from {img.size} to {bbox}")
            cropped_img = img.crop(bbox)
            cropped_img.save(image_path, "PNG")
            print("Done cropping.")
        else:
            print("Image is entirely transparent or empty.")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    base_dir = r"e:\wr_telecom\mobile"
    logo_path = os.path.join(base_dir, "assets", "logo.png")
    
    if os.path.exists(logo_path):
        crop_transparent_padding(logo_path)
    else:
        print(f"Could not find {logo_path}")
