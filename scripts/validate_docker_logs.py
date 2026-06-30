#!/usr/bin/env python3
"""
validate_docker_logs.py — validate startup and exit structured logs of the
Conduit API running inside a Docker container.

Checks:
  1. "server started" JSON log appears within --timeout seconds after the
     container starts, and contains { port, env } fields.
  2. After SIGTERM is sent, "server shutting down" JSON log appears and
     contains the { signal } field.

Usage:
    python3 scripts/validate_docker_logs.py --build
    python3 scripts/validate_docker_logs.py --image conduit-api:test
    python3 scripts/validate_docker_logs.py --build --timeout 60

Options:
    --build         Build (or rebuild) the Docker image before running.
    --image NAME    Image tag to use. Default: conduit-api:test
    --timeout N     Seconds to wait for each log event. Default: 30

Exit codes:
    0  all checks passed
    1  one or more checks failed or an error occurred
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

# ── Configuration ─────────────────────────────────────────────────────────────

DEFAULT_IMAGE = "conduit-api:test"
DEFAULT_TIMEOUT = 30

# Expected pino "msg" values (must match src/main.ts exactly)
MSG_STARTUP = "server started"
MSG_SHUTDOWN = "server shutting down"

# Minimal runtime environment.
# OTEL_SDK_DISABLED=true skips telemetry so startup/shutdown are fast and
# do not depend on a running collector or Postgres.
CONTAINER_ENV = {
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://dummy:dummy@localhost:5432/dummy",
    "JWT_SECRET": "test-secret-do-not-use-in-production",
    "PORT": "3000",
    "OTEL_SDK_DISABLED": "true",
}

# Repo root — script lives at <root>/scripts/validate_docker_logs.py
REPO_ROOT = Path(__file__).resolve().parent.parent


# ── Helpers ───────────────────────────────────────────────────────────────────


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    """Run a command, printing it first."""
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, **kwargs)


def _check_docker() -> None:
    result = _run(["docker", "info"], capture_output=True)
    if result.returncode != 0:
        _fail("Docker daemon is not running or not accessible.")


def _fail(message: str) -> None:
    print(f"\n[ERROR] {message}", file=sys.stderr)
    sys.exit(1)


# ── Image build ───────────────────────────────────────────────────────────────


def build_image(image_name: str) -> None:
    """Build the Docker image from the repo root."""
    print(f"\n[build] Building image '{image_name}' from {REPO_ROOT} ...")
    result = _run(
        ["docker", "build", "-t", image_name, str(REPO_ROOT)],
        cwd=str(REPO_ROOT),
    )
    if result.returncode != 0:
        _fail(f"docker build failed with exit code {result.returncode}.")
    print("[build] Image built successfully.\n")


# ── Log capture ───────────────────────────────────────────────────────────────


class LogCapture:
    """Thread-safe collector for lines written to container stdout/stderr."""

    def __init__(self) -> None:
        self._lines: list[str] = []
        self._lock = threading.Lock()

    def append(self, line: str) -> None:
        with self._lock:
            self._lines.append(line)

    def find_json_msg(self, msg: str) -> Optional[dict]:
        """Return the first JSON log record whose 'msg' field equals *msg*."""
        with self._lock:
            snapshot = list(self._lines)
        for line in snapshot:
            try:
                record = json.loads(line)
                if record.get("msg") == msg:
                    return record
            except (json.JSONDecodeError, AttributeError):
                pass
        return None

    def wait_for_msg(self, msg: str, timeout_seconds: float) -> Optional[dict]:
        """Poll until the desired msg appears or the timeout expires."""
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            found = self.find_json_msg(msg)
            if found:
                return found
            time.sleep(0.1)
        return None


def _stream_output(proc: subprocess.Popen, capture: LogCapture) -> None:
    """Read proc stdout line by line and feed it to *capture*. Runs in a thread."""
    assert proc.stdout is not None
    for raw in proc.stdout:
        line = raw.rstrip("\n")
        print(f"  [container] {line}")
        capture.append(line)


# ── Validation logic ──────────────────────────────────────────────────────────


def validate(image_name: str, timeout: int) -> bool:
    container_name = f"conduit-log-test-{uuid.uuid4().hex[:8]}"
    env_flags: list[str] = []
    for key, value in CONTAINER_ENV.items():
        env_flags += ["-e", f"{key}={value}"]

    cmd = [
        "docker", "run",
        "--name", container_name,
        *env_flags,
        image_name,
    ]

    print(f"[run] Starting container '{container_name}' ...")
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    capture = LogCapture()
    reader = threading.Thread(target=_stream_output, args=(proc, capture), daemon=True)
    reader.start()

    results: dict[str, bool] = {}

    try:
        # ── Check 1: startup log ─────────────────────────────────────────────
        print(f"\n[check 1/2] Waiting for startup log (msg='{MSG_STARTUP}') …")
        startup = capture.wait_for_msg(MSG_STARTUP, timeout)
        if startup:
            port_ok = "port" in startup
            env_ok = "env" in startup
            results["startup_log_present"] = True
            results["startup_has_port_field"] = port_ok
            results["startup_has_env_field"] = env_ok
            print(f"  ✓ Startup log received: {json.dumps(startup)}")
            if not port_ok:
                print("  ✗ Missing field: 'port'")
            if not env_ok:
                print("  ✗ Missing field: 'env'")
        else:
            results["startup_log_present"] = False
            results["startup_has_port_field"] = False
            results["startup_has_env_field"] = False
            print(f"  ✗ Startup log NOT received within {timeout}s")

        # ── Check 2: shutdown log ────────────────────────────────────────────
        print(f"\n[check 2/2] Sending SIGTERM to container '{container_name}' …")
        stop = subprocess.run(
            ["docker", "stop", "--time", "15", container_name],
            capture_output=True,
            text=True,
        )
        if stop.returncode != 0:
            print(f"  Warning: docker stop returned {stop.returncode}: {stop.stderr.strip()}")

        print(f"  Waiting for shutdown log (msg='{MSG_SHUTDOWN}') …")
        shutdown = capture.wait_for_msg(MSG_SHUTDOWN, timeout)
        if shutdown:
            signal_ok = "signal" in shutdown
            results["shutdown_log_present"] = True
            results["shutdown_has_signal_field"] = signal_ok
            print(f"  ✓ Shutdown log received: {json.dumps(shutdown)}")
            if not signal_ok:
                print("  ✗ Missing field: 'signal'")
        else:
            results["shutdown_log_present"] = False
            results["shutdown_has_signal_field"] = False
            print(f"  ✗ Shutdown log NOT received within {timeout}s")

    finally:
        # Always clean up the container
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
        proc.wait(timeout=10)
        reader.join(timeout=5)

    # ── Report ───────────────────────────────────────────────────────────────
    print("\n── Results ──────────────────────────────────────────────────────────")
    all_passed = True
    for check_name, passed in results.items():
        icon = "✓" if passed else "✗"
        label = check_name.replace("_", " ")
        print(f"  {icon}  {label}")
        if not passed:
            all_passed = False

    return all_passed


# ── Entry point ───────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Conduit API startup and exit logs inside Docker.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--build",
        action="store_true",
        help="Build (or rebuild) the Docker image before running.",
    )
    parser.add_argument(
        "--image",
        default=DEFAULT_IMAGE,
        metavar="NAME",
        help=f"Docker image tag to use. Default: {DEFAULT_IMAGE}",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        metavar="N",
        help=f"Seconds to wait for each log event. Default: {DEFAULT_TIMEOUT}",
    )
    args = parser.parse_args()

    _check_docker()

    if args.build:
        build_image(args.image)
    else:
        # Check the image exists locally; if not, build it automatically
        result = subprocess.run(
            ["docker", "image", "inspect", args.image],
            capture_output=True,
        )
        if result.returncode != 0:
            print(f"[info] Image '{args.image}' not found locally — building it now.")
            build_image(args.image)

    try:
        passed = validate(args.image, args.timeout)
    except KeyboardInterrupt:
        print("\n[run] Interrupted.")
        return 1

    if passed:
        print("\n✅ All checks passed.\n")
        return 0
    else:
        print("\n❌ One or more checks failed.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
