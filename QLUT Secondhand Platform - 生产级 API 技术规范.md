
本文档为"齐鲁工业大学校园二手撮合平台"后端接口的唯一基准规范，旨在指导前端 TypeScript 接口定义及论文撰写。

---

## 1. 全局设计规范

### 1.1 基础信息
- **Base URL**: `http://localhost:8080/api/v1`
- **通信协议**: HTTP/1.1 (JSON 封装)
- **字符编码**: UTF-8
- **字段命名**: **camelCase（小驼峰）** 严格统一（v0.23+）

### 1.2 认证鉴权 (Global Headers)
所有标记为 **【私有】** 的接口，必须在 Request Header 中携带以下字段：
| Header | Value | 描述 |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <JWT_TOKEN>` | 用户登录后获取的有效令牌 |
| `Content-Type` | `application/json` | 请求体格式声明（upload 接口除外） |

### 1.3 统一响应模型
```json
{
    "code": 200,
    "msg": "success",
    "data": {}
}
```
| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `code` | number | 状态码（200 表示成功） |
| `msg` | string | 提示信息 |
| `data` | any | 业务负载数据，无数据时省略 |

---

## 2. 状态码与错误索引 (Error Codes)

| Code | 含义 | 场景描述 |
| :--- | :--- | :--- |
| **200** | **Success** | 请求成功并正确返回数据 |
| **400** | **Bad Request** | 参数格式错误、业务规则冲突 |
| **401** | **Unauthorized** | Token 缺失/无效/已过期/已登出 |
| **403** | **Forbidden** | 越权操作、触发风控限流、账号已锁定 |
| **404** | **Not Found** | 请求的资源（用户、物品、记录）不存在 |
| **429** | **Too Many Requests** | 触发 Redis 分布式锁竞争，稍后重试 |
| **500** | **Internal Error** | 服务器内部数据库或逻辑异常 |

---

## 3. 核心 API 接口清单

### 3.1 认证模块 (Auth)

#### [POST] /auth/register — 用户注册 【公开】
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `studentId` | string | 是 | 齐工大 10-12 位学号标识 |
| `password` | string | 是 | 最小 6 位原始密码 |

**业务规则**:
- 学号唯一校验，重复注册返回 400 `"学号已注册"`
- 密码使用 Bcrypt 单向哈希加密存储，明文不落地

**响应示例**:
```json
{
    "code": 200,
    "msg": "注册成功"
}
```

---

#### [POST] /auth/login — 用户登录 【公开】
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `studentId` | string | 是 | 学号 |
| `password` | string | 是 | 密码 |

**登录保护 (v0.26)**:
- 同一学号 **15 分钟内连续密码错误 5 次**，触发 `lock:login:<studentId>` Redis 锁，账号被临时锁定 **15 分钟**
- 锁定期间返回 `"账号已锁定，请 X 秒后重试"`
- 正确登录后自动清除错误计数与锁定标记

**响应示例**:
```json
{
    "code": 200,
    "msg": "登录成功",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

---

#### [POST] /auth/logout — 用户登出 【私有】 (v0.26)
| Header | 值 | 描述 |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <JWT_TOKEN>` | 需登出的 Token |

**业务规则**:
- 解析 Token 获取剩余有效期，写入 Redis `blacklist:token:<rawToken>`，TTL = 剩余秒数
- JWTAuth 中间件同步校验黑名单，已登出 Token 立即返回 401
- Redis 写入失败时仅记录 Warn 日志，对用户仍返回登出成功

**响应示例**:
```json
{
    "code": 200,
    "msg": "登出成功"
}
```

---

### 3.2 物品模块 (Items)

#### [GET] /items — 分页列表与条件筛选 【公开】
| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `page` | query | number | 否 | 页码，默认 1 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `status` | query | string | 否 | 状态过滤 `OnSale` / `Pending` / `Completed` |
| `category` | query | string | 否 | 分类过滤（如 `book`、`digital`）(v0.24) |

**响应示例**:
```json
{
    "code": 200,
    "msg": "获取成功",
    "data": {
        "items": [
            {
                "id": 1,
                "createdAt": "2026-05-04T12:00:00Z",
                "updatedAt": "2026-05-04T12:00:00Z",
                "publisherId": 5,
                "title": "二手考研资料数学一",
                "content": "九成新，笔记工整",
                "price": 20.0,
                "images": ["/uploads/math.jpg"],
                "status": "OnSale",
                "category": "book"
            }
        ],
        "total": 42
    }
}
```

---

#### [GET] /items/:id — 物品详情 【公开】
| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | path | number | 是 | 物品 ID |

**业务规则** (v0.25):
- 已登录用户访问详情时，后端**自动异步插入**一条 `behaviorType: "view"` 行为埋点记录
- 未登录用户访问不触发埋点

**响应示例**:
```json
{
    "code": 200,
    "msg": "获取成功",
    "data": {
        "id": 1,
        "createdAt": "2026-05-04T12:00:00Z",
        "updatedAt": "2026-05-04T12:00:00Z",
        "publisherId": 5,
        "title": "二手考研资料数学一",
        "content": "九成新，笔记工整",
        "price": 20.0,
        "images": ["/uploads/math.jpg"],
        "status": "OnSale",
        "category": "book"
    }
}
```

---

#### [POST] /items — 发布闲置 【私有】 + 【风控限流：1分钟5次】

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `title` | string | 是 | 物品标题，最大 30 字符。含敏感词（刷单/贷款/代写…）时 400 拦截 |
| `content` | string | 否 | 详细描述 |
| `price` | number | 是 | 价格，最小 0 |
| `images` | string[] | 否 | 图片 URL 数组，由 `/upload` 接口返回 |
| `category` | string | 否 | 分类标签，如 `book`、`digital` (v0.24) |

**业务规则**: 初始状态强制设为 `OnSale`；标题+内容经过关键词安全过滤矩阵。

**响应示例**:
```json
{
    "code": 200,
    "msg": "发布成功"
}
```

---

#### [PUT] /items/:id — 编辑物品 【私有】
| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | path | number | 是 | 物品 ID |
| 请求体同上 `POST /items` | body | object | 是 | 可修改字段 |

**业务规则**: 仅物品发布者可修改；非发布者返回 403 `"越权操作/无权修改"`。

---

#### [DELETE] /items/:id — 删除物品 【私有】
| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | path | number | 是 | 物品 ID |

**业务规则**: 删除数据库记录前自动清理本地物理图片文件（容错处理）；仅发布者可删除。

---

### 3.3 图片上传 (Upload)

#### [POST] /upload — 文件图床 【私有】
**Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `file` | file | 是 | 限制 5MB，仅允许 jpg / png / jpeg |

**业务规则**: UUID 重命名防冲突；返回 `./uploads/` 目录下的相对路径 URL。

**响应示例**:
```json
{
    "code": 200,
    "msg": "上传成功",
    "data": {
        "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg"
    }
}
```

---

### 3.4 预约交易 (Appointments)

#### [POST] /appointments — 锁定并预约 【私有】 + 【风控限流：24小时20次】

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `itemId` | number | 是 | 目标物品 ID |

**业务规则**:
- Redis `SetNX lock:item:<itemId>` 分布式锁（TTL 5s）防超卖
- MySQL 事务内完成：Item 状态 `OnSale→Pending` + 插入 Appointment 记录
- 不能预约自己发布的物品
- 物品非 `OnSale` 状态时返回 400
- 锁竞争失败返回 429

---

#### [PUT] /appointments/:id/confirm — 确认交接完成 【私有】 + 【身份限制：仅卖家】

| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | path | number | 是 | 预约记录 ID |

**业务规则**:
- MySQL 事务内完成：Appointment 状态 `Pending→Completed` + Item 状态 `→Completed`
- 仅卖家可确认；非卖家返回 403
- 仅待交接状态可确认

---

#### [PUT] /appointments/:id/cancel — 取消预约 【私有】 + 【身份限制：买卖任一方】

| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | path | number | 是 | 预约记录 ID |

**业务规则**:
- MySQL 事务内完成：Appointment 状态 `Pending→Cancelled` + Item 状态恢复为 `OnSale`
- 买方或卖方均可取消
- 仅待交接状态可取消

---

### 3.5 个人中心 (Profile)

#### [GET] /user/profile — 获取个人资料 【私有】

**响应示例**:
```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "id": 5,
        "studentId": "20210001",
        "nickname": "测试账号A",
        "avatar": "/uploads/avatar.jpg",
        "createdAt": "2026-04-01T08:00:00Z"
    }
}
```
> ⚠️ **安全红线**: `password` 字段标记 `json:"-"`，**任何接口均不返回**密码哈希。

---

#### [PUT] /user/profile — 修改个人资料 【私有】

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `nickname` | string | 否 | 新昵称 |
| `avatar` | string | 否 | 头像 URL |

**业务规则**: 使用 `Select("Nickname", "Avatar")` 白名单更新，**绝对无法**越权修改 `studentId` 或 `password`。

---

#### [GET] /user/items — 我的发布 【私有】

返回当前用户发布的所有物品，按 `createdAt` 倒序排列。

---

#### [GET] /user/appointments — 我的预约汇总 【私有】

**描述**: 同时返回作为买家或卖家的所有预约记录，通过 GORM `Preload` 内联关联的物品实体。

**响应示例**:
```json
{
    "code": 200,
    "msg": "success",
    "data": [
        {
            "id": 101,
            "createdAt": "2026-05-04T16:00:00Z",
            "updatedAt": "2026-05-04T16:00:00Z",
            "itemId": 45,
            "item": {
                "id": 45,
                "publisherId": 5,
                "title": "二手考研资料数学一",
                "content": "",
                "price": 20.0,
                "images": ["/uploads/math.jpg"],
                "status": "Pending",
                "category": "book"
            },
            "buyerId": 12,
            "sellerId": 5,
            "status": 1
        }
    ]
}
```
| status 值 | 含义 |
| :--- | :--- |
| 1 | 待交接 (Pending) |
| 2 | 已完成 (Completed) |
| 3 | 已取消 (Cancelled) |

---

#### [GET] /user/ping — 鉴权探测 【私有】

验证当前 Token 有效性，返回解析出的 `userId`。

**响应示例**:
```json
{
    "code": 200,
    "msg": "鉴权通过",
    "data": {
        "userId": 5
    }
}
```

---

### 3.6 行为埋点 (Behaviors) — (v0.25)

#### [POST] /behaviors — 批量上报行为 【私有】

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `behaviors` | array | 是 | 行为对象数组，支持批量上报 |

每个行为对象结构:

| 字段 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `itemId` | number \| null | 否 | 物品 ID，纯搜索行为可传 null |
| `behaviorType` | string | 是 | 行为类型: `view` / `favorite` / `search` |
| `searchQuery` | string | 否 | 搜索词，仅 `behaviorType=search` 时有效 |

**请求示例**:
```json
{
    "behaviors": [
        { "itemId": 1, "behaviorType": "view" },
        { "itemId": 2, "behaviorType": "favorite" },
        { "behaviorType": "search", "searchQuery": "高数教材" }
    ]
}
```

**响应示例**:
```json
{
    "code": 200,
    "msg": "记录成功"
}
```

**业务规则**:
- 批量一次性写入 MySQL `user_behaviors` 表
- `userId` 由中间件自动注入，前端无需传
- 已登录用户访问 `GET /items/:id` 时，后端自动异步插入 `view` 行为（防前端漏报）
- 为 Python NCF 神经协同过滤推荐算法提供训练数据

---

## 4. 即时通讯 (Chat / WebSocket)

### 4.1 WebSocket 连接 (v0.22 加固)
- **URL**: `ws://localhost:8080/api/v1/ws?token=<JWT>`
- **鉴权方式**: URL Query 参数携带 JWT Token
- **心跳机制**: 服务端每 30s 发送 Ping Frame，60s 读超时，10s 写超时
- **协程保护**: readPump / writePump 含 `defer recover()` 防崩溃泄漏

