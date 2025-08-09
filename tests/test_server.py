import subprocess
import sys
import time
import urllib.request
from pathlib import Path


def test_server_starts_and_serves_index():
    repo_dir = Path(__file__).resolve().parent.parent
    port = 8765
    process = subprocess.Popen(
        [sys.executable, "server.py", "--port", str(port)],
        cwd=repo_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        url = f"http://localhost:{port}"
        # wait for server to start
        for _ in range(50):
            try:
                with urllib.request.urlopen(url, timeout=0.1) as response:
                    assert response.status == 200
                    break
            except Exception:
                time.sleep(0.1)
        else:
            raise AssertionError("Server did not start in time")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
