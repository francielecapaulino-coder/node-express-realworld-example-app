#!/usr/bin/env python3
"""
Starts the API via `docker compose`, verifies the startup log line appears,
hits the health endpoint, then stops the stack and verifies the shutdown log
lines appear too. Exits non-zero on any failure.
"""

import subprocess
import sys
import time
import urllib.error
import urllib.request


class Colors:
    HEADER = '\033[95m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


class DockerValidator:
    def __init__(self, api_url="http://localhost:3000", service="api", compose_file="compose.yml"):
        self.api_url = api_url
        self.service = service
        self.compose_file = compose_file

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
        except (subprocess.SubprocessError, OSError):
            pass
        self.log("Docker not available or not running", Colors.RED)
        return False

    def compose(self, *args, **kwargs):
        return subprocess.run(
            ['docker', 'compose', '-f', self.compose_file, *args],
            capture_output=True, text=True, **kwargs,
        )

    def start_stack(self):
        self.log(f"Starting '{self.service}' via docker compose up --build -d ...", Colors.BLUE)
        result = self.compose('up', '--build', '-d', self.service, timeout=600)
        if result.returncode != 0:
            self.log(f"docker compose up failed:\n{result.stderr}", Colors.RED)
            return False
        self.log("Stack started", Colors.GREEN)
        return True

    def stop_service(self):
        # `stop` (not `down`) so the container still exists afterwards and we
        # can read its final log lines. `down` removes the container, and a
        # removed container has no logs left to read.
        self.log(f"Stopping '{self.service}' via docker compose stop ...", Colors.BLUE)
        result = self.compose('stop', self.service, timeout=60)
        if result.returncode != 0:
            self.log(f"docker compose stop failed:\n{result.stderr}", Colors.RED)
            return False
        self.log("Service stopped", Colors.GREEN)
        return True

    def teardown(self):
        self.log("Tearing down stack via docker compose down ...", Colors.BLUE)
        result = self.compose('down', timeout=120)
        if result.returncode != 0:
            self.log(f"docker compose down failed:\n{result.stderr}", Colors.RED)
            return False
        self.log("Stack torn down", Colors.GREEN)
        return True

    def get_service_logs(self):
        result = self.compose('logs', '--no-color', self.service)
        return result.stdout

    def check_health_endpoint(self, max_retries=12):
        self.log("Checking API health endpoint...", Colors.BLUE)

        for attempt in range(max_retries):
            try:
                with urllib.request.urlopen(f"{self.api_url}/", timeout=5) as response:
                    if response.status == 200:
                        self.log("Health endpoint responding", Colors.GREEN)
                        return True
            except (urllib.error.URLError, ConnectionError, TimeoutError):
                pass
            if attempt < max_retries - 1:
                self.log(f"Attempt {attempt + 1}/{max_retries}: API not ready, waiting...", Colors.YELLOW)
                time.sleep(5)
        self.log("Health check failed - API not responding", Colors.RED)
        return False

    def check_log_contains(self, logs, needle, description):
        if needle in logs:
            self.log(f"Found {description} log line", Colors.GREEN)
            return True
        self.log(f"Missing {description} log line (looked for: {needle!r})", Colors.RED)
        return False


def main():
    validator = DockerValidator()

    if not validator.check_docker_available():
        sys.exit(1)

    if not validator.start_stack():
        sys.exit(1)

    try:
        health_ok = validator.check_health_endpoint()
        startup_logs = validator.get_service_logs()
        startup_log_ok = validator.check_log_contains(startup_logs, 'server started', 'startup')

        if not validator.stop_service():
            sys.exit(1)

        # Give the container a moment to flush its final log lines before reading them.
        time.sleep(2)
        shutdown_logs = validator.get_service_logs()
        shutdown_log_ok = validator.check_log_contains(shutdown_logs, 'shutdown complete', 'shutdown')

        validator.teardown()

        if health_ok and startup_log_ok and shutdown_log_ok:
            validator.log("DOCKER VALIDATION SUCCESSFUL", Colors.GREEN)
            sys.exit(0)
        else:
            validator.log("DOCKER VALIDATION FAILED", Colors.RED)
            sys.exit(1)
    except BaseException:
        # Best-effort cleanup so a failed run doesn't leave the stack running.
        validator.compose('down')
        raise


if __name__ == '__main__':
    main()
