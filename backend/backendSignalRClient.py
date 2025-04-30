import io
import base64
import trimesh
import numpy as np
from signalrcore.hub_connection_builder import HubConnectionBuilder
import time

def load_mesh_from_base64(base64_string):
    mesh_bytes = base64.b64decode(base64_string)
    mesh = trimesh.load(io.BytesIO(mesh_bytes), file_type="stl")
    return mesh

def transform_mesh(mesh, translation=(0, 0, 0), rotation=(0, 0, 0), scale=1.0):
    # Transformiert das Mesh durch Verschiebung, Rotation und Skalierung.
    mesh.apply_scale(scale)

    # Rotation in Radiant umwandeln und Matrix berechnen
    rotation_matrix = trimesh.transformations.euler_matrix(
        np.radians(rotation[0]),  # X-Achse
        np.radians(rotation[1]),  # Y-Achse
        np.radians(rotation[2])   # Z-Achse
    )
    mesh.apply_transform(rotation_matrix)

    # Verschieben
    mesh.apply_translation(translation)

    return mesh

def mesh_to_base64(mesh):
    # Konvertiert ein Mesh in einen Base64-String.
    buffer = io.BytesIO()
    mesh.export(buffer, file_type="stl")  # Dateiformat anpassen
    return base64.b64encode(buffer.getvalue()).decode()

def check_connection(args):
    print("message received: " + args[0])
    hub_connection.send("SendToFrontend", ["Hello Frontend!"])

def handle_transform(data):
    # Empfängt Mesh-Daten vom Frontend, transformiert das Modell und sendet es zurück.
    file_name = data[0]
    print(file_name)

    # translation = tuple(data["translation"])
    # rotation = tuple(data["rotation"])
    # scale = data["scale"]

    try:
        # 3D-Modell laden und transformieren
        with open(f"uploads/{file_name}", "rb") as file:
            mesh = trimesh.load(io.BytesIO(file.read()), file_type="stl")
            transformed_mesh = transform_mesh(mesh, (1, 1, 1), (1, 1, 1), (3, 1, 1))

        with open(f"uploads/streched-{file_name}", "wb") as file:
            file.write(transformed_mesh.export(file_type='stl'))
            
        # Ergebnis zurücksenden
        hub_connection.send("NotifyFrontendAboutManipulatedMesh", [f"streched-{file_name}"])
    except Exception as e:
        print("Fehler bei der Transformation:", str(e))

def connect_with_retry():
    while True:
        try:
            hub_connection = HubConnectionBuilder().with_url('http://localhost:5500/myhub').build()
            hub_connection.start()
            print("verbunden")
            time.sleep(1)
            hub_connection.send("register", ["backend"])
            hub_connection.on('CheckConnection', check_connection)
            hub_connection.on('FileUploaded', handle_transform)
            return hub_connection
        except:
            print("Verbindung Fehlgeschlagen")
            time.sleep(3)
    
hub_connection = connect_with_retry()

try:
    while True:
        try:
            hub_connection.send("ping", [])
        except Exception as e:
            print("Verbindung verloren")
            try:
                hub_connection.stop
            except:
                pass
            hub_connection = connect_with_retry()
        time.sleep(5)
except KeyboardInterrupt:
    hub_connection.stop()