### 4.2 消息载体 (JSON 协议)
```json
{
    "toId": 8,
    "content": "你好，这本书还在吗？",
    "isRead": false
}
```
| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `fromId` | number | 发送者 ID（由服务端覆盖，前端可不传） |
| `toId` | number | 接收者 ID |
| `content` | string | 消息内容 |
| `createdAt` | string | 服务端自动填充时间戳 |
| `isRead` | boolean | 是否已读 |

**业务规则**:
- 消息"先存后发"：先持久化到 MySQL `messages` 表，再推送给在线接收者
- 接收者离线时消息静默落库，可通过 `/chat/history` 查询

---

### 4.3 [GET] /chat/history — 聊天记录 【私有】

| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `targetId` | query | number | 是 | 对话对方的用户 ID |
| `page` | query | number | 否 | 页码，默认 1 |
| `pageSize` | query | number | 否 | 每页条数，默认 20 |

**响应示例**:
```json
{
    "code": 200,
    "msg": "success",
    "data": [
        {
            "id": 1,
            "createdAt": "2026-05-04T12:30:00Z",
            "fromId": 5,
            "toId": 8,
            "content": "你好，这本书还在吗？",
            "isRead": false
        }
    ]
}
```

---

## 5. 数据模型一览

### 5.1 Item (物品)
```typescript
interface Item {
    id: number;
    createdAt: string;
    updatedAt: string;
    publisherId: number;
    title: string;
    content: string;
    price: number;
    images: string[];       // JSON 数组，存储图片 URL
    status: "OnSale" | "Pending" | "Completed";
    category: string;        // (v0.24) 分类标签
}
```

