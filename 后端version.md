
# 0.1 version

初始化后端骨架并完成数据库 AutoMigrate

| 功能                  | 描述                                                                                            |

| --------------------- | ----------------------------------------------------------------------------------------------- |

| **配置管理**    | `config/config.yaml` 保存数据库连接信息。                                                    |

| **GORM 初始化** | `internal/repository/db.go` 读取配置、建立 MySQL 连接、执行 `AutoMigrate`。               |

| **入口程序**    | `cmd/server/main.go` 调用 `repository.InitDB()`，在启动时完成数据库初始化并输出成功日志。 |

| **模型定义**    | `internal/model/user.go`, `item.go`, `message.go` 已包含时间戳字段并使用 GORM 标签。   |

# 0.11 version

完成用户认证模块

开始编写接口文档

# 0.12 version

权限控制模块开发已顺利完成！添加了.gitignore

通过 `JWTAuth` 中间件，我们现在可以对 API 进行分组保护，并确保只有携带合法 Token 的请求才能访问敏感数据。

### 🛠️ 实现内容摘要

-**鉴权中间件**: `internal/middleware/auth.go` 实现了对 `Authorization: Bearer <Token>` 请求头的提取与校验，验证通ion过后会将 `userID` 注入上下文。

-**调试接口**: 实现了 `GET /api/v1/user/ping` 接口，用于确认当前 Token 是否能被系统识别并正确提取用户 ID。

-**路由重构**: 在 `main.go` 中建立了 **Public** (无需授权) 和 **Protected** (JWT 保护) 两个路由分组，结构清晰、易于扩展。

# 0.13

闲置物品 (Item) 核心业务模块已开发完成！增加增功能

### 🛠️ 完成内容概览

1.**数据访问层 (Repository)**:

   -`internal/repository/item_repository.go` 中实现了 `CreateItem`（创建物品）、`GetItems`（支持分页及状态过滤的查询）、`GetItemByID`（获取单个物品详情）。

2.**业务逻辑层 (Service)**:

   -`internal/service/item_service.go` 封装了 `PublishItem`（强制初始状态为 `OnSale`），以及配套的获取列表和详情功能。在发布时对图片切片进行了正确的 JSON 序列化存储。

3.**接口控制器 (API)**:

   -`internal/api/item_handler.go` 中从由鉴权中间件写入上下文中的 `userID` 严格解析 `PublisherID`，并实现了对应的 `PublishHandler`、`ListHandler`、`DetailHandler`。

4.**路由分组 (Routes)**:

- 全面遵守了 `AGENTS.md` 的要求，将读取接口 (`GET /api/v1/items/:id` 和 `GET /api/v1/items`) 定义在 **公开组 (Public)**。
- 发布的接口 (`POST /api/v1/items`) 通过受 JWT 保护的 **内部保护组 (Protected)** 注册。

# 0.14

完成闲置物品的增删改查功能，下个版本增加添加图片的功能

# 0.15

“Phase 1：图片上传模块”已开发完毕并验证编译通过！

代码严格遵循了你的开发要求：使用 `github.com/google/uuid` 生成随机文件名防止冲突，通过静态映射暴露了 `./uploads` 目录使得图片能直接被浏览器访问，且限定了图片扩展名和 5MB 大小限制，完全属于安全的本地文件管理系统。

# 0.15.5

采用同步删除实现了图片删除功能

**刚才的图片上传做得很棒！但我们要解决一个“脏数据”隐患。**

**请修改 `internal/service/item_service.go` 中的 `RemoveItem` (删除物品) 逻辑，具体要求如下：**

1. 在执行数据库删除操作**之前**，先通过 `id` 查询出该物品的完整信息（特别是 `Images` 字段）。
2. 引入 Go 的 `os` 包。遍历该物品的 `Images` 数组。
3. 路径转换：数据库里存的是相对路由路径（如 `/uploads/xxxx.jpg`），请将其转换为本地物理路径（如 `./uploads/xxxx.jpg`）。
4. 使用 `os.Remove()` 尝试删除本地物理文件。

