# 0.1

目前前端项目已经完成了基础架构搭建和核心模块的初步实现，整体采用 **Uni-app + Vue 3 (Setup 语法糖) + TypeScript** 体系，并严格遵守了 `AGENTS.md` 中的开发规范。

以下是详细的开发进度说明：

### 1. 基础架构与网络封装 (`utils/request.ts`)

网络请求模块已通过 `uni.request` 完成深度封装：

- **JWT 自动注入**：请求拦截器会自动从本地缓存读取 `token` 并推入 `Authorization` 请求头。
- **响应标准化处理**：统一处理后端返回的 `code: 200` 逻辑。
- **状态联动**：监测到 `401` 错误（认证失效）时，会自动清理缓存并重定向至登录页。
- **全局提示**：内置了网络错误和业务错误的全局 `Toast` 提示，无需在每个组件里写 `uni.showToast`。

### 2. API 模块实现 (`api/`)

已建立模块化的接口调用层，目录结构清晰：

- **`item.ts`**：
  - `getItems`：支持分页、状态（待售/交接中等）过滤的物品查询。
  - `uploadImage`：基于 `uni.uploadFile` 封装的 Promise 化图片上传接口。
- **`user.ts`**：
  - `login`：用户认证登录接口。

### 3. 核心页面开发 (`pages/`)

目前主要集中在首页的交付：

- **`index/index.vue` (首页)**：
  - **瀑布流布局**：采用响应式网格展示闲置物品。
  - **动态交互**：完整实现了“下拉刷新”和“触底加载更多”的分页逻辑。
  - **双轨数据支持**：代码中预留了 **Mock 数据回退机制**。如果后端接口暂时不可用，会自动展示模拟数据，确保前端 UI 开发和演示不受阻塞。
  - **业务合规**：物品状态严格显示为“预约交接中”，避免使用“购买/订单”等敏感词汇。

### 4. 规范遵守情况 (Checklist)

-  **Vue3 Setup**：全部组件均使用组合式 API。
-  **无教务密码存库**：前端仅负责传输，不涉及敏感密码持久化。
-  **状态流转**：状态机符合 `OnSale` -> `Pending` -> `Completed` 设计。
-  **词汇规避**：代码和 UI 中已完全替换购买/支付相关词汇。

### 5. 当前缺失/后续计划

- **详细页 (`pages/item/detail`)**：虽然首页已有跳转逻辑，但详情页尚未完全成型。
- **登录注册页**：接口已定义，但 UI 页面需进一步完善。
- **WebSocket 私聊**：即时通讯模块尚未开始编码，这是后续的核心难点。

# 0.2

我已按照计划完成了“物品详情页”的开发及“预约联调”逻辑的编写。

### 开发内容摘要：

1. **API 层扩展**：在 `api/item.ts` 中新增了 `getItemDetail`（获取详情）和 `createAppointment`（发起预约）接口。
2. **路由注册**：在 `pages.json` 中正式注册了 `pages/item/detail` 页面。
3. **详情页实现**：
   - **轮播图**：支持多图展示，并内置了 `BASE_URL` 自动拼接逻辑（自动根据 API 地址推导服务器根路径）。
   - **核心信息**：大字号价格显示、标题、发布时间及动态状态标签。
   - **预约逻辑**：
     - 集成二次确认弹窗。
     - **准确捕获 429 错误**：针对高并发场景，若后端返回 429 或锁定提示，前端会明确弹出“已被他人锁定”的提醒。
     - 支持加载状态（Loading）切换。
   - **UI 交互**：底部操作栏固定，根据物品状态（OnSale/Pending/Completed）自动切换按钮样式及可用性。

# 0.3

完成登陆模块

### 注册登录模块 更新日志 (Update Log)

#### 1. 核心架构与环境配置

- **前端环境搭建**：初始化了基于 UniApp + Vue 3 (Setup 语法) + TypeScript 的开发环境，配置了 `tsconfig.json` 和 `env.d.ts` 以支持完整的类型推断和 IDE 高亮。
- **页面路由规范**：统一了认证类页面的路由结构，正式启用 `/pages/auth/login` 作为全局登录入口，并在 `pages.json` 中完成了注册。

