#!/bin/bash

# filepath: /home/fatpaper-monopoly/quick-dev-end.sh

# 停止所有相關的 yarn dev 進程
echo "Stopping all services..."

# 使用 pgrep 和 xargs 組合來終止所有 yarn dev 進程
pgrep -f "monopoly" | xargs kill

pgrep -f "fatpaper" | xargs kill

echo "All services stopped."