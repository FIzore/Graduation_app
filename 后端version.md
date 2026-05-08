
# 0.31

AI Sidecar 基建与推荐接口预埋：Go/Python 解耦、首页推荐、发布链路 AI 钩子

### 🛠️ 实现内容摘要

- **AI 内部通讯包**: 新增 `pkg/aiclient`，统一封装 Go → Python FastAPI 的内部 HTTP 调用，提供 `PostToAI(path, body, response)`、默认 2s 超时、轻量重试与错误归一，AI 服务不可用时可触发优雅降级。
- **配置扩展**: `pkg/config/config.go` 与 `config/config.yaml` 新增 `ai.baseUrl`、`ai.timeout`、`ai.enableClassify` 配置项，用于控制分类侧车与超时策略。
- **发布链路 AI 钩子**: `internal/service/item_service.go` 在物品落库前调用 AI 分类预检；AI 返回分类建议时自动覆盖 `Category`，若明确返回高风险则拦截发布，AI 宕机时跳过 AI 审核，确保核心业务不中断。
- **首页推荐接口**: 新增 `GET /api/v1/index/recommend`，登录用户优先读取 Redis `recommends:user:{userId}` 的 Top20 推荐列表，未命中或未登录时回退最新上架物品；路由使用 `OptionalAuth()`。
- **推荐仓库能力**: 新增 `GetItemsByIDs` 与推荐服务层读取逻辑，保证 Redis 推荐 ID 列表可按顺序组装为物品详情返回。
- **自动化验证脚本**: 新增 `tests/v031_ai_check.sh`，覆盖推荐接口匿名/登录降级与 AI 宕机时发布链路可用性验证。