### 5.2 User (用户) — 公开字段
```typescript
interface UserProfile {
    id: number;
    studentId: string;
    nickname: string;
    avatar: string;
    createdAt: string;
    // ⚠️ password 字段标记 json:"-"，永不返回
}
```

### 5.3 Appointment (预约)
```typescript
interface Appointment {
    id: number;
    createdAt: string;
    updatedAt: string;
    itemId: number;
    item?: Item;             // Preload 关联，查询时按需填充
    buyerId: number;
    sellerId: number;
    status: 1 | 2 | 3;       // 1=Pending, 2=Completed, 3=Cancelled
}
```

### 5.4 Message (消息)
```typescript
interface Message {
    id: number;
    createdAt: string;
    fromId: number;
    toId: number;
    content: string;
    isRead: boolean;
}
```

### 5.5 UserBehavior (行为埋点) — (v0.25)
```typescript
interface UserBehavior {
    id: number;
    createdAt: string;
    userId: number;
    itemId?: number | null;    // 搜索行为时为 null
    behaviorType: "view" | "favorite" | "search";
    searchQuery?: string;      // 仅 behaviorType=search 时有值
}
```

---

## 6. 风控与安全策略总览

| 接口 | 策略 | 阈值 | 实现 |
| :--- | :--- | :--- | :--- |
| `POST /items` | 发布频率限制 | 1分钟 5次 | Redis `IncrAndExpire` |
| `POST /appointments` | 预约频率限制 | 24小时 20次 | Redis `IncrAndExpire` |
| `POST /appointments` | 分布式锁防超卖 | TTL 5s | Redis `SetNX` |
| `POST /auth/login` | 登录爆破锁定 | 15分钟 5次 | Redis `IncrAndExpire` + 锁定 Key |
| `POST /auth/logout` | Token 黑名单 | TTL = JWT 剩余有效期 | Redis `SetWithExpire` |
| 所有私有接口 + `/ws` | JWT 鉴权 + 黑名单校验 | — | JWTAuth 中间件 |

---

## 7. 版本变更记录

| 版本 | 日期 | 变更摘要 |
| :--- | :--- | :--- |
| v0.23 | 2026-05 | 全局 camelCase 重构：所有 JSON 字段/Query 参数统一小驼峰；`password` 加 `json:"-"` |
| v0.24 | 2026-05 | 新增 `Item.category` 字段；`GET /items` 增加 `category` 查询参数 |
| v0.25 | 2026-05 | 新增 `UserBehavior` 模型与 `POST /behaviors` 接口；`GET /items/:id` 自动 view 埋点 |
| v0.26 | 2026-05 | 新增 `POST /auth/logout` Token 黑名单登出；`Login` 增加防暴力破解限流 |