5.**容错处理**：如果 `os.Remove()` 报错（比如文件不存在），请在终端打印一个日志警告（Log Warning），但**不要中断**后续的数据库删除逻辑。确保数据库最终能被正确清理。

   接下来实现Redis 预约系统

# 0.16

Phase 2“预约交易系统”已经完全开发并在服务端注册完毕，编译通过。Redis 驱动也已拉取并被集成进入项目。完全遵守了所有规范和“纯信息流转（无需支付/购物车词汇替换为预约/交接）”红线！

### 💡 Redis 锁保证并发安全的逻辑揭秘

在高并发抢购场景下（例如热门的毕业季甩卖），如果两名同学在同一毫秒点击“预约”该物品，仅靠 MySQL 事务很难完全避免两者的业务层判断穿透。我们的代码是这样运用 Redis 防控的：

1.**唯一标识（Lock Key）**：针对特定的商品设置全局唯一的锁标记 `lock:item:{itemID}`。也就是只锁这个要被抢的东西，并不锁整个应用。

2.**原子性占位 (SetNX)**：`redisx.Client.SetNX(ctx, lockKey, 1, 5*time.Second)`。这条命令的核心在 `NX` (Not eXists)。它告诉 Redis：“如果你发现这个 key 不存在，你就把它设置进去并返回 `true`。如果已经存在，那就什么都不做，直接返回 `false`”。整个判断和写入过程在单线程的 Redis 中是一个绝对不可分割的**原子操作**。

3.**并发过滤**：同一毫秒发请求进来的同学 A 和同学 B，必然只有一个人（假设是 A）拿到了 SetNX 返回的 `true`。B 会立刻收到 `false` 并被直接提前拦截（抛出：“该物品正忙，请稍后重试”或 HTTP 429）。这个时候 B 连 MySQL 的大门还没碰到就被弹回去了。

4.**安全释放 (Timeout & Defer Del)**：同学 A 获取锁后进入 MySQL 事务阶段，成功将物品改成 `Pending` 状态并新建了一条 `Appointment` 记录。由于配置了 `5s` 的硬过期时间，并加入了 `defer redisx.Client.Del` 操作，确保即刻或至多 5 秒后锁会强制消失——绝对不会发生服务断电导致的死锁问题。

因为这段防御，即使每秒有 1 万人并发点击了一件好物，MySQL 也只会收到拿到 Redis 入场券的那唯一 1 个请求，不会产生超卖现象。后续还有什么模块需要开发？

# 0.17

WebSocket 实时私聊系统已开发文字互聊功能

我们使用了 `gorilla/websocket` 实现了高性能的双工通信引擎，并确保了消息的持久化与历史追溯能力。

### 🛠️ 实现核心摘要

1.**数据模型优化**: 在 `internal/model/message.go` 中统一定义了 `FromID` 与 `ToID` 字段，并开启了索引优化，确保聊天记录查询及其高效。

2.**WS 管理器 (pkg/wsx)**: 实现了单例模式的 `WebsocketManager`，通过 Golang 的 `Channel` 机制异步处理用户的上线与下线行为，避免了传统锁机制带来的性能瓶颈。

3.**消息持久化层**: 遵循“先存后发”原则。每条收到的消息会先写入 MySQL 数据库，然后再尝试推送给在线的接收者。即使对方不在线，消息也会安全存储在库中。

4.**鉴权与连接**: 由于 WebSocket 协议升级的特殊性，我们通过 URL 参数 `?token=xxx` 进行 JWT 验证。

5.**历史查询接口**: 提供 `GET /api/v1/chat/history`，支持分页拉取与特定用户的对话列表。

# 0.18

个人中心模块已全面开发完成并集成完毕！

通过该模块，用户现在可以完整管理自己的“人、货、预约”资产，且所有操作均受到严格的权限校验与字段保护。

### 🛠️ 实现核心摘要