#### 2. 底层网络通信封装 (`utils/request.ts`)

- **统一拦截器实现**：
  - **请求拦截**：自动从本地存储 (`Storage`) 提取 JWT Token，并以 `Authorization: Bearer <Token>` 格式注入所有私有接口。
  - **响应拦截**：建立了全局错误处理机制。当遇到 **401 (Unauthorized)** 状态码时，系统会自动清理过期 Token 并强制重定向至登录页，确保用户会话安全。
- **规范化配置**：强制设定 `Content-Type: application/json` 请求头，完美对接后端 Gin 框架的原始 JSON 绑定模型。

#### 3. 认证业务逻辑实现 (`api/user.ts`)

- **参数严格对齐**：根据《生产级 API 技术规范》，将登录与注册接口的参数 Key 统一修正为 `student_id` (学号) 和 `password` (原始密码)。
- **日志调试强化**：在 API 调用层植入了参数监控日志，开发者可在控制台实时观察 Auth Params 负载，极大提升了前后端联调效率。

#### 4. 界面设计与交互 (`pages/auth/login.vue`)

- **极简审美 UI**：采用现代化的卡片式布局与 CSS 渐变背景，实现了登录/注册的双表单平滑切换。
- **健壮的表单验证**：基于 Vue 3 `reactive` 状态管理，实现了实时的前端输入校验，防止提交空的学号或密码。
- **多端适配优化**：
  - 支持“密码可见性”动态切换。
  - 集成了回到首页的快捷入口。
  - 预留了微信一键授权进入的扩展逻辑。

#### 5. 已解决的关键 Bug (Bug Fixes)

- **路径冲突修复**：解决了旧版代码中 `/pages/login/login` 路径不存在导致的 `reLaunch:fail` 错误。
- **参数命名修正**：纠正了早期尝试中混用的 `password_hash` 和 `username` 等非标准字段，解决了 API 返回 400 (Parameter Error) 的痛点。

# 0.4

###  核心升级日志：【发布模块贯通】与【全站导航重构】

**版本目标**：正式上线基于“轻量化撮合”原则的闲置物品发布流，并全面重写底层导航能力，打通应用核心数据渲染层。

#### ✨ 一、核心功能 (Features)

- **发布闲置专区上线 (`pages/item/post.vue`)**：
  - **极简审美表单**：实现了无边框化沉浸式输入设计（包括大字号标题、自动拉伸的描述区，以及统一定制的售价录入）。
  - **图片全链路上传**：深度封装 `uni.chooseImage` 到后端的并发请求通道 `api/item.ts`，选图即上传，响应线上 URL 并自动在九宫格回显。
- **全局自定义底部导航栏 (`custom-tabbar.vue`)**：
  - 屏蔽了略显僵硬的微信原生底栏 (`uni.hideTabBar`)，实现了完全由项目自管的扁平化组件。
  - 正式确立 **“首页 | 发布 | 消息 | 我的”** 四宫格一级入口。

#### 🛡️ 二、安全策略与防守机制 (Safety & Validations)

- **拦截“无价值脏数据”**：在发布最终动作中植入严格的拦截逻辑 (`images.length > 0`)，用户若不上传图片将绝对无法提交，保证了平台的内容质量下限。
- **封闭回退死锁**：针对发布页成为 Tab 级页面后没有返回箭头的问题，在页头注入了“取消”按钮，通过 `uni.switchTab` 路由降级让用户平滑返航。

#### 🔧 三、底层通讯与数据容灾 (Bug Fixes & Refactoring)

- **多源字段降级适配 (Data Fail-safe)**：彻底解决了 Go 后端 JSON 序列化时首字母大写经常变化导致的前端白屏。全站替换为包含 `item.title || item.Title` 的动态探测机制。
- **图片格式解包中心 (`getCoverImage`)**：强化了首页瀑布流的图床分发器：
  - 安全解析因存入数据库前遭到字符串化 (`Stringified Array`) 的非标 JSON 内容。
  - 自动判断是否自带 HTTP 报头，并完美拼接 `BASE_URL`。
  - 即使面对极限脏数据，也能丝滑提供本地 `default.png` 进行兜底撑场。
