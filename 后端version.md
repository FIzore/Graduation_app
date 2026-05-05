
# 0.1 version

初始化后端骨架并完成数据库 AutoMigrate

| 功能                  | 描述                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **配置管理**    | `config/config.yaml` 保存数据库连接信息。                                                    |
| **GORM 初始化** | `internal/repository/db.go` 读取配置、建立 MySQL 连接、执行 `AutoMigrate`。               |
| **入口程序**    | `cmd/server/main.go` 调用 `repository.InitDB()`，在启动时完成数据库初始化并输出成功日志。 |
| **模型定义**    | `internal/model/user.go`, `item.go`, `message.go` 已包含时间戳字段并使用 GORM 标签。   |

# 0.11 version

完成用户认证模块
开始编写接口文档

# 0.12 version

权限控制模块开发已顺利完成！添加了.gitignore

通过 `JWTAuth` 中间件，我们现在可以对 API 进行分组保护，并确保只有携带合法 Token 的请求才能访问敏感数据。

### 🛠️ 实现内容摘要

- **鉴权中间件**: `internal/middleware/auth.go` 实现了对 `Authorization: Bearer <Token>` 请求头的提取与校验，验证通ion过后会将 `userID` 注入上下文。
- **调试接口**: 实现了 `GET /api/v1/user/ping` 接口，用于确认当前 Token 是否能被系统识别并正确提取用户 ID。
- **路由重构**: 在 `main.go` 中建立了 **Public** (无需授权) 和 **Protected** (JWT 保护) 两个路由分组，结构清晰、易于扩展。

# 0.13

闲置物品 (Item) 核心业务模块已开发完成！增加增功能

### 🛠️ 完成内容概览

1. **数据访问层 (Repository)**:

   - `internal/repository/item_repository.go` 中实现了 `CreateItem`（创建物品）、`GetItems`（支持分页及状态过滤的查询）、`GetItemByID`（获取单个物品详情）。
2. **业务逻辑层 (Service)**:

   - `internal/service/item_service.go` 封装了 `PublishItem`（强制初始状态为 `OnSale`），以及配套的获取列表和详情功能。在发布时对图片切片进行了正确的 JSON 序列化存储。
3. **接口控制器 (API)**:

   - `internal/api/item_handler.go` 中从由鉴权中间件写入上下文中的 `userID` 严格解析 `PublisherID`，并实现了对应的 `PublishHandler`、`ListHandler`、`DetailHandler`。
4. **路由分组 (Routes)**:

   - 全面遵守了 `AGENTS.md` 的要求，将读取接口 (`GET /api/v1/items/:id` 和 `GET /api/v1/items`) 定义在 **公开组 (Public)**。
   - 发布的接口 (`POST /api/v1/items`) 通过受 JWT 保护的 **内部保护组 (Protected)** 注册。

# 0.14

完成闲置物品的增删改查功能，下个版本增加添加图片的功能

# 0.15

“Phase 1：图片上传模块”已开发完毕并验证编译通过！

代码严格遵循了你的开发要求：使用 `github.com/google/uuid` 生成随机文件名防止冲突，通过静态映射暴露了 `./uploads` 目录使得图片能直接被浏览器访问，且限定了图片扩展名和 5MB 大小限制，完全属于安全的本地文件管理系统。

# 0.15.5

采用同步删除实现了图片删除功能
**刚才的图片上传做得很棒！但我们要解决一个“脏数据”隐患。**

**请修改 `internal/service/item_service.go` 中的 `RemoveItem` (删除物品) 逻辑，具体要求如下：**

1. 在执行数据库删除操作**之前**，先通过 `id` 查询出该物品的完整信息（特别是 `Images` 字段）。
2. 引入 Go 的 `os` 包。遍历该物品的 `Images` 数组。
3. 路径转换：数据库里存的是相对路由路径（如 `/uploads/xxxx.jpg`），请将其转换为本地物理路径（如 `./uploads/xxxx.jpg`）。
4. 使用 `os.Remove()` 尝试删除本地物理文件。
5. **容错处理**：如果 `os.Remove()` 报错（比如文件不存在），请在终端打印一个日志警告（Log Warning），但**不要中断**后续的数据库删除逻辑。确保数据库最终能被正确清理。
   接下来实现Redis 预约系统

# 0.16

Phase 2“预约交易系统”已经完全开发并在服务端注册完毕，编译通过。Redis 驱动也已拉取并被集成进入项目。完全遵守了所有规范和“纯信息流转（无需支付/购物车词汇替换为预约/交接）”红线！

### 💡 Redis 锁保证并发安全的逻辑揭秘

在高并发抢购场景下（例如热门的毕业季甩卖），如果两名同学在同一毫秒点击“预约”该物品，仅靠 MySQL 事务很难完全避免两者的业务层判断穿透。我们的代码是这样运用 Redis 防控的：

