# 📱 使用 GitHub Actions 自动构建 APK

**完全免费！** 只需推送代码到 GitHub，自动构建 APK。

---

## 🚀 快速开始（3步完成）

### 第 1 步：上传到 GitHub

```bash
cd /tmp/avalon-analyzer

# 初始化 Git 仓库
git init
git add .
git commit -m "初始提交：阿瓦隆分析工具"

# 创建 GitHub 仓库（在 GitHub 网站上创建）
# 然后关联并推送
git remote add origin https://github.com/你的用户名/avalon-analyzer.git
git branch -M main
git push -u origin main
```

### 第 2 步：等待自动构建

推送代码后，GitHub Actions 会自动开始构建 APK：

1. 访问你的 GitHub 仓库
2. 点击顶部的 **Actions** 标签
3. 查看构建进度（大约 3-5 分钟）

### 第 3 步：下载 APK

构建完成后：

1. 点击最新的构建任务
2. 滚动到页面底部的 **Artifacts** 区域
3. 下载 `阿瓦隆分析-debug.apk`
4. 传输到手机并安装

---

## 📸 图文教程

### 创建 GitHub 仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 `+` → `New repository`
3. 输入仓库名称：`avalon-analyzer`
4. 设置为 Public（免费构建需要公开仓库）
5. 点击 `Create repository`

### 推送代码

```bash
cd /tmp/avalon-analyzer
git init
git add .
git commit -m "初始提交"
git remote add origin https://github.com/你的用户名/avalon-analyzer.git
git push -u origin main
```

### 查看构建结果

```
你的仓库
 └── Actions 标签
      └── 构建 Android APK
           └── Artifacts (下载区域)
                └── 阿瓦隆分析-debug.apk ⬇️
```

---

## 🔄 修改代码后重新构建

每次修改代码并推送，都会自动触发新的构建：

```bash
# 修改代码后
git add .
git commit -m "更新功能"
git push

# 自动开始构建新的 APK
```

---

## 🎯 手动触发构建

不想推送代码也能构建：

1. 访问仓库的 **Actions** 标签
2. 点击左侧的 `构建 Android APK`
3. 点击右侧的 `Run workflow` 按钮
4. 点击绿色的 `Run workflow` 确认

---

## ✅ 构建完成后

APK 文件下载到手机后：

1. 在手机上打开文件管理器
2. 找到 `app-debug.apk` 文件
3. 点击安装
4. 如果提示"禁止安装未知来源应用"：
   - 打开 **设置** → **安全** 
   - 允许从此来源安装应用

---

## 🆚 对比其他方案

| 方案 | 费用 | 所需时间 | 难度 |
|------|------|---------|------|
| **GitHub Actions** | 免费 ⭐ | 3-5分钟 | 简单 ⭐⭐ |
| Ionic Appflow | 付费 💰 | 5-10分钟 | 简单 ⭐⭐ |
| 本地构建 | 免费 | 30-60分钟 | 复杂 ⭐⭐⭐⭐ |

---

## 📋 项目结构

```
avalon-analyzer/
├── .github/
│   └── workflows/
│       └── build-apk.yml    ← 自动构建配置
├── src/                      ← React 源代码
├── android/                  ← Android 项目
├── capacitor.config.ts       ← Capacitor 配置
└── BUILD_APK.md             ← 本地构建指南
```

---

## 🐛 常见问题

### Q: 构建失败了怎么办？

**A:** 查看 Actions 页面的构建日志，找到错误信息。常见原因：
- 依赖安装失败 → 检查 package.json
- 构建错误 → 检查代码语法

### Q: 能构建 Release 版本吗？

**A:** 可以！修改 `.github/workflows/build-apk.yml`：
```yaml
./gradlew assembleRelease  # 替换 assembleDebug
```

但需要配置签名密钥（参考 BUILD_APK.md）

### Q: 私有仓库能用吗？

**A:** 可以，但 GitHub Actions 的免费额度有限制：
- 公开仓库：无限制 ✅
- 私有仓库：每月 2000 分钟

---

## 🎉 完成！

现在你的阿瓦隆分析工具可以自动构建成 APK 了！

**下一步：**
1. 将项目推送到 GitHub
2. 等待自动构建完成
3. 下载并安装 APK 到手机