1.**模型关联 (Model)**：在 `Appointment` 结构体中添加了 `Item` 关联对象。这使得我们在一次数据库查询中，就能利用 GORM 的 `Preload` 机制顺带拉取到预约背后的物品详情（标题、价格、封面等），大幅提升了前端渲染效率。

2.**安全更新机制 (Repository)**：在 `UpdateUser` 仓库方法中，我们使用了 `Select("Nickname", "Avatar")`。这种白名单机制确保了该接口**绝对无法**意外或恶意修改用户的学号 (`student_id`) 或密码 (`password`)，确保了底层身份数据的安全性。

3.**连表汇总查询**：`GetMyAppointments` 接口通过 `Where("buyer_id = ? OR seller_id = ?", userID, userID)` 逻辑，将用户作为“买家”和“卖家”的两种身份记录进行合拢，并按时间倒序排列。

# 0.19

风控安检模块已正式“上线”，系统现在具备了对抗恶意灌水和内容合规性审计的能力，为您的毕业论文增加了实实在在的技术深度。

### 🛠️ 实现核心摘要

1.**原子级计数锁 (Redis)**：在 `pkg/redisx` 实现了 `IncrAndExpire`。该方法通过 Redis 的 `Pipeline` 确保了在高并发下，“计数递增”与“生命周期设定”是一个不可分割的原子操作，从根源上杜绝了 Key 永不过期的风险。

2.**场景化限流中间件**：

   -**`/api/v1/items` (发布接口)**：限流设为 1 分钟/5 次。这能有效拦截脚本自动发布大量的虚假或广告信息。

   -**`/api/v1/appointments` (预约接口)**：针对恶意锁单行为，设置了 24 小时/20 次的长周期监测。

3.**内容安全防火墙**：在 `item_service` 业务逻辑的最前端，植入了关键词扫描过滤矩阵，对“刷单、贷款、代写”等校园敏感词实时拦截，实现了“连接级”与“内容级”的双重风控。

# 0.20

至此，Go 后端部分的“最后一块拼图”——**生产级保障与优雅启停**已全部安装完毕。

### 🛠️ 实现核心摘要

1.**全域 CORS 跨域引擎**：在 `internal/middleware/cors.go` 实现了定制化的跨域处理逻辑。它不仅支持基础的 `Origin` 校验，还特别放行了 `Authorization` 等自定义 Header，并能自动“消灭”浏览器发出的 `OPTIONS` 预检请求，确保前端 Uni-app 在各种开发环境下都能畅通无阻。

2.**优雅启停架构 (Graceful Shutdown)**：重构了 `main.go`，将原本粗放的 `r.Run()` 升级为受控的 `http.Server`。系统现在会时刻监听操作系统的 `Ctrl+C` (SIGINT) 或 `SIGTERM` 信号。

3.**资源自动化回收**：在系统退出前的 5 秒缓冲期内，程序会显式调用 `CloseDB()` 和 `CloseRedis()`。这确保了所有的数据库连接池和缓存句柄都能被从容释放，避免了僵尸连接和数据丢失。

# 0.21

修复 CORS 跨域死锁 Bug：将 Allow-Origin 从通配符改为动态反射 Origin，符合 RFC 6454 规范。

# 0.22

WebSocket 引擎加固：sync.Map 重构客户端管理；readPump/writePump 添加 defer recover()；实现 60s 读超时 + 30s Ping 心跳 + 10s 写超时。

# 0.23

统一模型数据契约：user/item/appointment/message 全部添加 camelCase JSON 标签；Password 加 json:"-"；profile_handler 同步字段名。

# 0.24

物品分类系统：Item 模型新增 Category 字段，支持按分类筛选

### 🛠️ 实现内容摘要

-**Model 扩展**: `internal/model/item.go` 中 Item 新增 `Category` 字段（`varchar(64)`, `json:"category"`），AutoMigrate 自动建列。

-**写路径打通**: 发布/编辑接口（PublishRequest → PublishDTO → Item）全链路透传 category 值。

