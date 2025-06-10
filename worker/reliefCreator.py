from PIL import Image
import numpy as np
import trimesh

def create_relief(image_path, output_path, scale_x=1.0, scale_y=1.0, scale_z=1.0, invert=False):
    # Bild laden und in Graustufen umwandeln
    img = Image.open(image_path).convert('L')

    # heightmap als 2-Dim Array erstellen
    heightmap = np.array(img, dtype=np.float32)
    print("heightmap erstellt")

    if invert:
        heightmap = 255 - heightmap

    # heightmap werte auf werte zwischen 0 und scale_z normalisieren
    heightmap *= scale_z / 255.0

    # Höhe und Breite von heigtmap
    h, w = heightmap.shape
    vertices = []
    faces = []

    # Über Pixel in Bild / Koordinaten in Heightmap itterieren und Koordinaten mit Höhenwert als Vertices erstellen
    for y in range(h):
        for x in reversed(range(w)):
            # z = Höhenwert an Koordinate x,y
            z = heightmap[y, x]
            vertices.append((x * scale_x, y * scale_y, z))
    print("vertices erstellt")

    # Funktion um 2-Dim Arrayindex zu 1-Dim Index umzuwandeln
    def idx(x, y): return y * w + x

    # Über Pixel in Bild / Koordinaten in Heightmap itterieren und mit idx funktion faces erstellen
    for y in range(h - 1):
        for x in reversed(range(w - 1)):
            # Zwei Dreiecke pro Quadrat - um Koordinaten nicht doppelt zu speichern werden im faces array nur Indizes des vertices array gespeichert
            faces.append([idx(x, y), idx(x+1, y), idx(x, y+1)])
            faces.append([idx(x+1, y), idx(x+1, y+1), idx(x, y+1)])
    print("faces erstellt")
    
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    print("Relief erstellt")
    mesh.export(output_path)