#!/usr/bin/env bash
set -a; source demo/.env; set +a

# Kill any existing processes
pkill -f "tsx index.ts" 2>/dev/null
pkill -f "tsx server.ts" 2>/dev/null
sleep 2

echo "Starting agent registry..."
(cd agents/registry && npm start) &

sleep 2

echo "Starting seller agents..."
(cd agents/seller-webbuilder && SELLER_SECRET=$SELLER_SECRET_1 npm start) &
(cd agents/seller-copywriter && SELLER_SECRET=$SELLER_SECRET_2 npm start) &
(cd agents/seller-namer      && SELLER_SECRET=$SELLER_SECRET_3 npm start) &
(cd agents/seller-researcher && SELLER_SECRET=$SELLER_SECRET_4 npm start) &

echo "All agents starting..."
sleep 3
echo ""
echo "Now start the buyer:"
echo "  cd agents/buyer && npm start"
