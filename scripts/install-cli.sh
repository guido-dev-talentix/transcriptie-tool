#!/bin/bash
# Installeert het globale `transcriptie`-commando (wrapper naar scripts/cli.mjs)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="/opt/homebrew/bin/transcriptie"

cat > "$TARGET" <<EOF
#!/bin/bash
exec node "$REPO_ROOT/scripts/cli.mjs" "\$@"
EOF
chmod +x "$TARGET"
echo "Geïnstalleerd: $TARGET → $REPO_ROOT/scripts/cli.mjs"
