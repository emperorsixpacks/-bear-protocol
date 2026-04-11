#!/usr/bin/env bash
set -euo pipefail

echo "==> Building + optimizing Soroban contracts (wasm32v1-none, release)"
# `stellar contract build --optimize` supersedes the deprecated
# `stellar contract optimize` command in stellar-cli 25.x.
stellar contract build --optimize

echo "==> Building SDK (TypeScript)"
( cd sdk && npm run build )

echo "==> Done"