1. **唯一标识（Lock Key）**：针对特定的商品设置全局唯一的锁标记 `lock:item:{itemID}`。也就是只锁这个要被抢的东西，并不锁整个应用。
2. **原子性占位 (SetNX)**：`redisx.Client.SetNX(ctx, lockKey, 1, 5*time.Second)`。这条命令的核心在 `NX` (Not eXists)。它告诉 Redis：“如果你发现这个 key 不存在，你就把它设置进去并返回 `true`。如果已经存在，那就什么都不做，直接返回 `false`”。整个判断和写入过程在单线程的 Redis 中是一个绝对不可分割的**原子操作**。
3. **并发过滤**：同一毫秒发请求进来的同学 A 和同学 B，必然只有一个人（假设是 A）拿到了 SetNX 返回的 `true`。B 会立刻收到 `false` 并被直接提前拦截（抛出：“该物品正忙，请稍后重试”或 HTTP 429）。这个时候 B 连 MySQL 的大门还没碰到就被弹回去了。
4. **安全释放 (Timeout & Defer Del)**：同学 A 获取锁后进入 MySQL 事务阶段，成功将物品改成 `Pending` 状态并新建了一条 `Appointment` 记录。由于配置了 `5s` 的硬过期时间，并加入了 `defer redisx.Client.Del` 操作，确保即刻或至多 5 秒后锁会强制消失——绝对不会发生服务断电导致的死锁问题。

因为这段防御，即使每秒有 1 万人并发点击了一件好物，MySQL 也只会收到拿到 Redis 入场券的那唯一 1 个请求，不会产生超卖现象。后续还有什么模块需要开发？

# 0.17

WebSocket 实时私聊系统已开发文字互聊功能

我们使用了 `gorilla/websocket` 实现了高性能的双工通信引擎，并确保了消息的持久化与历史追溯能力。

### 🛠️ 实现核心摘要

1. **数据模型优化**: 在 `internal/model/message.go` 中统一定义了 `FromID` 与 `ToID` 字段，并开启了索引优化，确保聊天记录查询及其高效。
2. **WS 管理器 (pkg/wsx)**: 实现了单例模式的 `WebsocketManager`，通过 Golang 的 `Channel` 机制异步处理用户的上线与下线行为，避免了传统锁机制带来的性能瓶颈。
3. **消息持久化层**: 遵循“先存后发”原则。每条收到的消息会先写入 MySQL 数据库，然后再尝试推送给在线的接收者。即使对方不在线，消息也会安全存储在库中。
4. **鉴权与连接**: 由于 WebSocket 协议升级的特殊性，我们通过 URL 参数 `?token=xxx` 进行 JWT 验证。
5. **历史查询接口**: 提供 `GET /api/v1/chat/history`，支持分页拉取与特定用户的对话列表。

# 0.18

个人中心模块已全面开发完成并集成完毕！

通过该模块，用户现在可以完整管理自己的“人、货、预约”资产，且所有操作均受到严格的权限校验与字段保护。

### 🛠️ 实现核心摘要

1. **模型关联 (Model)**：在 `Appointment` 结构体中添加了 `Item` 关联对象。这使得我们在一次数据库查询中，就能利用 GORM 的 `Preload` 机制顺带拉取到预约背后的物品详情（标题、价格、封面等），大幅提升了前端渲染效率。
2. **安全更新机制 (Repository)**：在 `UpdateUser` 仓库方法中，我们使用了 `Select("Nickname", "Avatar")`。这种白名单机制确保了该接口**绝对无法**意外或恶意修改用户的学号 (`student_id`) 或密码 (`password`)，确保了底层身份数据的安全性。
3. **连表汇总查询**：`GetMyAppointments` 接口通过 `Where("buyer_id = ? OR seller_id = ?", userID, userID)` 逻辑，将用户作为“买家”和“卖家”的两种身份记录进行合拢，并按时间倒序排列。

# 0.19

风控安检模块已正式“上线”，系统现在具备了对抗恶意灌水和内容合规性审计的能力，为您的毕业论文增加了实实在在的技术深度。

### 🛠️ 实现核心摘要

1. **原子级计数锁 (Redis)**：在 `pkg/redisx` 实现了 `IncrAndExpire`。该方法通过 Redis 的 `Pipeline` 确保了在高并发下，“计数递增”与“生命周期设定”是一个不可分割的原子操作，从根源上杜绝了 Key 永不过期的风险。
2. **场景化限流中间件**：
   - **`/api/v1/items` (发布接口)**：限流设为 1 分钟/5 次。这能有效拦截脚本自动发布大量的虚假或广告信息。
   - **`/api/v1/appointments` (预约接口)**：针对恶意锁单行为，设置了 24 小时/20 次的长周期监测。
3. **内容安全防火墙**：在 `item_service` 业务逻辑的最前端，植入了关键词扫描过滤矩阵，对“刷单、贷款、代写”等校园敏感词实时拦截，实现了“连接级”与“内容级”的双重风控。

# 0.20

至此，Go 后端部分的“最后一块拼图”——**生产级保障与优雅启停**已全部安装完毕。

### 🛠️ 实现核心摘要

