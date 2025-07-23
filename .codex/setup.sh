#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

# Backend deps
cd backend && npm ci
# Frontend deps
cd ../frontend && npm ci
