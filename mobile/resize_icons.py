import os
from PIL import Image

def resize_image(image_path, scale_factor=1.25):
    """Aumenta a imagem reduzindo o padding (escala interna)."""
    if not os.path.exists(image_path):
        return
    
    with Image.open(image_path) as img:
        img = img.convert("RGBA")
        width, height = img.size
        
        # Encontrar a caixa delimitadora do conteúdo não transparente
        bbox = img.getbbox()
        if not bbox:
            return
            
        # Extrair o conteúdo
        content = img.crop(bbox)
        cw, ch = content.size
        
        # Calcular novo tamanho mantendo proporção, mas aumentando em relação ao original
        # Se aumentarmos demais, pode cortar. 1.25 é um bom equilíbrio.
        new_cw = int(cw * scale_factor)
        new_ch = int(ch * scale_factor)
        
        # Garantir que não ultrapasse o tamanho original do arquivo (para não cortar no Android)
        if new_cw > width: new_cw = width
        if new_ch > height: new_ch = height
        
        content_resized = content.resize((new_cw, new_ch), Image.Resampling.LANCZOS)
        
        # Criar nova imagem transparente do tamanho original
        new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        
        # Colar no centro
        offset = ((width - new_cw) // 2, (height - new_ch) // 2)
        new_img.paste(content_resized, offset, content_resized)
        
        new_img.save(image_path)
        print(f"Resized: {image_path}")

base_path = r"e:\joca-net\mobile\android\app\src\jocanet\res"
densities = ["hdpi", "mdpi", "xhdpi", "xxhdpi", "xxxhdpi"]

# 1. Redimensionar Splash Logo
for d in densities:
    path = os.path.join(base_path, f"drawable-{d}", "splashscreen_logo.png")
    resize_image(path, 1.3) # Logo da splash 30% maior

# 2. Redimensionar Icone de Notificação
# O ic_notification fica em drawable (padrão) e as vezes nas outras
notif_paths = [
    os.path.join(base_path, "drawable", "ic_notification.png")
]
for d in densities:
    notif_paths.append(os.path.join(base_path, f"drawable-{d}", "ic_notification.png"))

for p in notif_paths:
    resize_image(p, 1.2) # Notificação 20% maior
