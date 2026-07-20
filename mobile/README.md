# MagiesTerminal Mobile (Android APK)

免商店安装的 Android 伴侣应用。用 Capacitor 打包，直接分发 `.apk`。

## 当前能力（v0.1）

- 离线主机清单（本地存储）
- 快速粘贴 `user@host:22`
- 导出 JSON
- 桌面配对入口（协议预留）

完整 SSH / AI / SFTP 仍在桌面 MagiesTerminal。

## 开发

```bash
cd MgTerminal/mobile
npm install
npm run dev          # http://localhost:5175
```

## 生成 Debug APK

需要 Android SDK（命令行工具即可，不必装 Android Studio 完整 IDE）。

```bash
# 一次性：安装 SDK 组件（示例）
export ANDROID_HOME=/usr/local/share/android-commandlinetools
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# 构建
npm install
npm run apk:debug
# 输出：
# android/app/build/outputs/apk/debug/app-debug.apk
# 发布命名：MagiesTerminal-<version>-android.apk
```

安装到手机：

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

或从 [官网下载](https://shell.magies.top/#download) / [GitHub Releases](https://github.com/JasonZhangDad/MgTerminal-releases/releases) 获取 `MagiesTerminal-*-android.apk`，开启「未知来源」后直接安装。

CI：打 `v*` tag 时 `.github/workflows/build-android.yml` 会构建 APK 并挂到 `JasonZhangDad/MgTerminal-releases`。

## Release 签名（可选）

```bash
# 生成 keystore 后配置 android/key.properties，再：
npm run apk:release
```

## 包名

`top.magies.terminal`