- **恢复卡片锚点**：修正了因循环模板解构丢掉的详情页 ID 透传，复原首页进入商品详情的通道 `@click="goToDetail(id)"`。

---

TIP

经过本次更新，平台的 **“游览 (首页瀑布流) -> 发布 (物品上架) -> 详情 (即将开发连通)”** 这条主干线已经完全成型了。后续只需将“消息”与“我的”等衍生模块填入占位页即可！

# 0.45

我为您选择了 关闭原生刷新，保留 scroll-view 刷新，并已经完成了修复。

### 为什么选择方案 B？

因为当前平台首页使用了 `display: flex` + `height: 100vh` 的固定布局框架：顶部的搜索栏和底部的我们自定义引入的 TabBar 都是相对固定的，而中间的内容区通过 `<scroll-view flex: 1>` 实现了独立滚动。 如果我们采用方案 A，就会导致整个页面（包含顶部的搜索条）都被一起拽下来，而且在 iOS 端容易出现橡皮筋回弹导致整个网页脱底的问题，破坏目前的极简原生感体验。

### 执行的修复动作：

1. **去除了冗余配置**：我在 `pages.json` 文件中，删除了 `pages/index/index` 的 `"enablePullDownRefresh": true` 原生配置。
2. **逻辑核对**：检查了 `pages/index/index.vue` 中的逻辑。现在的 `<scroll-view>` 会完美接管触顶下拉操作。在 `fetchItems` 函数执行完毕后的 `finally` 块中，我已经写好了 `isRefresherTriggered.value = false;`，这意味着获取数据后刷新状态条会自动安全回弹收起。

现在，您在真机或开发者工具中下拉刷新时，就只会看到一个标准的局部下拉 Loading 动画了，不再会有难看的重影！

# 0.5

### 更新日志：【交互重构与编译器加固】

**版本目标**：解决顶部导航栏布局冲突，通过悬浮按钮（FAB）重塑发布逻辑，并加固底层模板结构。

#### ✨ 一、UI/UX 重构 (UI/UX Refactoring)

- **发布页导航栏净化**：
  - **移除顶部冲突**：彻底删除了顶部自定义导航栏中的“发布”按钮，避开了微信小程序原生胶囊按钮的遮挡区域。
  - **标题绝对居中**：引入了左右对称的 `nav-placeholder` 机制，确保“发布闲置”标题在任何屏幕下都处于视觉绝对中心。
- **悬浮发布按钮 (FAB) 上线**：
  - **胶囊化设计**：在右下角新增了高辨识度的绿色胶囊悬浮按钮，采用 `fixed` 定位。
  - **安全区适配**：利用 `env(safe-area-inset-bottom)` 自动适配全面屏底部黑线，确保按钮不遮挡、不越界。
  - **交互动效**：增加了点击时的按压缩放反馈 (`scale(0.96)`) 和发布过程中的文字动态感应。

#### 🔧 二、编译器与底层加固 (Build & Architecture)

- **修复“编译卡死”致命 Bug**：
  - **模板根节点修复**：补回了 `post.vue` 因重构丢失的 `.post-container` 根包裹元素，解决了 Vue3 模板多根节点导致的 AST 解析死循环。
  - **编码转换与清理**：修复了 SCSS 注释因编码错误变成 Unicode 转义符（`\u63d0\u9ad8...`）导致的编译阻塞。
- **组件自动注册优化**：
  - 在 `pages.json` 中配置了 `easycom` 规则。现在 `uni-ui` 组件（如 `uni-icons`）无需手动 import 即可在全球范围内自动识别，大幅降低了白屏风险。

#### 🐛 三、体验微调 (Polish)

- **视图防遮挡**：将发布页底部的 `safe-bottom` 留白高度从 `100rpx` 提升至 `200rpx`，确保列表最后一项内容不会被悬浮按钮挡住。
- **跳转逻辑自愈**：修复了首页商品卡片在重构后丢失的 `id` 点击透传，现在点击任何卡片均可准确前往 `detail` 页面。

---

IMPORTANT

**开发者提示**：若后续遇到由于修改 `pages.json` 导致的白屏，请优先检查控制台是否提示 `Component not found`。本次 `easycom` 的引入已基本杜绝此类路径引用错误。

