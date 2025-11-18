#!/usr/bin/env python3
"""
RM Portal Development Server
Simple script to start the FastAPI development server
Usage: python server.py
"""

import os
import signal
import subprocess
import sys
from pathlib import Path


def kill_existing_servers():
    """Kill any existing uvicorn processes for this app"""
    try:
        subprocess.run(
            ["pkill", "-f", "uvicorn.*app.main:app"], 
            capture_output=True, 
            check=False
        )
    except Exception:
        pass  # Ignore if pkill fails


def find_python_executable():
    """Find the appropriate Python executable, preferring .venv if available"""
    script_dir = Path(__file__).parent
    
    # Check for .venv directory
    venv_paths = [
        script_dir / ".venv" / "bin" / "python",  # Unix/macOS
        script_dir / ".venv" / "Scripts" / "python.exe",  # Windows
        script_dir / "venv" / "bin" / "python",  # Alternative name
        script_dir / "venv" / "Scripts" / "python.exe",  # Alternative name Windows
    ]
    
    for venv_python in venv_paths:
        if venv_python.exists():
            print(f"🐍 Using virtual environment: {venv_python}")
            return str(venv_python)
    
    print("🐍 Using system Python (no .venv found)")
    return sys.executable


def main():
    """Start the development server"""
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Find the right Python executable
    python_exe = find_python_executable()
    
    print("🚀 Starting RM Portal development server...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API docs at: http://localhost:8000/docs")
    print("🔄 Auto-reload enabled for development")
    print("Press Ctrl+C to stop the server")
    print("")
    
    # Kill any existing servers
    kill_existing_servers()
    
    # Start the development server
    try:
        subprocess.run([
            python_exe, "-m", "uvicorn", 
            "app.main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        kill_existing_servers()
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()