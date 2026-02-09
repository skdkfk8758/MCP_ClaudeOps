#!/usr/bin/env bash
set -euo pipefail

# ClaudeOps Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/skdkfk8758/MCP_ClaudeOps/main/install.sh | bash

INSTALL_DIR="${CLAUDEOPS_HOME:-$HOME/.claudeops-install}"
BIN_DIR="${HOME}/.local/bin"
REPO_URL="https://github.com/skdkfk8758/MCP_ClaudeOps.git"

info()  { printf '\033[34m[ClaudeOps]\033[0m %s\n' "$1"; }
ok()    { printf '\033[32m[  OK  ]\033[0m %s\n' "$1"; }
warn()  { printf '\033[33m[ WARN ]\033[0m %s\n' "$1"; }
fail()  { printf '\033[31m[FAIL  ]\033[0m %s\n' "$1"; exit 1; }

# Step 1: Check Node.js
info "Checking Node.js..."
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node.js 20+ first: https://nodejs.org"
fi
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js 20+ required (found $(node -v))"
fi
ok "Node.js $(node -v)"

# Step 2: Check/install pnpm
info "Checking pnpm..."
if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found — installing..."
  npm install -g pnpm || fail "Failed to install pnpm"
fi
ok "pnpm $(pnpm -v)"

# Step 3: Clone or update
info "Installing to ${INSTALL_DIR}..."
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Existing installation found — updating..."
  git -C "$INSTALL_DIR" pull --ff-only || warn "git pull failed — using existing version"
else
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR" || fail "git clone failed"
fi
ok "Source ready"

# Step 4: Install dependencies & build
info "Installing dependencies..."
cd "$INSTALL_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
ok "Dependencies installed"

info "Building packages..."
pnpm turbo run build || fail "Build failed"
ok "All packages built"

# Step 5: Create symlink
info "Creating claudeops command..."
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/claudeops" << 'WRAPPER'
#!/usr/bin/env bash
exec node "$HOME/.claudeops-install/packages/cli/dist/index.js" "$@"
WRAPPER
chmod +x "$BIN_DIR/claudeops"
ok "claudeops command installed"

# Step 6: Check PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  warn "$BIN_DIR is not in PATH"
  echo ""
  echo "  Add to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

# Done
echo ""
echo -e "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\033[32m  ClaudeOps installed successfully!\033[0m"
echo -e "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo ""
echo "  Next: Set up monitoring in your project:"
echo ""
echo "    cd /path/to/your-project"
echo "    claudeops setup"
echo ""
