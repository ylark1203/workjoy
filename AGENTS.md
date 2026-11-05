# WorkJoy Agent Rules

- 保持本地优先：不得加入服务器、账号、上传、遥测或工作监控。
- 时间算法集中在 `src/services/timeService.ts`，工资算法集中在 `src/services/salaryService.ts`。
- 新增核心算法必须增加单元测试。
- 修改前先理解相关代码，不破坏现有功能；优先简单、稳定、可维护的方案。
- 依赖和缓存优先放在 F 盘项目目录，避免使用 C 盘存储。
- 完成修改后运行 `npm run lint`、`npm run test` 与 `npm run build`；若涉及 Tauri，再运行 `npm run tauri:build`。
