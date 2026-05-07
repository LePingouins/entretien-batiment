#!/bin/bash
# =============================================================================
# deploy.sh — Pull latest code, build frontend + backend, restart the backend.
#
# USAGE (on the server):
#   chmod +x deploy.sh   # only needed once
#   ./deploy.sh
#
# REQUIREMENTS:
#   - Git, Node.js, npm, Java 17+ must be installed on the server
#   - A .env file must exist at ~/entretien-batiment/.env
#   - Docker must be running (for the DB container)
# =============================================================================

set -e  # Exit immediately on any error
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
SERVICE_NAME="entretien-backend"
LOG_FILE="$REPO_DIR/deploy.log"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; echo "[$(date '+%H:%M:%S')] $1" >> "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "============================================================"
echo "  Entretien-Bâtiment — Deploy $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ─── 1. Pull latest code ──────────────────────────────────────────────────────
step "Pulling latest code from GitHub..."
cd "$REPO_DIR"
git pull origin master

# ─── 2. Build backend ─────────────────────────────────────────────────────────
step "Building backend JAR..."
cd "$BACKEND_DIR"
chmod +x gradlew
./gradlew bootJar -q
JAR_FILE=$(ls "$BACKEND_DIR/build/libs/"*.jar | grep -v plain | head -n 1)
[ -z "$JAR_FILE" ] && error "No JAR produced. Check Gradle build output."
step "Backend JAR: $JAR_FILE"

# ─── 3. Build frontend ────────────────────────────────────────────────────────
step "Building frontend..."
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps --silent
npm run build
step "Deploying frontend to /var/www/entretien-batiment..."
rm -rf /var/www/entretien-batiment
cp -r "$FRONTEND_DIR/dist" /var/www/entretien-batiment
step "Frontend deployed → /var/www/entretien-batiment"

# ─── 4. Restart backend ───────────────────────────────────────────────────────
cd "$REPO_DIR"

if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null || systemctl status "$SERVICE_NAME" &>/dev/null; then
    # ── systemd service exists ───────────────────────────────────────────────
    step "Restarting via systemd ($SERVICE_NAME)..."
    systemctl restart "$SERVICE_NAME"
    sleep 3
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        step "✓ Backend is running (systemd)"
    else
        error "Backend failed to start. Run: journalctl -u $SERVICE_NAME -n 50"
    fi

elif [ -f "$REPO_DIR/backend.pid" ]; then
    # ── PID file from a previous manual run ──────────────────────────────────
    OLD_PID=$(cat "$REPO_DIR/backend.pid")
    step "Stopping old backend process (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
    start_backend
else
    # ── Not running yet — start it ────────────────────────────────────────────
    warn "Backend is not running. Starting it now..."
    start_backend
fi

echo ""
echo "============================================================"
echo -e "  ${GREEN}Deploy complete!${NC}"
echo "============================================================"
echo ""

# ─── Helper: start backend as background process ─────────────────────────────
start_backend() {
    [ -f "$REPO_DIR/.env" ] && set -a && source "$REPO_DIR/.env" && set +a
    nohup java -jar "$JAR_FILE" \
        --spring.profiles.active=prod \
        > "$REPO_DIR/backend-stdout.log" 2>&1 &
    echo $! > "$REPO_DIR/backend.pid"
    sleep 5
    if kill -0 "$(cat "$REPO_DIR/backend.pid")" 2>/dev/null; then
        step "✓ Backend started (PID $(cat "$REPO_DIR/backend.pid"))"
    else
        error "Backend failed to start. Check: $REPO_DIR/backend-stdout.log"
    fi
}
