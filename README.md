<div align="center">
  <h1>WorkJoy</h1>
  <p><strong>工位能量站</strong></p>
  <p>让下班有期待，让努力有回响，让专注有节奏。</p>
  <p>一款本地优先、轻量低干扰的 Windows 桌面陪伴工具。</p>

  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?style=flat-square" alt="Windows 10 / 11" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/Tauri-2-FFC131?style=flat-square" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/Privacy-Local%20First-2EA44F?style=flat-square" alt="Local First" />
</div>

## 给工作日，加一点期待

工作不该只有忙碌。WorkJoy 将时间、收入、专注与休息放进一个安静的桌面空间：抬头就能看到距离下班还有多久，低头也能在番茄钟和几段文字之间找回自己的节奏。

无需注册，无需联网，不监控你的工作。所有数据只留在本机。

## 你会喜欢它的理由

- **时间不再模糊**：根据工作日、上下班与午休安排，实时展示下班倒计时和有效工作进度。
- **努力看得见回响**：将工作时间折算为今日收入，同时提供周末与发薪日倒计时。数字仅作时间反馈，不代表真实工资结算。
- **专注与休息同样重要**：可调番茄钟，加上喝水、久坐和眼睛休息提醒，帮你保持舒服的工作节奏。
- **阅读不必大张旗鼓**：导入本地 TXT，自动保存段落阅读位置，用低干扰阅读条享受片刻松弛。
- **需要时出现，不需要时退后**：系统托盘、全局隐藏快捷键、开机启动和可配置极简窗口，让陪伴恰到好处。

## 功能一览

| 模块 | 能力 |
| --- | --- |
| 今日概览 | 下班倒计时、有效工作进度、今日时间折算收入；支持税前工资扣除社保、公积金、预估个税及固定扣款 |
| 期待清单 | 周末倒计时、发薪日倒计时 |
| 专注番茄 | 自定义工作与休息时长、阶段切换提醒 |
| 健康提醒 | 喝水、久坐、眼睛休息提醒 |
| 本地阅读 | TXT 导入、段落定位、阅读进度保存、自动滚动 |
| 极简模式 | 自选显示内容、自适应尺寸、右键配置、双击恢复完整界面 |
| 桌面体验 | 浅色 / 深色 / 跟随系统主题、系统托盘、全局快捷键、开机启动 |
| 关闭行为 | 退出、最小化到托盘或进入极简模式，并支持记住选择 |

## 你的数据，只属于你

WorkJoy 坚持**本地优先**：

- 工资、工作设置与阅读状态均在本机处理和保存。
- 阅读器只保存文件路径与阅读位置，不将整本书复制进数据库。
- 不包含账号体系、后台上传或隐式遥测。
- 不记录键盘、不录屏、不采集剪贴板、浏览器历史或工作软件使用情况。

## 快速开始

### 环境要求

- Windows 10 / 11
- Node.js 20+
- Rust stable
- Visual Studio C++ Build Tools
- WebView2

### 安装与运行

```powershell
npm install

# 浏览器预览，桌面能力提供安全降级
npm run dev

# 启动完整的 Windows 桌面应用
npm run tauri:dev
```

<details>
<summary>可选：将依赖与缓存保存在项目目录，减少 C 盘占用</summary>

在 PowerShell 中执行：

```powershell
$env:npm_config_cache = "$PWD\.cache\npm"
$env:RUSTUP_HOME = "$PWD\.cache\rustup"
$env:CARGO_HOME = "$PWD\.cache\cargo"
```

</details>

## 开发命令

```powershell
npm run lint         # TypeScript 静态检查
npm run test         # 运行 Vitest 单元测试
npm run build        # 构建前端
npm run tauri:build  # 构建 Windows 桌面安装包
```

## 技术栈与项目结构

基于 **React 19、TypeScript、Vite、Tauri 2 和 Rust** 构建。时间与工资算法分别集中在 `timeService` 和 `salaryService`，核心逻辑由 Vitest 测试覆盖。

```text
src/
├── App.tsx          应用界面与交互
├── services/        时间、工资、桌面能力与本地存储
└── types/           数据模型
src-tauri/           Tauri 2 Rust 桌面壳
```

## Roadmap

- 法定节假日与更灵活的工作日历
- 工作统计与桌面小组件
- 更多本地阅读格式
- 更多主题与个性化选项
- AI 每日总结的本地能力探索

---

<div align="center">
  <strong>愿每一个工作日，都多一点轻松和期待。</strong>
</div>