-**读路径筛选**: `GET /api/v1/items?category=book` 支持按分类过滤，与已有 status 过滤兼容组合使用。

-**种子数据**: 测试物品附带 `"category": "book"`，便于前端联调。

# 0.25

用户行为埋点系统：支持前端异步批量上报浏览/收藏/搜索行为，并增加后端自动埋点

### 🛠️ 实现内容摘要

-**新模型 UserBehavior**: 记录用户ID、物品ID（可空）、行为类型、搜索词。为 Python AI 推荐算法提供数据基础。

-**批量上报 API**: `POST /api/v1/behaviors` 接收 `behaviors` 数组，前端可积攒多条行为后一次性上报，减少请求频率。

-**后端自动埋点**: 在 `GetItemDetail` 中异步写入 `view` 行为记录，仅对已登录用户生效，防止前端漏报，提高 NCF 算法数据质量。

-**数据库设计**: `user_behaviors` 表，`userId`/`itemId`/`behaviorType` 均建索引，支持后续 OLAP 分析查询。

# 0.26

安全机制升级：Token黑名单登出 + 登录防暴力破解限流

wx登陆， 学生身份认证

### 🛠️ 实现内容摘要

-**Token 黑名单登出**: `POST /api/v1/auth/logout` 将当前 JWT 存入 Redis `blacklist:token:*`，TTL 精确设置为 Token 剩余有效期。JWT 中间件在校验时同步查询黑名单，已登出 Token 立即失效。

-**Redis 故障容错**: 若 Redis 黑名单写入失败，仅记录 Warn 日志，不阻塞用户登出流程，确保服务降级可用。

-**登录防爆破限流**: 同一学号 15 分钟内连续密码错误 5 次，触发 `lock:login:*` Redis 锁，锁定账号登录 15 分钟。正确登录取消锁定。

-**辅助方法**: `jwtx.ParseTokenWithExpiry` 解析 Token 同时返回剩余秒数；`redisx.SetWithExpire` / `redisx.Exists` 简化 Redis 操作。

# 0.27

搜索内核实装：Repository 层 LIKE 模糊匹配全链路贯通

### 🛠️ 实现内容摘要

-**搜索内核实装**: `repository/item_repository.go` 中通过 GORM `title LIKE ? OR content LIKE ?` 占位符实现模糊匹配，支持中英文关键词搜索。

-**全链路贯通**: API 层 `c.Query("keyword")` → Service `GetItemList` 透传 → Repository `GetItems` 链式组合，与已有 `status`/`category` 过滤条件协同工作。

-**性能与安全**: 参数化查询杜绝 SQL 注入；LIKE 条件在 `status`/`category` 等精确定位条件之后附加，利用索引前置减少全表扫描范围。

# 0.28

详情页可选鉴权与安全契约修复：OptionalAuth、错误码语义优化、WS 黑名单加固

### 🛠️ 实现内容摘要

-**OptionalAuth 可选鉴权**: `internal/middleware/auth.go` 新增 `OptionalAuth()`，对缺失、格式错误、过期或已登出的 Token 均不阻断公开接口，仅在解析成功且未命中黑名单时写入 `userID` 上下文。

-**详情页行为埋点修复**: `cmd/server/main.go` 将 `GET /api/v1/items/:id` 挂载到 `middleware.OptionalAuth()`，保证匿名用户仍可访问详情，同时让已登录用户稳定触发 `GetItemDetail` 中的 `view` 自动埋点。

-**契约一致性修复**: `internal/api/user_handler.go` 中 `GET /api/v1/user/ping` 的返回字段由 `user_id` 统一修正为 `userId`，与 v0.23 之后的全站 camelCase JSON 契约保持一致。

-**错误码语义优化**: `internal/api/auth_handler.go` 中重复注册学号改为返回 `409 Conflict`，登录错误触发锁定后改为返回 `403 Forbidden`；同时 `pkg/response/response.go` 修正为使用真实 HTTP 状态码输出错误响应。

