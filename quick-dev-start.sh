#!/bin/bash

# filepath: /home/fatpaper-monopoly/quick-dev-start.sh

# 禁用 QuickEdit 模式（僅適用於 Windows，這行可以忽略）
# reg add HKEY_CURRENT_USER\Console /v QuickEdit /t REG_DWORD /d 00000000 /f

# 設置字符編碼為 UTF-8
export LANG=C.UTF-8

# 啟動各個子模組的開發伺服器
startWeb() {
    echo "Starting monopoly-admin..."
    (cd "$(dirname "$0")/monopoly-admin" && yarn dev &)

    echo "Starting monopoly-client..."
    (cd "$(dirname "$0")/monopoly-client" && yarn dev &)

    echo "Starting fatpaper-login..."
    (cd "$(dirname "$0")/fatpaper-login" && yarn dev &)
}

startUserServer() {
    echo "正在启动user服务器..."
    (cd "$(dirname "$0")/fatpaper-user-server" && yarn dev &)

    echo "等待user服务器启动成功..."
    while ! ss -tuln | grep -q ':83'; do
        sleep 5
    done
    echo "user服务器启动成功"
}

startMonopolyServer() {
    echo "正在启动monopoly服务器..."
    (cd "$(dirname "$0")/monopoly-server" && yarn dev &)
}

# 執行腳本
startWeb
startUserServer
startMonopolyServer