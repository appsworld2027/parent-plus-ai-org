#!/usr/bin/env bash
# Creates the two users and the network rules, then proves they hold. Fails closed.
set -euo pipefail
for u in trialagent trialproxy; do id "$u" >/dev/null 2>&1 || sudo useradd --create-home --shell /bin/bash "$u"; sudo chmod 700 "/home/$u"; done
for ipt in iptables ip6tables; do
  sudo $ipt -A OUTPUT -m owner --uid-owner trialagent -p udp --dport 53 -j REJECT
  sudo $ipt -A OUTPUT -m owner --uid-owner trialagent -p tcp --dport 53 -j REJECT
  # The engine (and its settings pages) is reachable only through the gate.
  sudo $ipt -A OUTPUT -m owner --uid-owner trialagent -o lo -p tcp --dport 8082 -j REJECT
  sudo $ipt -A OUTPUT -m owner --uid-owner trialagent -o lo -j ACCEPT
  sudo $ipt -A OUTPUT -m owner --uid-owner trialagent -j REJECT
done
sudo -u trialagent sudo -n true 2>/dev/null && { echo "::error::agent user has sudo"; exit 1; }
sudo -u trialagent curl -s -m 8 -o /dev/null https://github.com && { echo "::error::agent user can reach the internet"; exit 1; }
sudo -u trialagent test -r /home/trialproxy && { echo "::error::agent user can read the proxy home"; exit 1; }
echo "isolation checks passed"