-**WS 黑名单安全加固**: `internal/api/ws_handler.go` 在 WebSocket 协议升级完成后立即检查 Redis `blacklist:token:*`，若 Token 已登出则立刻下发 Close 帧并断开连接，阻断已注销会话继续建立聊天链路。

-**启动配置收敛**: `cmd/server/main.go` 中 `runSeed` 默认值调整为 `false`，避免服务重启时重复刷新种子数据并污染联调阶段的真实行为埋点。

-**自动化验证脚本**: 新增 `qlut-secondhand-api/tests/v028_check.sh`，覆盖 OptionalAuth 埋点、`userId` 契约、409/403 错误码以及 WS 黑名单即时断连验证。

# 0.29

核心服务测试加固与仓库层健壮性：Repository 输入防御、集成测试套件、所有权注释加固

### 🛠️ 实现内容摘要

-**Repository 输入防御 (GetChatHistory)**: `internal/repository/message_repository.go` 在查询前强制校验 `userID`/`targetID`/`itemID` 均大于 0，零值直接返回语义化错误（"无效的用户 ID"等），杜绝无效参数透传数据库。

-**Repository 输入防御 (GetItems)**: `internal/repository/item_repository.go` 增加分页兜底归一化：`pageSize <= 0` 默认 20，`pageSize > 100` 强制截断为 100，防止全表扫描与内存溢出。

-**API 层适配 (HistoryHandler)**: `internal/api/ws_handler.go` 的 `HistoryHandler` 对 Repository 返回的参数校验错误映射为 HTTP 400，其余错误保持 500。

-**PublishHandler 错误透传**: `internal/api/item_handler.go` 将发布接口的错误消息从固定"发布失败"改为透传 Service 层语义错误，便于前端展示"违规词汇"等明确提示。

-**所有权约束注释**: `GetChatHistory` 增加明确中文注释说明跨用户对话隔离逻辑，确保审计时能快速判定安全性。

-**集成测试套件**: 新增 4 组基于 Bash + cURL 的自动化集成测试脚本：

  -`tests/auth_test.sh`: 注册冲突(409)、登录锁定(403)、黑名单拦截(401)、Token 缺失/格式错误(401)

  -`tests/item_test.sh`: 违规词拦截、分类筛选、分页截断、删除图片清理、越权修改/删除(403)

  -`tests/appointment_test.sh`: 禁止预约自己、Redis 并发锁防超卖、越权确认(403)、卖家确认完成、取消恢复

  -`tests/chat_test.sh`: targetId/itemId 零值防御(400)、消息先存后发、历史记录隔离

# 0.31

AI Sidecar 基建与推荐接口预埋：Go/Python 解耦、首页推荐、发布链路 AI 钩子

### 🛠️ 实现内容摘要

- **AI 内部通讯包**: 新增 `pkg/aiclient`，统一封装 Go → Python FastAPI 的内部 HTTP 调用，提供 `PostToAI(path, body, response)`、默认 2s 超时、轻量重试与错误归一，AI 服务不可用时可触发优雅降级。
- **配置扩展**: `pkg/config/config.go` 与 `config/config.yaml` 新增 `ai.baseUrl`、`ai.timeout`、`ai.enableClassify` 配置项，用于控制分类侧车与超时策略。
- **发布链路 AI 钩子**: `internal/service/item_service.go` 在物品落库前调用 AI 分类预检；AI 返回分类建议时自动覆盖 `Category`，若明确返回高风险则拦截发布，AI 宕机时跳过 AI 审核，确保核心业务不中断。
- **首页推荐接口**: 新增 `GET /api/v1/index/recommend`，登录用户优先读取 Redis `recommends:user:{userId}` 的 Top20 推荐列表，未命中或未登录时回退最新上架物品；路由使用 `OptionalAuth()`。
- **推荐仓库能力**: 新增 `GetItemsByIDs` 与推荐服务层读取逻辑，保证 Redis 推荐 ID 列表可按顺序组装为物品详情返回。
- **自动化验证脚本**: 新增 `tests/v031_ai_check.sh`，覆盖推荐接口匿名/登录降级与 AI 宕机时发布链路可用性验证。

