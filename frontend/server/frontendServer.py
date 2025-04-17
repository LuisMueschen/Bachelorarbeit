from http.server import HTTPServer, BaseHTTPRequestHandler
import os
import mimetypes

class Serv(BaseHTTPRequestHandler):

    def do_GET(self):
        # Set the base directory to the /frontend folder
        base_dir = os.path.join(os.path.dirname(__file__), '../dist')
        
        if self.path == '/':
            self.path = '/index.html'
        
        try:
            # Construct the full file path
            file_path = os.path.join(base_dir, self.path[1:])
            
            # Guess the MIME type of the file
            mime_type, _ = mimetypes.guess_type(file_path)
            
            # Open the file in binary mode
            with open(file_path, 'rb') as file:
                file_to_open = file.read()
            
            # Send a 200 OK response
            self.send_response(200)
            self.send_header('Content-type', mime_type if mime_type else 'application/octet-stream')
            self.end_headers()
            
            # Write the file content to the response
            self.wfile.write(file_to_open)
        except FileNotFoundError:
            # Handle file not found
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'File not found')
        except Exception as e:
            # Handle other errors
            self.send_response(500)
            self.end_headers()
            self.wfile.write(bytes(f'Error: {e}', 'utf-8'))

httpd = HTTPServer(('localhost', 8080), Serv)
httpd.serve_forever()