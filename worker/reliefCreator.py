from PIL import Image
import numpy as np
import trimesh

def create_relief(image_path, output_path, scale_x=1.0, scale_y=1.0, scale_z=1.0, invert=False):
    # Load image and converting to grayscale
    img = Image.open(image_path).convert('L') 

    width, height = img.size

    # halving the image resolution until it is hd or smaller
    while width * height > 1280*720:
        img = img.resize((width // 2, height // 2))
        width, height = img.size

    # Create heightmap as 2D array
    heightmap = np.array(img, dtype=np.float32)
    print("heightmap created")

    if invert:
        heightmap = 255 - heightmap

    # Normalize heightmap values to range between 0 and scale_z
    heightmap *= scale_z / 255.0

    # Height and width of heightmap
    h, w = heightmap.shape
    vertices = []
    faces = []

    # Iterate over pixels in image / coordinates in heightmap and create vertices with height value from heightmap
    for y in range(h):
        for x in reversed(range(w)):
            # z = height value at coordinate x, y
            vertices.append((x * scale_x, y * scale_y, heightmap[y, x]))
    print("vertices created")

    # Function to convert 2D array index to 1D index
    def idx(x, y): return y * w + x

    # Iterate over pixels in image / coordinates in heightmap and create faces using idx function
    for y in range(h - 1):
        for x in reversed(range(w - 1)):
            # Two triangles per square - to avoid storing coordinates twice, only indices of the vertices array are stored in the faces array
            faces.append([idx(x, y), idx(x+1, y), idx(x, y+1)])
            faces.append([idx(x+1, y), idx(x+1, y+1), idx(x, y+1)])
    print("faces created")
    
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    print("Relief created")
    mesh.export(output_path, file_type="stl")