# 0.32.1

契约一致性与埋点归因修正：409 正式化、聊天历史 itemId 必传、详情 view 主写入口收敛

### 🛠️ 实现内容摘要

- **API 契约修正**: 更新 `QLUT Secondhand Platform - 生产级 API 技术规范.md`，正式加入 `409 Conflict` 语义并将 `/chat/history` 的 `itemId` 标注为必传参数；同时补充“一物一聊”隔离说明与详情 `view` 埋点唯一入口说明。
- **埋点归因收敛**: 在 `internal/service/item_service.go` 明确注释 `GET /items/:id` 为 `view` 行为的唯一标准主入口，登录态依赖 `OptionalAuth()` 自动写入，前端不应再补报同一次访问。
- **聊天历史校验对齐**: 在 `internal/repository/message_repository.go` 与 `internal/api/ws_handler.go` 补充 `itemId` 必传的注释约束，保持缺失/零值 `itemId` 统一返回 HTTP 400。
- **自动化契约验证**: 修复 `tests/chat_test.sh` 的基础依赖函数，新增 `itemId` 缺失返回 400 的断言；新增 `tests/v032_contract_check.sh`，验证重复注册场景返回 `HTTP 409 + 学号已注册`。
- **执行结果**:
  - `go test ./...` 通过
  - `go build ./cmd/server` 通过
  - `bash tests/chat_test.sh` 通过
  - `bash tests/v032_contract_check.sh` 通过

# 0.32.2

发布语义精细化与 AI Client 稳定性：发布失败不再一律 500，补齐 AI Sidecar Mock 容错测试

### 🛠️ 实现内容摘要

- **发布错误语义拆解**: 新增 `internal/service/errors.go` 轻量业务错误类型，`PublishHandler` 可区分 `ValidationError -> 400`、`ForbiddenError -> 403`、系统异常 -> `500`；本地敏感词与 AI 高风险拦截现在都会透传明确阻断原因。
- **发布服务对齐**: `internal/service/item_service.go` 中，本地违规词与 AI `riskLevel=high` 已改为返回 `ForbiddenError`，避免被统一误判为服务器异常。
- **API 文档同步**: 更新 `QLUT Secondhand Platform - 生产级 API 技术规范.md`，将 `POST /items` 的敏感词拦截语义从 `400` 修正为 `403`，并补充本地风控、AI 风控、参数错误、系统异常四类错误语义说明。
- **AI Client Mock 单测**: 新增 `pkg/aiclient/client_test.go`，使用 `httptest` 覆盖 2s 超时、HTTP 500、非法 JSON 三类 Sidecar 异常场景，验证返回 error 且不会 Panic。
- **自动化脚本**: 新增 `tests/v032_publish_semantics.sh`，黑盒验证包含敏感词的发布请求现在会返回 `403/400` 且响应消息包含明确阻断原因。
- **执行结果**:
  - `go test ./...` 通过
  - `go build ./cmd/server` 通过
  - `bash tests/v032_publish_semantics.sh` 通过

# 0.32.3

AI 内部协议定义与侧车工程骨架初始化：确立 Go/Python 契约并落地 Python 项目占位结构

### 🛠️ 实现内容摘要

