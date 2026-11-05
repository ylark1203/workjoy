# WorkJoy · 工位能量站

面向办公室白领的本地优先桌面陪伴工具：看下班倒计时、感知时间折算收入、安排专注与休息，并低干扰地阅读本地 TXT。

## 功能

- 工作日、上下班与午休配置；下班倒计时和有效工作进度
- 时间折算收入、周末倒计时和发薪日倒计时
- 可调番茄钟、喝水/久坐/眼睛休息提醒
- TXT 导入、段落阅读位置保存、低干扰阅读条
- 浅色/深色/跟随系统主题、系统托盘、全局隐藏快捷键、开机启动开关
- 点击窗口关闭按钮时，可选择退出或最小化到托盘，并支持记住下次选择
- 极简模式窗口：右下角显示可选信息，支持右键配置、内容自适应尺寸和双击恢复完整界面
- 所有设置仅保存于本机，不上传任何数据

## 截图占位

运行应用后可在此补充首页和阅读条截图。

## 技术栈

React 19、TypeScript、Vite、Tauri 2、Rust。业务时间和工资算法分别位于 `src/services`，核心逻辑带 Vitest 测试。

## 开发环境

- Windows 10/11
- Node.js 20+
- Rust stable、Visual Studio C++ Build Tools、WebView2

为节省 C 盘空间，建议在 PowerShell 中使用项目目录下的缓存：

```powershell
$env:npm_config_cache = "$PWD\.cache\npm"
$env:RUSTUP_HOME = "$PWD\.cache\rustup"
$env:CARGO_HOME = "$PWD\.cache\cargo"
```

## 安装与运行

```powershell
npm install
npm run dev              # 浏览器预览
npm run tauri:dev        # Windows 桌面应用
```

## 测试与构建

```powershell
npm run lint
npm run test
npm run build
npm run tauri:build
```

## 隐私

WorkJoy 不包含键盘记录、屏幕录制、剪贴板监控、浏览器历史采集、工作软件使用监控、后台数据上传或隐式遥测。工资、工作设置和阅读状态均在本地处理与保存；导入阅读器只保存文件路径与阅读位置，不复制整本书到数据库。

## 目录结构

```text
src/components   可复用 UI
src/pages        首页、设置、阅读器
src/services     时间、工资、桌面能力与本地存储
src/types        数据模型
src-tauri        Tauri 2 Rust 壳
```

## Roadmap

法定节假日、工作统计、桌面小组件、更多阅读格式、账号与同步、主题商店和 AI 每日总结留待后续版本。
