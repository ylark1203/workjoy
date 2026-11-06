<div align="center">
  <h1>WorkJoy 🌤️</h1>
  <p><strong>工位能量站 · 给忙碌的工作日充点电</strong></p>
  <p>让下班有期待，让努力有回响，让休息更安心。</p>
  <p>一款本地优先、轻量低干扰的 Windows 桌面陪伴工具。</p>

  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?style=flat-square" alt="Windows 10 / 11" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/Tauri-2-FFC131?style=flat-square" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/Privacy-Local%20First-2EA44F?style=flat-square" alt="Local First" />
</div>

## ✨ 给工作日，加一点期待

上班不只有忙碌，也可以有一些小小的确定感：

看看距离下班还有多久，见证每一秒努力的回响，再安心休息一会儿。WorkJoy 把这些细碎但真实的期待，放进一个安静、好看的桌面空间。

无需注册，无需联网，不监控你的工作。你的数据，始终只留在本机。💚

## 💡 你会喜欢它的理由

- ⏰ **下班不再遥遥无期**：根据工作日、上下班与午休安排，实时展示倒计时和有效工作进度。
- 💰 **努力每秒都有回响**：将工作时间折算为今日收入，用轻盈的新增收入动画记录每一小段积累。
- 🧾 **收入估算更贴近实际**：支持税前工资扣除社保、公积金、预估个税及固定扣款；数据不确定时也能正常使用。
- 💧 **记得照顾自己**：喝水、久坐和眼睛休息提醒，通过系统通知轻轻提示，不打断当前工作。
- 📖 **阅读不必大张旗鼓**：导入本地 TXT，自动保存阅读位置，用低干扰阅读条享受片刻松弛。
- 🧩 **需要时出现，不需要时退后**：系统托盘、全局隐藏快捷键、开机启动和极简窗口，让陪伴恰到好处。

## 🎛️ 功能一览

| 模块 | 能力 |
| --- | --- |
| 🏠 今日概览 | 下班倒计时、有效工作进度、今日收入与实时增量动画 |
| 🧾 收入估算 | 税前 / 税后工资、社保、公积金、预估个税及其他固定扣款 |
| 🎉 期待清单 | 周末倒计时、发薪日倒计时 |
| 💧 健康提醒 | 喝水、久坐、眼睛休息提醒 |
| 📚 本地阅读 | TXT 导入、段落定位、阅读进度保存、自动滚动 |
| 📌 极简模式 | 自选显示内容、工资增量交叠动画、自适应尺寸、右键配置、双击恢复 |
| 🎨 桌面体验 | 本地 Inter / Noto Sans SC 字体、浅色 / 深色 / 跟随系统主题 |
| ⚙️ 系统能力 | 系统托盘、全局快捷键、开机启动、可记住的关闭行为 |

## 🖱️ 常用操作

- **双击极简窗口**：立即恢复完整主界面。
- **右键极简窗口**：打开自适应配置菜单，选择显示内容或开启鼠标穿透。
- **收进托盘**：保留后台运行，随时从托盘恢复。
- **全局快捷键**：显示或隐藏 WorkJoy，默认 `Ctrl + Alt + H`。
- **关闭主窗口**：可选择直接退出、收进托盘或进入极简模式，并支持记住下次选择。

## 🔐 你的数据，只属于你

WorkJoy 坚持**本地优先**，不把你的生活变成别人的数据：

- 💻 工资、工作设置与阅读状态均在本机处理和保存。
- 📁 阅读器只保存文件路径与阅读位置，不将整本书复制进数据库。
- 🚫 不包含账号体系、后台上传或隐式遥测。
- 🛡️ 不记录键盘、不录屏、不采集剪贴板、浏览器历史或工作软件使用情况。

## 🚀 快速开始

### 🧰 环境要求

- Windows 10 / 11
- Node.js 20+
- Rust stable
- Visual Studio C++ Build Tools
- WebView2

### 📦 安装与运行

```powershell
npm install

# 浏览器预览，桌面能力提供安全降级
npm run dev

# 启动完整的 Windows 桌面应用
npm run tauri:dev
```

<details>
<summary>💾 可选：将依赖与缓存保存在项目目录，减少 C 盘占用</summary>

在 PowerShell 中执行：

```powershell
$env:npm_config_cache = "$PWD\.cache\npm"
$env:RUSTUP_HOME = "$PWD\.cache\rustup"
$env:CARGO_HOME = "$PWD\.cache\cargo"
```

</details>

## 🛠️ 开发命令

```powershell
npm run lint         # TypeScript 静态检查
npm run test         # 运行 Vitest 单元测试
npm run build        # 构建前端
npm run tauri:build  # 构建 Windows 桌面安装包
```

## 🏗️ 技术栈与项目结构

基于 **React 19、TypeScript、Vite、Tauri 2 和 Rust** 构建。时间与工资算法分别集中在 `timeService` 和 `salaryService`，核心逻辑与关键交互由 Vitest 测试覆盖。

```text
src/
├── App.tsx          应用界面与交互
├── main.tsx         应用入口与本地字体加载
├── services/        时间、工资、桌面能力与本地存储
└── types/           数据模型
src-tauri/           Tauri 2 Rust 桌面壳
```

## 🗺️ Roadmap

- 📅 法定节假日与更灵活的工作日历
- 📊 工作统计与桌面小组件
- 📚 更多本地阅读格式
- 🎨 更多主题与个性化选项
- 🤖 AI 每日总结的本地能力探索

---

<div align="center">
  <strong>愿每一个工作日，都多一点轻松和期待。🌱</strong>
</div>
