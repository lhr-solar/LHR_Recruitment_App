#!/bin/sh
set -e

# The browser and the server share one Supabase URL (http://127.0.0.1:54321). Inside this container
# 127.0.0.1 is the container itself, so forward that port to the Supabase stack running on the host.
# host.docker.internal resolves on OrbStack, Docker Desktop, and Linux (via compose's host-gateway).
if [ -n "$SUPABASE_FORWARD_TO" ]; then
  socat TCP-LISTEN:54321,fork,reuseaddr,bind=127.0.0.1 "TCP:$SUPABASE_FORWARD_TO" &
fi

exec "$@"
