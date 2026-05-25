FROM node:22-bookworm

# System dependencies — git/curl/jq for the agent, build tools for Strapi/Next.js
# native modules (sharp, better-sqlite3, etc.), python3 for tools/*.py.
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  python3 \
  python3-pip \
  make \
  g++ \
  openssl \
  ca-certificates \
  unzip \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Build-args for UID/GID alignment with the host user.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# macOS host GIDs (e.g. 20 = staff) often collide with Debian system groups
# (20 = dialout). Force-delete the conflicting group before reassigning so
# groupmod doesn't fail. The `node` base group is preserved; any other
# colliding group is removed.
RUN if getent group $AGENT_GID >/dev/null; then \
      CONFLICT_GROUP=$(getent group $AGENT_GID | cut -d: -f1); \
      if [ "$CONFLICT_GROUP" != "node" ]; then \
        groupdel -f "$CONFLICT_GROUP" 2>/dev/null || true; \
      fi; \
    fi && \
    groupmod -g $AGENT_GID node && \
    usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node

USER ${AGENT_UID}:${AGENT_GID}

# Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

# Sandcastle bind-mounts the host git worktree at /home/agent/workspace and
# overrides the working directory at container start.
ENTRYPOINT ["sleep", "infinity"]