0.6
完成用户中心
实现了 我发布的 和预约交接数量和详细的功能

0.7
等 Agent 汇报修改完成后，你可以这样验收它的重构成果： 1. **看文件目录**：确认项目中是不是多了一个 `config/index.ts`（或者类似的配置文件）。 2. **看业务是否受损**： * 在微信开发者工具里刷新（`Ctrl + R`）。 * **测试图片**：随便点开首页、个人中心，看看列表和默认头像是否还能正常显示。 * **测试接口**：点一下“退出登录”或者刷新列表，看看网络请求有没有报错。 如果你把 `config/index.ts` 里的 `127.0.0.1` 随便改成 `192.168.1.100`，保存后发现整个小程序的图片和请求瞬间全部指向了新 IP——恭喜你，你的前端工程化改造圆满成功！ 这步做完后，咱们就可以真正向“大魔王”级别的功能——**WebSocket 聊天室**进发了。准备好随时滴滴我！

0.8.1
WebSocket 底层通信引擎基建完成：

- 创建 `utils/websocket.ts`：单例模式、Token 鉴权直连 (`?token=JWT`)、指数退避重连 (1s→2s→4s→8s→16s→32s)、Pub/Sub 事件发布系统 (`on/off/emit`)、待发送消息队列
- `config/index.ts` 新增 `WS_URL` 常量，从 `API_BASE_URL` 自动推导
- `App.vue` 在 `onLaunch` 中启动 WS 连接
- 修复微信底层兼容性 Bug：移除 1006 状态码（仅允许 1000/3000-4999）、删除前端心跳看门狗（底层 Ping/Pong 由微信运行时自动处理，避免无限重连死循环）

0.8.2

**目标**：状态共享层 + `pages/message/message.vue` 重构为最近联系人列表。

0.8.3
WebSocket 聊天室核心 UI 与实时收发完成：

- **入口打通**：商品详情页 `detail.vue` 底部操作栏实装「私聊卖家」绿底按钮，通过 `conversationStore.getMyUserId()` 集成身份校验，发布者本人查看时自动隐藏
- **聊天室实装**：新建 `pages/chat/room.vue`（305 行），实现双向气泡布局（对方白底左对齐 + 自己微信绿 `#95ec69` 右对齐）、`scroll-view` 自动滚底、键盘高度动态适配（`adjust-position=false` + `@focus/@blur`）
- **实时收发**：乐观更新（点击发送立即本地渲染），`handleSocketMsg` 具名函数精准过滤 `(fromId, toId)` 防串号，严格 camelCase 格式 `{ toId, content }`
- **生命周期安全**：`onLoad` 注册 `ws.on('message', handleSocketMsg)`；`onUnload` 执行 `ws.off('message', handleSocketMsg)` + `markRead` 清零未读，杜绝内存泄漏与重复监听
- **UI 规范**：`pages.json` 中 `message` 页面启用 `navigationStyle: custom`，消除原生与自定义双标题叠加
- **紧急修复**：解决 `detail.vue` WXSS 编译错误 — 移除 Flex `gap` 属性（替换为相邻兄弟 `margin-left` 选择器）、将 `.chat-btn-text` 从 SCSS 嵌套中提取为扁平独立规则

0.8.4
WebSocket 历史消息缝合与细节打磨：

- **API 层补齐**：新建 `api/chat.ts`，封装 `getChatHistory(targetId, page)` 对接 `GET /api/v1/chat/history`，参数 `target_id / page / page_size`，返回 camelCase 消息数组
- **历史加载**：`room.vue` 在 `onLoad` 中先调用 HTTP API 拉取最近一页历史记录并渲染，完成后再注册 WS 监听器，实现「先历史 → 后实时」无缝拼接
- **下拉翻页**：`@scrolltoupper` 触发 `loadMoreHistory`，递增 `historyPage` 加载更早记录，预置 `noMoreHistory` 终止标记
- **去重校验**：维护 `loadedMsgKeys: Set<string>`（`fromId-toId-content-createdAt` 签名），WS 实时消息在 push 前校验签名是否已存在，消除历史/实时边界处的重复渲染
- **会话列表打磨**：`message.vue` 时间格式化升级 — 今天显示 `HH:mm`、昨天显示 `昨天`、更早显示 `MM-DD`；排序保持 `lastTime` 倒序

