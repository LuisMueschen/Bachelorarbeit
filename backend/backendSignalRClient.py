import io
import base64
import trimesh
import numpy as np
from signalrcore.hub_connection_builder import HubConnectionBuilder
import time

def check_connection(args):
    print("message received: " + args[0])
    hub_connection.send("SendToFrontend", ["Hello Frontend!"])

def handle_transform(data):
    # Empfängt Mesh-Daten vom Frontend, transformiert das Modell und sendet es zurück.
    file_name = data[0]
    connection_id = data[1]
    x_axis_value = float(data[2])
    y_axis_value = float(data[3])
    z_axis_value = float(data[4])
    print(data)

    try:
        # 3D-Modell laden und transformieren
        with open(f"uploads/{file_name}", "rb") as file:
            mesh = trimesh.load(io.BytesIO(file.read()), file_type="stl")
            transformed_mesh = mesh.apply_scale((x_axis_value, y_axis_value, z_axis_value))

        with open(f"uploads/streched-{file_name}", "wb") as file:
            file.write(transformed_mesh.export(file_type='stl'))
            
        # Ergebnis zurücksenden
        hub_connection.send("NotifyFrontendAboutManipulatedMesh", [f"streched-{file_name}", connection_id])
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