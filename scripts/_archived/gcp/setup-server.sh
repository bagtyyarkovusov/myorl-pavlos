#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# One-time Server Setup Script for Ubuntu 22.04 on GCP
# =============================================================================
# Run this after creating the VM and adding your SSH key.
# =============================================================================

log() {
  echo -e "\033[0;32m[setup]\033[0m $1"
}

warn() {
  echo -e "\033[1;33m[setup]\033[0m $1"
}

log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

log "Installing Docker..."
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Adding user to docker group..."
sudo usermod -aG docker "$USER"

log "Installing git & essential tools..."
sudo apt install -y git ufw fail2ban

log "Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

log "Installing fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

log "Setting up unattended security updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

log "============================================"
log "Server setup complete!"
warn "You MUST log out and SSH back in for docker group to take effect."
log "Next steps:"
log "  1. git clone your repo"
log "  2. cp .env.production.example .env && nano .env"
log "  3. bash scripts/deploy.sh"
log "============================================"
