

本文档为“齐鲁工业大学校园二手撮合平台”后端接口的唯一基准规范，旨在指导前端 TypeScript 接口定义及论文撰写。

---

## 1. 全局设计规范

### 1.1 基础信息
- **Base URL**: `http://localhost:8080/api/v1`
- **通信协议**: HTTP/1.1 (JSON 封装)
- **字符编码**: UTF-8

### 1.2 认证鉴权 (Global Headers)
所有标记为 **【私有】** 的接口，必须在 Request Header 中携带以下字段：
| Header | Value | 描述 |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <JWT_TOKEN>` | 用户登录后获取的有效令牌 |
| `Content-Type` | `application/json` | 请求体格式声明 |

### 1.3 统一响应模型
```json
{
    "code": number,  // 状态码
    "msg": "string", // 提示信息
    "data": any      // 业务负载数据
}
```

---

## 2. 状态码与错误索引 (Error Codes)

| Code | 含义 | 场景描述 |
| :--- | :--- | :--- |
| **200** | **Success** | 请求成功并正确返回数据 |
| **400** | **Bad Request** | 参数格式错误、业务规则冲突（如余额不足、物品已售） |
| **401** | **Unauthorized** | Token 缺失、无效或已过期，需重新登录 |
| **403** | **Forbidden** | 越权操作（修改他人物品）、触发风控限流（发布过于频繁） |
| **404** | **Not Found** | 请求的资源（用户、物品、记录）不存在 |
| **429** | **Too Many Requests** | 触发 Redis 分布式锁竞争，建议稍后重试 |
| **500** | **Internal Error** | 服务器内部数据库或逻辑异常 |

---

## 3. 核心 API 接口清单

### 3.1 认证模块 (Auth)

#### [POST] /auth/register - 用户注册
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `student_id` | string | 是 | 齐工大 10-12 位学号标识 |
| `password` | string | 是 | 最小 6 位的原始密码 |

#### [POST] /auth/login - 用户登录
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `student_id` | string | 是 | 学号 |
| `password` | string | 是 | 密码 |
- **响应示例**: `data: { "token": "eyJhbG..." }`

---

### 3.2 物品模块 (Items)

#### [GET] /items - 混合搜索列表
| 参数名 | 位置 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `page` | query | number | 否 | 页码，默认 1 |
| `pageSize` | query | number | 否 | 每页条数，默认 20 |
| `status` | query | string | 否 | 状态过滤 (OnSale/Pending/Completed) |

#### [POST] /items - 发布闲置
- **鉴权**: 【私有】 | **风控**: 1min/5次限制

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `title` | string | 是 | 物品标题 (安全过滤：禁止敏感词) |
| `content` | string | 是 | 详细描述 |
| `price` | number | 是 | 价格 (float64) |
| `images` | string[] | 是 | 图片 URL 数组 |

---

### 3.3 图片上传 (Upload)

#### [POST] /upload - 文件图床

**Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `file` | file | 是 | 限制 5MB, 支持 jpg/png/jpeg |
- **响应示例**:
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

#### [POST] /appointments - 锁定并预约
- **策略**: Redis SetNX 分布式锁防超卖

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `item_id` | number | 是 | 目标物品 ID |

#### [PUT] /appointments/:id/confirm - 确认交接完成
- **鉴权**: 【私有】 | **身份限制**: 仅卖家

---

### 3.5 个人中心 (Profile)

#### [GET] /user/appointments - 我的预约汇总
- **描述**: 同时返回我作为买家和卖家的所有记录，并嵌套对应的物品实体。
- **响应示例**:
```json
{
    "code": 200,
    "msg": "success",
    "data": [
        {
            "id": 101,
            "created_at": "2026-04-07T16:00:00Z",
            "item_id": 45,
            "item": {
                "id": 45,
                "title": "二手考研资料数学一",
                "price": 20.0,
                "images": "[\"/uploads/math.jpg\"]",
                "status": "Pending",
                "publisher_id": 5
            },
            "buyer_id": 12,
            "seller_id": 5,
            "status": 1 // 1-待交接, 2-已完成, 3-已取消
        }
    ]
}
```

---

## 4. 即时通讯 (Chat / WebSocket)

### 4.1 WS 连接
- **URL**: `ws://localhost:8080/api/v1/ws?token=<JWT>`

### 4.2 消息载体 (JSON 协议)
```json
{
    "to_id": number,      // 接收者 ID
    "content": "string",   // 消息内容
    "is_read": boolean    // 是否已读
}
```

---

> [!TIP]
> **TypeScript 定义建议**:
> 前端 `Item` 接口中的 `images` 在后端存储为字符串，解析时建议定义为 `string[] | string` 以兼容不同的解析阶段。
