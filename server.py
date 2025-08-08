#!/usr/bin/env python3
"""
Simple HTTP Server for Family Tree Application
This script starts a local HTTP server to avoid CORS issues when running the application.
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

def main(port=8000):
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    
    # Change to the script directory
    os.chdir(script_dir)
    
    # Create a custom handler that sets CORS headers
    class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
        
        def do_OPTIONS(self):
            self.send_response(200)
            self.end_headers()
    
    try:
        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            print(f"🚀 Family Tree Server started!")
            print(f"📁 Serving files from: {script_dir}")
            print(f"🌐 Open your browser and go to: http://localhost:{port}")
            print(f"📱 The application will work on mobile devices at: http://[your-ip]:{port}")
            print(f"⏹️  Press Ctrl+C to stop the server")
            print("-" * 50)
            
            # Get local IP address for mobile access
            import socket
            try:
                hostname = socket.gethostname()
                local_ip = socket.gethostbyname(hostname)
                print(f"📱 Mobile access: http://{local_ip}:{port}")
            except:
                pass
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use. Try a different port:")
            print(f"   python server.py --port {port + 1}")
        else:
            print(f"❌ Error starting server: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    # Check for port argument
    port = 8000
    if len(sys.argv) > 2 and sys.argv[1] == "--port":
        try:
            port = int(sys.argv[2])
        except ValueError:
            print("❌ Invalid port number")
            sys.exit(1)
    
    main(port)
