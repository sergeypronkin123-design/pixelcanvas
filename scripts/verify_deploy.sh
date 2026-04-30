#!/bin/bash
# Verify deployment health.
# Run after git push: ./scripts/verify_deploy.sh

set -e

API_URL="${API_URL:-https://pixelcanvas-api.onrender.com}"
SITE_URL="${SITE_URL:-https://pixelstake.ru}"

echo "→ Checking API health..."
HEALTH=$(curl -s "${API_URL}/health")
echo "$HEALTH"
if ! echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✗ API unhealthy"
  exit 1
fi
echo "✓ API healthy"

echo ""
echo "→ Checking canvas pixel count..."
PIXELS=$(curl -s "${API_URL}/api/pixels/canvas?x_min=0&y_min=0&x_max=1000&y_max=1000" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('pixels',d)))")
echo "Pixels in cache: $PIXELS"

echo ""
echo "→ Checking specific user pixels (user_id=1)..."
MINE=$(curl -s "${API_URL}/api/pixels/canvas?x_min=0&y_min=0&x_max=1000&y_max=1000" | python3 -c "
import sys, json
d = json.load(sys.stdin)
pixels = d.get('pixels', d)
print(len([p for p in pixels if p.get('user_id') == 1]))
")
echo "Pixels owned by user_id=1: $MINE"

echo ""
echo "→ Checking site loads..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")
if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Site returned HTTP $HTTP_CODE"
  exit 1
fi
echo "✓ Site OK (HTTP $HTTP_CODE)"

echo ""
echo "→ Security headers check..."
HEADERS=$(curl -sI "$SITE_URL")
for h in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options"; do
  if echo "$HEADERS" | grep -qi "$h"; then
    echo "  ✓ $h present"
  else
    echo "  ✗ $h MISSING"
  fi
done

echo ""
echo "═══════════════════════════════════════"
echo "Deployment verification complete"
echo "═══════════════════════════════════════"
