import os
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename

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

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    print(f"Datei gespeichert unter: {file_path}")

    return jsonify({'filename': file.filename}), 200

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    save_filename = secure_filename(filename)
    try:
        return send_from_directory(UPLOAD_FOLDER, save_filename, as_attachment=True)
    except FileNotFoundError:
        abort(404)

if __name__ == "__main__":
    print("Starte Server")
    app.run(host='0.0.0.0', port=5000)