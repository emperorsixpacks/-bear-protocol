#!/usr/bin/env bash
set -euo pipefail

echo "==> Building Soroban contracts (wasm32v1-none, release)"
cargo build --target wasm32v1-none --release

echo "==> Optimizing WASM outputs"
for wasm in target/wasm32v1-none/release/*.wasm; do
  [ -f "$wasm" ] || continue
  stellar contract optimize --wasm "$wasm"
done

echo "==> Building SDK (TypeScript)"
( cd sdk && npm run build )

echo "==> Done"
