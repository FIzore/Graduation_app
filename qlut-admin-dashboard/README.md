# QLUT Admin Dashboard

独立管理大屏前端，面向后端 v0.35 `GET /api/v1/admin/dashboard/stats`。

## 启动

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

## 后端接口

```http
GET /api/v1/admin/dashboard/stats
Authorization: Bearer <token>
```

环境变量：

```text
VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

## 数据降级

接口不可用时自动使用 `src/mock/dashboard.ts` 中的演示数据，保证 ECharts 页面可展示。
