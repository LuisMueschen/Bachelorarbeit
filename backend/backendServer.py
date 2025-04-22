import io
import base64
import trimesh
import numpy as np
from flask import Flask
# from flask_socketio import SocketIO
from flask_cors import CORS
from signalrcore.hub_connection_builder import HubConnectionBuilder

app = Flask(__name__)
# socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)
hub_connection = HubConnectionBuilder().with_url('http://localhost:5500/myhub').build()

def load_mesh_from_base64(base64_string):
    # Lädt ein Mesh aus einem Base64-kodierten String.
    mesh_bytes = base64.b64decode(base64_string)
    mesh = trimesh.load(io.BytesIO(mesh_bytes), file_type="stl")  # Datei-Typ anpassen (z.B. 'obj', 'ply')
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

# @socketio.on("check_connection")
def check_connection(args):
    print("message received: " + args[0])
    # socketio.emit("successfull_communication", {"message": "hello client"})
    hub_connection.send("SendToFrontend", ["Hello Frontend!"])

# @socketio.on("transform_mesh")
def handle_transform(data):
    # Empfängt Mesh-Daten vom Frontend, transformiert das Modell und sendet es zurück.
    base64_mesh = data[0]
    file_name = data[1]
    print(file_name)

    # translation = tuple(data["translation"])
    # rotation = tuple(data["rotation"])
    # scale = data["scale"]

    try:
        # 3D-Modell laden und transformieren
        mesh = load_mesh_from_base64(base64_mesh)
        transformed_mesh = transform_mesh(mesh, (1, 1, 1), (1, 1, 1), (3, 1, 1))
        result_base64 = mesh_to_base64(transformed_mesh)

        # Ergebnis zurücksenden
        # socketio.emit("transformed_mesh", {"mesh": result_base64})
        hub_connection.send("SendMeshToFrontend", [result_base64, file_name])
    except Exception as e:
        print("Fehler bei der Transformation:", str(e))
        # socketio.emit("transformation_error", {"error": str(e)})

hub_connection.on('CheckConnection', check_connection)
hub_connection.on('TransformMesh', handle_transform)
hub_connection.start()

if __name__ == "__main__":
    print("Starte Server")
    # socketio.run(app, host="0.0.0.0", port=5000, debug=True)

    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        hub_connection.stop()