1. **全域 CORS 跨域引擎**：在 `internal/middleware/cors.go` 实现了定制化的跨域处理逻辑。它不仅支持基础的 `Origin` 校验，还特别放行了 `Authorization` 等自定义 Header，并能自动“消灭”浏览器发出的 `OPTIONS` 预检请求，确保前端 Uni-app 在各种开发环境下都能畅通无阻。
2. **优雅启停架构 (Graceful Shutdown)**：重构了 `main.go`，将原本粗放的 `r.Run()` 升级为受控的 `http.Server`。系统现在会时刻监听操作系统的 `Ctrl+C` (SIGINT) 或 `SIGTERM` 信号。
3. **资源自动化回收**：在系统退出前的 5 秒缓冲期内，程序会显式调用 `CloseDB()` 和 `CloseRedis()`。这确保了所有的数据库连接池和缓存句柄都能被从容释放，避免了僵尸连接和数据丢失。

# 0.21

修复 CORS 跨域死锁 Bug：将 Allow-Origin 从通配符改为动态反射 Origin，符合 RFC 6454 规范。

# 0.22

WebSocket 引擎加固：sync.Map 重构客户端管理；readPump/writePump 添加 defer recover()；实现 60s 读超时 + 30s Ping 心跳 + 10s 写超时。

# 0.23

统一模型数据契约：user/item/appointment/message 全部添加 camelCase JSON 标签；Password 加 json:"-"；profile_handler 同步字段名。

# 0.24

物品分类系统：Item 模型新增 Category 字段，支持按分类筛选

### 🛠️ 实现内容摘要

- **Model 扩展**: `internal/model/item.go` 中 Item 新增 `Category` 字段（`varchar(64)`, `json:"category"`），AutoMigrate 自动建列。
- **写路径打通**: 发布/编辑接口（PublishRequest → PublishDTO → Item）全链路透传 category 值。
- **读路径筛选**: `GET /api/v1/items?category=book` 支持按分类过滤，与已有 status 过滤兼容组合使用。
- **种子数据**: 测试物品附带 `"category": "book"`，便于前端联调。

# 0.25

用户行为埋点系统：支持前端异步批量上报浏览/收藏/搜索行为，并增加后端自动埋点

### 🛠️ 实现内容摘要

- **新模型 UserBehavior**: 记录用户ID、物品ID（可空）、行为类型、搜索词。为 Python AI 推荐算法提供数据基础。
- **批量上报 API**: `POST /api/v1/behaviors` 接收 `behaviors` 数组，前端可积攒多条行为后一次性上报，减少请求频率。
- **后端自动埋点**: 在 `GetItemDetail` 中异步写入 `view` 行为记录，仅对已登录用户生效，防止前端漏报，提高 NCF 算法数据质量。
- **数据库设计**: `user_behaviors` 表，`userId`/`itemId`/`behaviorType` 均建索引，支持后续 OLAP 分析查询。

# 0.26

安全机制升级：Token黑名单登出 + 登录防暴力破解限流

### 🛠️ 实现内容摘要

- **Token 黑名单登出**: `POST /api/v1/auth/logout` 将当前 JWT 存入 Redis `blacklist:token:*`，TTL 精确设置为 Token 剩余有效期。JWT 中间件在校验时同步查询黑名单，已登出 Token 立即失效。
- **Redis 故障容错**: 若 Redis 黑名单写入失败，仅记录 Warn 日志，不阻塞用户登出流程，确保服务降级可用。
- **登录防爆破限流**: 同一学号 15 分钟内连续密码错误 5 次，触发 `lock:login:*` Redis 锁，锁定账号登录 15 分钟。正确登录取消锁定。
- **辅助方法**: `jwtx.ParseTokenWithExpiry` 解析 Token 同时返回剩余秒数；`redisx.SetWithExpire` / `redisx.Exists` 简化 Redis 操作。

todo

### 二、 运营后台与数据治理 (全栈待补)

4. **后台管理体系 (Admin Panel)**
   * **现状：** 整个系统目前只有“学生用户”视角，没有“平台管理员”视角。
   * **影响：** 缺乏管理员强制下架违规物品、封禁异地异常登录账号、审查敏感词落库记录的管控 API。
5. **可视化大屏统计接口 (Data Dashboard)**
   * **现状：** PRD 3.4 明确要求的核心亮点——“实时展示平台日活、毕业季信息发布热力图”完全没有支撑接口。
   * **影响：** 毕业答辩时，如果能大屏展示系统在突发潮汐流量下的各项指标（如 Redis 命中率、活跃预约量），将是极具震撼力的视觉展现，这部分 SQL 聚合查询和时序数据接口还需要写。

### 三、 Python AI 微服务体系 (架构独立扩展)

6. **CNN 图像智能分类与合规审查**
   * **现状：** 0 进度。
   * **目标：** 建立独立的 FastAPI 服务，拦截色情/涉爆图片，并辅助卖家在上传闲置图片时，一键自动填入物品分类。
7. **NCF 神经协同过滤算法**
   * **现状：** 0 进度。
   * **目标：** 离线读取埋点数据，训练并在 Redis 中生成 `recommends:user:{id}` 缓存。