0.9.2
搜索功能闭环与安全区适配：

- **首页入口**：`index.vue` 搜索栏绑定点击跳转至 `/pages/search/search`，增加搜索图标
- **搜索专属页**：新建 `pages/search/search.vue`（387 行），包含历史搜索标签（最多 10 条、去重 + unshift 提升）、搜索结果双列瀑布流、触底加载更多、空状态提示
- **API 层扩展**：`getItems` 新增 `keyword` 参数，透传至 `GET /api/v1/items?keyword=xxx`
- **安全区适配**：通过 `getMenuButtonBoundingClientRect` 动态计算胶囊按钮位置，nav-bar 设置 `paddingRight` + `paddingTop` 避免搜索按钮与原生胶囊重叠
- **交互打磨**：空搜索拦截、`confirm-type="search"` 键盘搜索、新搜索时自动重置页码与列表
- **契约对齐**：`api/item.ts` 的 `createAppointment` 参数 `item_id` → `itemId`；`getChatHistory` 参数 `target_id/page_size` → `targetId/pageSize`；ChatHistoryResponse 响应结构匹配后端直接数组格式
- **一物一聊架构**：`conversationStore` 密钥改为 `${otherId}_${itemId}` 组合键，Conversation 新增 `itemId/itemTitle/itemCover`，聊天室发送时主动回写 sender 侧会话列表，消息列表展示物品标签

0.9.3
协议同步与聊天室上下文锚点实装：

- **契约对齐**：同步后端 P0 技术债清理结果，`api/user.ts` 新增 `ping()` 与 `PingResponse`，前端鉴权探测返回值统一切换为 `userId`，本次新增请求参数全面使用 camelCase
- **IM 增强**：`pages/chat/room.vue` 顶部实装商品上下文锚点卡片，动态展示 `itemCover / itemTitle / itemPrice`，提供“查看详情”回跳入口；通过 `msg-content.with-anchor { margin-top: 160rpx !important; }` 深度修复 fixed 锚点对首条消息、未读气泡的遮挡问题
- **行为埋点**：`api/item.ts` 新增 `reportBehaviors()`，详情页加载成功后静默上报 `view` 行为；同时增加本地 `token` 守卫，未登录用户不再触发 `/behaviors` 请求，修复了 401 全局重定向导致的详情页误跳登录 Bug
- **工程化**：`utils/request.ts` 引入结构化 `RequestError`，统一封装 `code / msg` 错误上下文，提升后续登录、风控、限流等错误分支的可维护性

0.9.4
发布端分类能力实装：

- **发布增强**：`pages/item/post.vue` 增加物品分类选择能力，支持图书、电子产品、生活用品、体育器材、其他 5 大核心预设分类
- **契约对齐**：`api/item.ts` 为 `createItem` 补齐 `CreateItemPayload`，发布上行链路正式携带 camelCase 的 `category` 字段与后端 v0.24 对齐
- **表单校验**：发布前新增分类必选拦截，用户未选择分类时明确提示“请选择物品分类”，防止产生无分类物品数据

0.9.5
首页分类筛选 UI 实装：

- **首页增强**：`pages/index/index.vue` 实装横向滚动分类 Tab 栏，支持 `scroll-x`、`enhanced`、`scroll-into-view`，切换时自动将选中分类滚动到可视区域
- **交互优化**：分类切换时增加瀑布流局部 Loading 遮罩；通过 `hasLoadedOnce` 策略隔离首屏初始化与空列表展示，消除了空状态误闪问题
- **状态管理**：完成分类切换时的四重重置逻辑，严格执行 `page = 1`、`noMore = false`、`items = []`、重新 `fetchItems()`，并保证下拉刷新继续携带当前分类上下文
- **契约对齐**：`api/item.ts` 正式启用 `GetItemsParams`，`getItems` 支持 `category` 参数透传；“全部”分类请求时传空字符串，分类 key 与发布端保持 `book/digital/daily/sports/other` 一致