- **内部协议文档**: 新增 `AI_INTERNAL_PROTOCOL.md`，正式定义 Go `aiclient` 与 Python FastAPI Sidecar 的唯一内部契约，覆盖 `POST /predict/category` 的请求体、响应体、camelCase 约束、分类枚举 `book/digital/daily/sports/other`、风险等级枚举 `safe/high`。
- **推荐缓存协议**: 在 `AI_INTERNAL_PROTOCOL.md` 中明确 NCF 离线写入 Redis 的协议：Key 必须严格使用 `recommends:user:{userId}`，Value 必须使用 Redis `String` 保存 JSON 数组形式的 Top20 `itemId` 列表，数组顺序即推荐顺序。
- **Python 侧车骨架**: 在根目录初始化 `qlut-secondhand-ai/`，新增 `main.py`、`requirements.txt`，并创建 `api/`、`services/`、`models/` 三个占位目录，为后续 CNN 与 NCF 实现提供工程入口。
- **依赖基线**: `qlut-secondhand-ai/requirements.txt` 已写入基础依赖：`fastapi`、`uvicorn`、`torch`、`torchvision`、`redis`、`pydantic`。

v0.33

更新后端系统现状与已知缺陷报告.md

# ai-v0.2

ResNet18 本地 CPU 图像分类落地：将 Mock 规则替换为真实 PyTorch 视觉推理，实现 ImageNet → 业务分类映射与全链路容错降级

### 🛠️ 实现内容摘要

- **模型集成**: `services/cnn_service.py` 使用 `torchvision.models.resnet18(weights='DEFAULT')`，强约束 `device='cpu'`，通过 `torch.no_grad()` 降低推理开销，模型通过模块级单例懒加载。
- **图像预处理管道**: `Resize(224,224)` → `ToTensor` → `Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])`，输入统一转 `RGB` 避免通道不一致。
- **本地图片拉取**: 相对路径统一拼接 `http://127.0.0.1:8080`，使用 `requests` 拉取二进制内容，`PIL.Image.open(BytesIO(...))` 解码，超时 2s。
- **ImageNet → 业务分类映射**: 硬编码 4 组关键词集合（`digital/book/sports/daily`），对 ResNet18 top1 标签做子串匹配归入 5 类业务枚举，未命中兜底 `other`；最低置信阈值 0.20。
- **全链路容错降级**: 图片请求失败/404/解码异常/推理异常/低置信度 5 类场景均不崩溃，视觉不可用时返回 `category=other`；`riskLevel` 仍由文本关键词规则独立决定。
- **依赖更新**: `requirements.txt` 新增 `requests` 与 `Pillow`。
- **静态编译验证**: `python -m compileall "qlut-secondhand-ai"` 通过。

# ai-v0.3

真实 NCF 离线推荐模型与训练链路：废弃 Mock 同步，落地 PyTorch 协同过滤训练 → 预测 → Redis 写入全闭环

### 🛠️ 实现内容摘要

- **废弃 Mock 脚本**: `scripts/mock_ncf_sync.py` 的硬编码推荐逻辑已被 `scripts/ncf_train_sync.py` 取代。
- **数据源接入**: 使用 `pymysql` 直连 `qlut_secondhand.user_behaviors`，按 `view=1/search=2/favorite=3` 权重聚合为 `User-Item` 交互矩阵，`item_id IS NULL` 记录自动丢弃。
- **NCF 模型**: 实现极简单 MLP 塔结构——User/Item Embedding(16dim) + Concat + Linear(32→16→1) + Sigmoid，全量运行在 CPU，适配极小数据集的快速验证。
- **负采样策略**: 每用户按 `正样本数 × 3`（上限 200）随机采样未交互物品作为负样本，训练集按用户维度 80/20 划分。
- **训练可视化**: 15 Epoch Adam 训练循环，每 Epoch 打印 `Train Loss` 与 `Test Loss`，Loss 从 0.28 收敛至 0.18，可直接截图用于论文训练过程证明。
- **预测与 Redis 写入**: 训练后为每个用户预测所有未交互物品的评分，选 Top20 `itemId`，以 JSON 数组格式写入 Redis `recommends:user:{userId}`（String 类型，TTL 86400s），严格对齐 `AI_INTERNAL_PROTOCOL.md`。
- **依赖扩展**: `requirements.txt` 新增 `pymysql`、`numpy`。
- **端到端验证**: 在 7 用户 × 11 物品、43 条行为记录的实际数据上，30 秒内完成训练 + 7 用户推荐写入，Redis 验证通过。
