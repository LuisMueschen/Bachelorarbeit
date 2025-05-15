import io
import trimesh
from signalrcore.hub_connection_builder import HubConnectionBuilder
import time
import os
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
import threading

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
    file.save(file_path)

    print(f"Datei gespeichert unter: {file_path}")

    return jsonify({'filename': secure_filename(file.filename)}), 200

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    save_filename = secure_filename(filename)
    try:
        return send_from_directory(UPLOAD_FOLDER, save_filename, as_attachment=True)
    except FileNotFoundError:
        abort(404)

hub_connection = None

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
            hub_connection.on('CheckConnection', check_connection)
            hub_connection.on('FileUploaded', handle_transform)
            hub_connection.start()
            print("verbunden")
            time.sleep(1)
            hub_connection.send("register", ["backend"])
            return hub_connection
        except:
            print("Verbindung Fehlgeschlagen")
            time.sleep(3)

def start_signalR_client():
    global hub_connection
    hub_connection = connect_with_retry()

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

if __name__ == "__main__":
    signalR_thread = threading.Thread(target=start_signalR_client)
    signalR_thread.daemon = True
    signalR_thread.start()

    print("Starte Server")
    app.run(host='0.0.0.0', port=5000)