0.9.6
安全登出逻辑与 WebSocket 状态重置：

- **安全增强**：`api/user.ts` 实装 `POST /auth/logout`，并与后端 Token 黑名单机制联动，确保退出后令牌立即失效
- **状态隔离**：`store/conversation.ts` 完成 `reset()` 深度清空逻辑，退出后彻底移除会话列表并重置缓存用户 ID，杜绝换号登录造成的数据污染
- **WS 优化**：`utils/websocket.ts` 实装 `ws.close()` 手动关闭机制，退出时清理重连定时器、重置重连计数并清空待发送队列，彻底解决登出后后台重连的资源浪费问题

0.9.8
契约清账与滚动稳定性收口：

- **契约统一**：首页、详情、搜索、个人中心、我的发布、我的预约等核心页面完成 camelCase 收敛，清理历史大写字段与 snake_case 页面层兜底
- **埋点去冗余**：详情页移除前端主动 `view` 行为上报，统一交由后端 `GET /items/:id` 自动埋点处理，避免重复写入行为表
- **资产接口接管**：个人中心统计与“我的发布”列表正式切换到 `GET /user/items`，废弃全量 `getItems` + 本地过滤方案，并增强对数组 / `items` / `list` / `data` 结构的防御性解构
- **认证提示补齐**：注册分支精准捕获 `409 Conflict`，新增“该学号已注册”定制提示
- **Scroll-View 底层修复**：针对首页与搜索页下拉卡死问题，补齐 `loading` 早退状态回收、`@refresherrestore` 原生兜底、延迟复位与滚动容器高度约束，彻底修复 Uni-app 刷新状态机死锁

0.9.9
首页推荐流融合与多级降级实装：

- **推荐流接管**：`api/item.ts` 新增 `getIndexRecommend()`，首页默认数据流从 `GET /items` 切换为 `GET /index/recommend`，正式消费后端 `OptionalAuth()` 推荐接口
- **双轨路由**：首页形成“推荐模式 / 分类模式”双轨数据流；`all` 分类走推荐接口，`book/digital/daily/sports/other` 具体分类回退到 `GET /items`，避免臆造推荐接口的 `category` 参数
- **推荐说明 UI**：在分类 Tab 下方新增轻量推荐说明条，分别承载登录态“根据你的浏览与想要记录为你推荐”、匿名态“当前为最新上架，登录后可体验个性化推荐”以及分类态/降级态的上下文提示
- **多级容灾降级**：推荐接口失败时不再静默混入 Mock 数据，而是显式展示“推荐引擎正在升级中”的降级说明，并按“推荐流 -> 基础在售流 -> 本地兜底”的顺序逐级回退
- **单次流分页修正**：针对 `/index/recommend` 当前为 Top20 单次流的特性，修正首页触底分页逻辑；推荐模式成功后直接 `noMore = true`，仅在分类模式或推荐失败回退基础流时继续使用普通分页追加，杜绝重复拼接推荐卡片

0.9.8.1
AI 风控 UX 与 IM 上下文契约补强：

- **注册提示细化**：`pages/auth/login.vue` 的注册分支将 `409 Conflict` 提示升级为“该学号已被注册，请直接登录或联系管理员”，与后端真实语义完全对齐
- **风控错误透传**：`pages/item/post.vue` 在发布失败时新增页面级 `403` 分流，优先展示后端透传的违规原因，避免被全局“无权操作”提示覆盖
- **一物一聊收口**：`api/chat.ts` 将 `getChatHistory()` 的 `itemId` 改为必传参数，`pages/chat/room.vue` 同步强制校验聊天上下文，缺少 `itemId` 时直接阻断并返回，避免命中后端 400
- **埋点复核**：再次核对 `pages/item/detail.vue`，确认前端主动 `view` 上报已不存在，详情浏览埋点唯一入口保持为后端 `GET /items/:id`

0.9.8.2

v0.9.8.2 这轮目标里的 4 个点已经落地：

* 详情页 `view` 双写风险：已确认清除
* 注册 `409` 精细提示：已完成
* 发布页 AI 风控 `403` 专属反馈：已完成
* 聊天历史 `itemId` 必传契约：已完成

1.0
