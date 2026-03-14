from PIL import Image, ImageOps
import sys
import os

def process_icon(input_path, output_path, size=96):
    try:
        if not os.path.exists(input_path):
            print(f"File not found: {input_path}")
            return
            
        img = Image.open(input_path).convert("RGBA")
        
        # Crop the transparent border
        bbox = img.getbbox()
        if not bbox:
            print("Image is entirely empty/transparent.")
            return
            
        img_cropped = img.crop(bbox)
        
        # Calculate new size while preserving aspect ratio, using 90% of the canvas to allow a tiny 5% border
        target_size = int(size * 0.9)
        img_cropped.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)
        
        # Create a new blank transparent image of the exact requested size (96x96)
        new_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        
        # Paste the cropped image in the center
        paste_x = (size - img_cropped.width) // 2
        paste_y = (size - img_cropped.height) // 2
        
        new_img.paste(img_cropped, (paste_x, paste_y), img_cropped)
        
        # Force all non-transparent pixels to white (required for Android push icons)
        datas = new_img.getdata()
        new_data = []
        for item in datas:
            # item is (R, G, B, A)
            if item[3] > 0:
                new_data.append((255, 255, 255, item[3]))
            else:
                new_data.append(item)
                
        new_img.putdata(new_data)
        new_img.save(output_path, "PNG")
        print(f"Successfully optimized {output_path} to size {size}x{size}")

    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    base_dir = r"e:\wr_telecom\mobile"
    inputs = [
        os.path.join(base_dir, "assets", "incon_push.png"),
        os.path.join(base_dir, "android", "app", "src", "main", "res", "drawable", "ic_stat_incon_push.png")
    ]
    
    for f in inputs:
        process_icon(f, f)
