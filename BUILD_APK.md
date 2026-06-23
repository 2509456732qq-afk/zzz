# 📱 构建 Android APK 指南

本指南将帮助你将阿瓦隆分析工具打包成 Android APK 文件。

---

## 📋 前置要求

### 1. 安装 Android Studio
下载并安装 [Android Studio](https://developer.android.com/studio)

### 2. 安装 JDK
确保已安装 Java Development Kit (JDK) 17 或更高版本。

检查 Java 版本：
```bash
java -version
```

---

## 🚀 构建步骤

### 方法一：使用 Android Studio（推荐）

1. **同步项目资源**
```bash
cd /tmp/avalon-analyzer
npm run android:sync
```

2. **打开 Android Studio**
```bash
npm run android:open
```
或者手动打开 Android Studio，然后打开 `android` 文件夹。

3. **等待 Gradle 同步完成**
首次打开会自动下载依赖，耐心等待。

4. **生成 APK**
   - 点击菜单：`Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - 等待构建完成
   - 点击通知中的 `locate` 查看 APK 位置

APK 文件路径：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 方法二：使用命令行

1. **同步项目资源**
```bash
cd /tmp/avalon-analyzer
npm run android:sync
```

2. **进入 Android 目录**
```bash
cd android
```

3. **构建 Debug APK**
```bash
./gradlew assembleDebug
```

4. **查找生成的 APK**
```bash
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

---

## 📦 生成签名 APK（用于发布）

### 1. 生成密钥库

```bash
cd android/app
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

按提示输入密码和信息。

### 2. 配置签名

编辑 `android/app/build.gradle`，在 `android` 块中添加：

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('my-release-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

### 3. 构建 Release APK

```bash
cd android
./gradlew assembleRelease
```

生成的 APK 位置：
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📲 安装到手机

### 方法一：通过 USB 连接

1. 手机开启**开发者模式**和 **USB 调试**
2. 用 USB 连接手机和电脑
3. 运行命令：
```bash
cd android
./gradlew installDebug
```

### 方法二：直接传输 APK

1. 将 APK 文件传输到手机
2. 在手机上点击 APK 文件安装
3. 如果提示"禁止安装未知来源应用"，需要在设置中允许

---

## 🔧 常见问题

### Q: Gradle 构建失败
**A:** 确保安装了 Android Studio 和 JDK 17+，并配置了 ANDROID_HOME 环境变量。

### Q: 修改代码后如何更新 APK？
**A:** 
```bash
npm run android:sync
cd android
./gradlew assembleDebug
```

### Q: 如何修改应用图标？
**A:** 替换 `android/app/src/main/res/` 下的图标文件。

### Q: 如何修改应用名称？
**A:** 编辑 `capacitor.config.ts` 中的 `appName`，然后重新同步。

---

## 📝 快速命令参考

```bash
# 开发 Web 版本
npm run dev

# 构建 Web 版本
npm run build

# 同步到 Android（构建 + 复制资源）
npm run android:sync

# 打开 Android Studio
npm run android:open

# 构建 Debug APK（命令行）
cd android && ./gradlew assembleDebug

# 构建 Release APK（命令行）
cd android && ./gradlew assembleRelease

# 安装到连接的设备
cd android && ./gradlew installDebug
```

---

## 🎉 完成！

现在你已经可以将阿瓦隆分析工具安装到 Android 手机上了！

APK 文件位置：
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`
