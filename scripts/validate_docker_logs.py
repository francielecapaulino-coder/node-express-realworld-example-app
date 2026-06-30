#!/usr/bin/env python3

import os
import sys
import subprocess
import requests
import json
import time

class Colors:
    HEADER = '\033[95m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class DockerValidator:
    def __init__(self, api_url="http://localhost:3000", timeout=60):
        self.api_url = api_url
        self.timeout = timeout
        
    def log(self, message, color=Colors.ENDC):
        prefix = f"{Colors.BOLD}[DOCKER VALIDATOR]{Colors.ENDC}"
        print(f"{prefix} {color}{message}{Colors.ENDC}")
        
    def check_docker_available(self):
        try:
            result = subprocess.run(['docker', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.log(f"Docker available: {result.stdout.strip()}", Colors.GREEN)
                return True
        except:
            pass
        self.log("Docker not available or not running", Colors.RED)
        return False
        
    def check_health_endpoint(self, max_retries=12):
        self.log("Checking API health endpoint...", Colors.BLUE)
        
        for attempt in range(max_retries):
            try:
                response = requests.get(f"{self.api_url}/", timeout=5)
                if response.status_code == 200:
                    self.log("✓ API health endpoint responding", Colors.GREEN)
                    return True
            except requests.exceptions.ConnectionError:
                if attempt < max_retries - 1:
                    self.log(f"Attempt {attempt + 1}/{max_retries}: API not ready, waiting...", Colors.YELLOW)
                    time.sleep(5)
                continue
        self.log("Health check failed - API not responding", Colors.RED)
        return False

def main():
    validator = DockerValidator()
    
    if not validator.check_docker_available():
        sys.exit(1)
        
    if validator.check_health_endpoint():
        validator.log("🎉 DOCKER VALIDATION SUCCESSFUL! 🎉", Colors.GREEN)
        sys.exit(0)
    else:
        validator.log("❌ DOCKER VALIDATION FAILED", Colors.RED)
        sys.exit(1)

if __name__ == '__main__':
    main()