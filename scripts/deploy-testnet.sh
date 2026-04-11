#!/usr/bin/env bash
set -euo pipefail

# Deploys agent_identity + agentic_commerce to Stellar testnet.
#
# Prereqs:
#   - stellar CLI 25.x
#   - A configured identity named "deployer" on testnet, funded by friendbot:
#       stellar keys generate deployer --network testnet --fund
#
# Output:
#   - target/wasm32v1-none/release/{agent_identity,agentic_commerce}.wasm (optimized in place)
#   - deployments/testnet.json with the deployed contract addresses

NETWORK="testnet"
IDENTITY="deployer"
OUT_DIR="deployments"
OUT_FILE="$OUT_DIR/testnet.json"

IDENTITY_WASM="target/wasm32v1-none/release/agent_identity.wasm"
COMMERCE_WASM="target/wasm32v1-none/release/agentic_commerce.wasm"

mkdir -p "$OUT_DIR"

echo "==> Building + optimizing contracts (stellar contract build --optimize)"
# 25.x: `build --optimize` builds, optimizes, and writes the wasm in-place.
# The deprecated `stellar contract optimize` command is NOT used here —
# see CLAUDE.md "Gotchas learned".
stellar contract build --optimize

if [[ ! -f "$IDENTITY_WASM" ]]; then
  echo "ERROR: expected optimized wasm at $IDENTITY_WASM" >&2
  exit 1
fi
if [[ ! -f "$COMMERCE_WASM" ]]; then
  echo "ERROR: expected optimized wasm at $COMMERCE_WASM" >&2
  exit 1
fi

ADMIN=$(stellar keys address "$IDENTITY")
echo "==> Deployer address: $ADMIN"

echo "==> Deploying agent_identity"
# `stellar contract deploy` prints progress lines on stderr and the final
# contract C... address on stdout, so capturing $(...) yields just the ID.
IDENTITY_ADDR=$(stellar contract deploy \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  --wasm "$IDENTITY_WASM")
echo "    agent_identity   = $IDENTITY_ADDR"

echo "==> Deploying agentic_commerce"
COMMERCE_ADDR=$(stellar contract deploy \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  --wasm "$COMMERCE_WASM")
echo "    agentic_commerce = $COMMERCE_ADDR"

echo "==> Initializing agentic_commerce (admin=treasury=$ADMIN)"
stellar contract invoke \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  --id "$COMMERCE_ADDR" \
  -- init --admin "$ADMIN" --treasury "$ADMIN"

cat > "$OUT_FILE" <<EOF
{
  "network": "testnet",
  "deployer": "$ADMIN",
  "agent_identity": "$IDENTITY_ADDR",
  "agentic_commerce": "$COMMERCE_ADDR",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "==> Wrote $OUT_FILE"
echo "==> Done."
