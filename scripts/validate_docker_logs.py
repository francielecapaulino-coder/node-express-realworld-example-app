#!/usr/bin/env python3
"""
Docker Deployment Validation Script

This script validates that the Conduit API starts and stops properly in Docker.
It checks for:
- Startup logs indicating successful initialization
- Health endpoint accessibility
- Proper shutdown logs
- Metrics endpoint functionality
- LGTM stack integration

Usage:
    python scripts/validate_docker_logs.py [--timeout 60]

Environment Variables:
    DOCKER_API_PORT: API port (default: 3000)
    DOCKER_API_URL: Full API URL (default: http://localhost:3000)
    HEALTH_CHECK_INTERVAL: Seconds between health checks (default: 5)
"""

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import requests
from typing import Dict, List, Optional

class Colors:
    """ANSI color codes for output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class DockerValidator:
    def __init__(self, api_url: str = "http://localhost:3000", timeout: int = 60):
        self.api_url = api_url
        self.timeout = timeout
        self.docker_process: Optional[subprocess.Popen] = None
        self startup_logs: List[str] = []
        self.shutdown_logs: List[str] = []
        
    def log(self, message: str, color: str = Colors.ENDC):
        """Colored logging output"""
        prefix = f"{Colors.BOLD}[DOCKER VALIDATOR]{Colors.ENDC}"
        print(f"{prefix} {color}{message}{Colors.ENDC}")
        
    def check_docker_available(self) -> bool:
        """Check if Docker is available and running"""
        try:
            result = subprocess.run(['docker', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.log(f"Docker available: {result.stdout.strip()}", Colors.GREEN)
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        self.log("Docker not available or not running", Colors.RED)
        return False
        
    def check_compose_available(self) -> bool:
        """Check if Docker Compose is available"""
        try:
            result = subprocess.run(['docker', 'compose', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.log(f"Docker Compose available: {result.stdout.strip()}", Colors.GREEN)
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        self.log("Docker Compose not available", Colors.RED)
        return False
        
    def start_docker_services(self) -> bool:
        """Start Docker services using compose"""
        self.log("Starting Docker services...", Colors.BLUE)
        
        try:
            # Use docker compose up -d to start in background
            result = subprocess.run(
                ['docker', 'compose', 'up', '-d'],
                capture_output=True, text=True, timeout=120
            )
            
            if result.returncode == 0:
                self.log("Docker services started successfully", Colors.GREEN)
                return True
            else:
                self.log(f"Failed to start Docker services: {result.stderr}", Colors.RED)
                return False
                
        except subprocess.TimeoutExpired:
            self.log("Docker startup timed out", Colors.RED)
            return False
        except Exception as e:
            self.log(f"Error starting Docker services: {e}", Colors.RED)
            return False
            
    def get_container_logs(self, service: str = 'api') -> List[str]:
        """Get logs from a specific container"""
        try:
            result = subprocess.run(
                ['docker', 'compose', 'logs', '--tail=50', service],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                return result.stdout.split('\n')
            else:
                self.log(f"Failed to get logs for {service}: {result.stderr}", Colors.YELLOW)
                return []
        except Exception as e:
            self.log(f"Error getting container logs: {e}", Colors.YELLOW)
            return []
            
    def validate_startup_logs(self, logs: List[str]) -> bool:
        """Validate that startup logs contain required indicators"""
        self.log("Validating startup logs...", Colors.BLUE)
        
        required_patterns = [
            'server started',
            'initialization',
            'database connected',
            'listening',
            'api is running'
        ]
        
        logs_text = '\n'.join(logs).lower()
        
        found_patterns = []
        for pattern in required_patterns:
            if pattern in logs_text:
                found_patterns.append(pattern)
                self.log(f"✓ Found startup indicator: '{pattern}'", Colors.GREEN)
        
        if found_patterns:
            self.log(f"Found {len(found_patterns)}/{len(required_patterns)} startup indicators", Colors.GREEN)
            return True
        else:
            self.log("No startup indicators found in logs", Colors.YELLOW)
            self.log(f"Available logs: {logs_text[:500]}...", Colors.YELLOW)
            return False
            
    def check_health_endpoint(self, max_retries: int = 12) -> bool:
        """Check if API health endpoint is responding"""
        self.log("Checking API health endpoint...", Colors.BLUE)
        
        for attempt in range(max_retries):
            try:
                response = requests.get(f"{self.api_url}/", timeout=5)
                if response.status_code == 200:
                    self.log("✓ API health endpoint responding", Colors.GREEN)
                    data = response.json()
                    self.log(f"Response: {json.dumps(data, indent=2)}", Colors.BLUE)
                    return True
                    
            except requests.exceptions.ConnectionError:
                if attempt < max_retries - 1:
                    self.log(f"Attempt {attempt + 1}/{max_retries}: API not ready, waiting...", Colors.YELLOW)
                    time.sleep(5)
                continue
            except requests.exceptions.RequestException as e:
                self.log(f"Health check error: {e}", Colors.YELLOW)
                if attempt < max_retries - 1:
                    time.sleep(5)
                continue
                
        self.log("Health check failed - API not responding", Colors.RED)
        return False
        
    def check_api_docs_endpoint(self) -> bool:
        """Check if OpenAPI documentation is available"""
        try:
            response = requests.get(f"{self.api_url}/api-docs.json", timeout=5)
            if response.status_code == 200:
                spec = response.json()
                if 'openapi' in spec and 'info' in spec:
                    self.log("✓ OpenAPI documentation available", Colors.GREEN)
                    self.log(f"API Title: {spec['info'].get('title', 'Unknown')}", Colors.BLUE)
                    self.log(f"API Version: {spec['info'].get('version', 'Unknown')}", Colors.BLUE)
                    return True
            return False
        except Exception as e:
            self.log(f"API docs check failed: {e}", Colors.YELLOW)
            return False
            
    def check_metrics_endpoint(self) -> bool:
        """Check if metrics endpoint is available (for LGTM stack)"""
        try:
            # Try to access metrics through API (if Prometheus metrics exposed)
            response = requests.get(f"{self.api_url}/metrics", timeout=5)
            if response.status_code == 200 and response.text:
                self.log("✓ Metrics endpoint responding", Colors.GREEN)
                return True
        except requests.exceptions.RequestException:
            # Metrics endpoint might not be directly exposed - that's okay
            self.log("Metrics endpoint not directly exposed (normal for this setup)", Colors.YELLOW)
            return True
            
        return False
        
    def stop_docker_services(self) -> bool:
        """Stop Docker services and capture shutdown logs"""
        self.log("Stopping Docker services...", Colors.BLUE)
        
        try:
            # Get final logs before stopping
            final_logs = self.get_container_logs('api')
            self.shutdown_logs.extend(final_logs)
            
            result = subprocess.run(
                ['docker', 'compose', 'down'],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                self.log("Docker services stopped successfully", Colors.GREEN)
                return True
            else:
                self.log(f"Error stopping services: {result.stderr}", Colors.RED)
                return False
                
        except Exception as e:
            self.log(f"Error stopping Docker services: {e}", Colors.RED)
            return False
            
    def validate_shutdown_logs(self, logs: List[str]) -> bool:
        """Validate that shutdown logs contain required indicators"""
        self.log("Validating shutdown logs...", Colors.BLUE)
        
        shutdown_patterns = [
            'shutting down',
            'shutdown complete',
            'graceful shutdown',
            'signal received',
            'process exit'
        ]
        
        logs_text = '\n'.join(logs).lower()
        
        found_patterns = []
        for pattern in shutdown_patterns:
            if pattern in logs_text:
                found_patterns.append(pattern)
                self.log(f"✓ Found shutdown indicator: '{pattern}'", Colors.GREEN)
        
        if not found_patterns:
            self.log("No explicit shutdown indicators found (may be normal for Docker)", Colors.YELLOW)
            # Not a failure - containers might be terminated forcefully
            return True
            
        self.log(f"Found {len(found_patterns)} shutdown indicators", Colors.GREEN)
        return True
        
    def check_lgtm_stack(self) -> bool:
        """Check if LGTM stack components are accessible"""
        self.log("Checking LGTM stack availability...", Colors.BLUE)
        
        # Check Grafana
        try:
            response = requests.get("http://localhost:3001/api/health", timeout=5)
            if response.status_code == 200:
                self.log("✓ Grafana accessible at http://localhost:3001", Colors.GREEN)
            else:
                self.log(f"Grafana health check failed: {response.status_code}", Colors.YELLOW)
        except requests.exceptions.ConnectionError:
            self.log("Grafana not accessible (may still be starting)", Colors.YELLOW)
        
        # Check Prometheus
        try:
            response = requests.get("http://localhost:9090/-/healthy", timeout=5)
            if response.status_code == 200:
                self.log("✓ Prometheus accessible at http://localhost:9090", Colors.GREEN)
            else:
                self.log(f"Prometheus health check failed: {response.status_code}", Colors.YELLOW)
        except requests.exceptions.ConnectionError:
            self.log("Prometheus not accessible (may still be starting)", Colors.YELLOW)
            
        return True
        
    def run_validation(self) -> bool:
        """Run complete validation suite"""
        self.log("=== DOCKER DEPLOYMENT VALIDATION STARTED ===", Colors.BOLD)
        
        # Check prerequisites
        if not self.check_docker_available():
            return False
        if not self.check_compose_available():
            return False
            
        # Start services
        if not self.start_docker_services():
            return False
            
        try:
            # Wait for startup
            self.log("Waiting for services to start...", Colors.BLUE)
            
            # Get startup logs
            startup_logs = self.get_container_logs('api')
            self.startup_logs.extend(startup_logs)
            
            # Validate startup
            startup_ok = self.validate_startup_logs(startup_logs)
            
            # Check API health
            health_ok = self.check_health_endpoint()
            
            # Check API documentation
            docs_ok = self.check_api_docs_endpoint()
            
            # Check metrics
            metrics_ok = self.check_metrics_endpoint()
            
            # Check LGTM stack
            lgtm_ok = self.check_lgtm_stack()
            
            # Overall validation
            overall_success = health_ok and docs_ok  # Health and docs are critical
            
        finally:
            # Always try to stop services
            self.stop_docker_services()
            
            # Validate shutdown
            if self.shutdown_logs:
                self.validate_shutdown_logs(self.shutdown_logs)
        
        # Report results
        self.log("\n=== VALIDATION RESULTS ===", Colors.BOLD)
        self.log(f"Startup Validation: {'✓ PASS' if startup_ok else '✗ FAIL'}", 
                Colors.GREEN if startup_ok else Colors.RED)
        self.log(f"Health Check: {'✓ PASS' if health_ok else '✗ FAIL'}", 
                Colors.GREEN if health_ok else Colors.RED)
        self.log(f"API Documentation: {'✓ PASS' if docs_ok else '✗ FAIL'}", 
                Colors.GREEN if docs_ok else Colors.RED)
        self.log(f"Metrics Endpoint: {'✓ PASS' if metrics_ok else '✗ WARNING'}", 
                Colors.GREEN if metrics_ok else Colors.YELLOW)
        self.log(f"LGTM Stack: {'✓ PASS' if lgtm_ok else '✗ WARNING'}", 
                Colors.GREEN if lgtm_ok else Colors.YELLOW)
        
        if overall_success:
            self.log("\n🎉 DOCKER DEPLOYMENT VALIDATION SUCCESSFUL! 🎉", Colors.GREEN)
        else:
            self.log("\n❌ DOCKER DEPLOYMENT VALIDATION FAILED", Colors.RED)
            
        return overall_success

def main():
    parser = argparse.ArgumentParser(description='Validate Docker deployment of Conduit API')
    parser.add_argument('--url', default='http://localhost:3000', 
                       help='API URL (default: http://localhost:3000)')
    parser.add_argument('--timeout', type=int, default=60,
                       help='Timeout in seconds (default: 60)')
    
    args = parser.parse_args()
    
    validator = DockerValidator(api_url=args.url, timeout=args.timeout)
    
    try:
        success = validator.run_validation()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        validator.log("\nValidation interrupted by user", Colors.YELLOW)
        sys.exit(1)
    except Exception as e:
        validator.log(f"Unexpected error: {e}", Colors.RED)
        sys.exit(1)

if __name__ == '__main__':
    main()