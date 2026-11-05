# WorkJoy MVP 实施计划

## 阶段

1. 创建 React + TypeScript + Vite 前端与 Tauri 2 桌面壳。
2. 实现本地设置、TimeService、SalaryService、倒计时和发薪日算法。
3. 实现首页、设置、番茄钟、提醒和 TXT 阅读模式。
4. 接入托盘、全局快捷键、系统通知、开机启动等桌面能力。
5. 通过 lint、单元测试、前端构建和 Windows Tauri 构建验证。

## 取舍

- 本地存储使用 Tauri Store；浏览器开发模式使用 localStorage 兼容层。
- 阅读内容不复制进存储，只保存文件路径、段落索引和最近阅读时间。
- 视觉使用原生 CSS，不引入大型 UI 框架，降低常驻开销。
- 桌面能力通过 Tauri 插件按需调用；浏览器预览时提供安全降级。
