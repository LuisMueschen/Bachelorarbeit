from PIL import Image
import numpy as np
import trimesh

def create_relief(image_path, output_path, scale_x=1.0, scale_y=1.0, scale_z=1.0, invert=False, base_thickness=1.0):
    # Load image and converting to grayscale
    img = Image.open(image_path).convert('L') 

    width, height = img.size

    # halving the image resolution until it is hd or smaller
    while width * height > (1280*720):
        img = img.resize((width // 2, height // 2))
        width, height = img.size

    # Create heightmap as 2D array
    heightmap = np.array(img, dtype=np.float32)
    print("heightmap created")

    if not invert:
        heightmap = 255 - heightmap

    # Normalize heightmap values to range between 0 and scale_z
    heightmap *= scale_z / 255.0

    # Height and width of heightmap
    h, w = heightmap.shape
    vertices = []
    faces = []

    # Iterate over pixels in image / coordinates in heightmap and create vertices with height value from heightmap
    for y in range(h):
        for x in range(w):
            # z = height value at coordinate x, y
            vertices.append((x * scale_x, (h-1-y) * scale_y, heightmap[y, x]))

    # creating lower vertices for ground and side faces
    for y in range(h):
        # left
        vertices.append((0, (h-1-y) * scale_y, -base_thickness))
    for y in range(h):
        # right
        vertices.append(((w-1) * scale_x, (h-1-y) * scale_y, -base_thickness))
    for x in range(w):
        # front
        vertices.append((x * scale_x, 0, -base_thickness))
    for x in range(w):
        # back
        vertices.append((x * scale_x, (h-1) * scale_y, -base_thickness))
         
    print("vertices created")

    # Function to convert 2D array index to 1D index
    def idx_relief(x, y):
        return y*w + x

    # Iterate over pixels in image / coordinates in heightmap and create faces using idx function
    for y in range(h-1):
        for x in range(w-1):
            faces.append([idx_relief(x, y+1), idx_relief(x+1, y), idx_relief(x, y)])
            faces.append([idx_relief(x, y+1), idx_relief(x+1, y+1), idx_relief(x+1, y)])
        
    def idx_left(y):
        return h*w + y
    
    def idx_right(y):
        return h*w + h + y
    
    def idx_front(x):
        return h*w + 2*h + x
    
    def idx_back(x):
        return h*w + 2*h + w + x

    # creating faces for sides
    for y in range(h-1):
        # # Left
        faces.append([idx_left(y), idx_left(y+1), idx_relief(0, y+1)])
        faces.append([idx_left(y), idx_relief(0, y+1), idx_relief(0, y)])
        # Right
        faces.append([idx_relief(w-1, y), idx_relief(w-1, y+1), idx_right(y+1)])
        faces.append([idx_relief(w-1, y), idx_right(y+1), idx_right(y)])
    for x in range(w-1):
        # Front
        faces.append([idx_relief(x, h-1), idx_front(x), idx_relief(x+1, h-1)])
        faces.append([idx_front(x), idx_front(x+1), idx_relief(x+1, h-1)])
        # Back
        faces.append([idx_relief(x, 0), idx_relief(x+1, 0), idx_back(x)])
        faces.append([idx_back(x+1), idx_back(x), idx_relief(x+1, 0)])

    # Bodenfläche (ground face) korrekt schließen
    faces.append([idx_left(0), idx_right(0), idx_right(h-1)])
    faces.append([idx_left(0), idx_right(h-1), idx_left(h-1)])

    print("faces created")

    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    print("Relief created")
    mesh.export(output_path, file_type="stl")