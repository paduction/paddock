#!/usr/bin/env bash
# Copies the build to Home Assistant (/homeassistant/www/paddock) over SSH
# ("Terminal & SSH" app, port 2222). Settings come from the environment or tools/deploy.local.env:
#   HA_HOST=root@homeassistant.local   HA_KEY=~/.ssh/id_ed25519   HA_PORT=2222
# Open on the tablet: http://<home-assistant>:8123/local/paddock.html
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$DIR/tools/deploy.local.env" ] && source "$DIR/tools/deploy.local.env"
: "${HA_HOST:?Set HA_HOST, e.g. root@homeassistant.local}"
HA_PORT="${HA_PORT:-2222}"
SSH=(-p "$HA_PORT" -o ConnectTimeout=10)
SCP=(-P "$HA_PORT" -o ConnectTimeout=10)
if [ -n "${HA_KEY:-}" ]; then SSH+=(-i "$HA_KEY"); SCP+=(-i "$HA_KEY"); fi

DIST="$DIR/apps/tablet/dist"
[ -f "$DIST/index.html" ] || { echo "Run 'pnpm build' first"; exit 1; }
# A paddock.yaml with mistakes never reaches Home Assistant
if [ -f "$DIR/paddock.yaml" ]; then
  (cd "$DIR" && pnpm -s tsx tools/config-check.ts --offline) || { echo "Fix paddock.yaml, then deploy again"; exit 1; }
fi

ssh "${SSH[@]}" "$HA_HOST" "rm -rf /homeassistant/www/paddock.next && mkdir -p /homeassistant/www/paddock.next"
scp -q -r "${SCP[@]}" "$DIST/index.html" "$DIST/assets" "$HA_HOST:/homeassistant/www/paddock.next/"
scp -q "${SCP[@]}" "$DIST/loader.html" "$HA_HOST:/homeassistant/www/paddock.html"
# Atomic switch: the tablet never sees a half-copied folder
ssh "${SSH[@]}" "$HA_HOST" "rm -rf /homeassistant/www/paddock.prev; [ -d /homeassistant/www/paddock ] && mv /homeassistant/www/paddock /homeassistant/www/paddock.prev; mv /homeassistant/www/paddock.next /homeassistant/www/paddock && ls /homeassistant/www/paddock/assets | wc -l"

# Paddock integration: hands the home's settings (paddock.yaml) to signed-in devices only
FIRST_INSTALL=$(ssh "${SSH[@]}" "$HA_HOST" "[ -d /homeassistant/custom_components/paddock ] && echo no || echo yes")
ssh "${SSH[@]}" "$HA_HOST" "mkdir -p /homeassistant/custom_components && rm -rf /homeassistant/custom_components/paddock"
scp -q -r "${SCP[@]}" "$DIR/custom_components/paddock" "$HA_HOST:/homeassistant/custom_components/"
if [ -f "$DIR/paddock.yaml" ]; then
  scp -q "${SCP[@]}" "$DIR/paddock.yaml" "$HA_HOST:/homeassistant/paddock.yaml"
  echo "→ paddock.yaml copied"
fi
# Secrets referenced by paddock.yaml (!secret): added to secrets.yaml when missing, values never printed
if [ -f "$DIR/paddock.secrets.local.yaml" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    key="${line%%:*}"
    ssh "${SSH[@]}" "$HA_HOST" "f=/homeassistant/secrets.yaml; grep -q '^$key:' \$f 2>/dev/null || { [ -s \$f ] && [ -n \"\$(tail -c1 \$f)\" ] && echo >> \$f; cat >> \$f; echo '→ secret $key added'; }" <<< "$line"
  done < "$DIR/paddock.secrets.local.yaml"
fi
[ "$FIRST_INSTALL" = yes ] && echo "→ Paddock integration installed: restart Home Assistant, then Settings → Devices & services → Add integration → Paddock"
echo "→ deployed. Tablet URL: /local/paddock.html"
