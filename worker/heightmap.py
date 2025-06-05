from PIL import Image
import numpy as np
import trimesh

def create_relief(image_path, output_path, scale_x=1.0, scale_y=1.0, scale_z=1.0, invert=False):
    # Bild laden und in Graustufen umwandeln
    print(image_path)
    print(output_path)
    img = Image.open(image_path).convert('L')
    heightmap = np.array(img, dtype=np.float32)

    if invert:
        heightmap = 255 - heightmap

    heightmap *= scale_z / 255.0  # Höhenwerte normalisieren

    h, w = heightmap.shape
    vertices = []
    faces = []

    # Vertices generieren
    for y in range(h):
        for x in range(w):
            z = heightmap[y, x]
            vertices.append((x * scale_x, y * scale_y, z))

    # Faces erzeugen
    def idx(x, y): return y * w + x

    for y in range(h - 1):
        for x in range(w - 1):
            # Zwei Dreiecke pro Quadrat
            faces.append([idx(x, y), idx(x+1, y), idx(x, y+1)])
            faces.append([idx(x+1, y), idx(x+1, y+1), idx(x, y+1)])
    
    print("done")
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    mesh.export(output_path)