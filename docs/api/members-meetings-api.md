# Members / Meetings 接口说明

更新时间：2026-04-18

本文档已经从接口草图升级为当前实现说明。`members` 与 `meetings` 的基础查询、新增、修改、详情接口已经落地到后端，`meeting_participants` 也已经拆成独立查询与维护接口。

## 1. Members

### 1.1 查询成员列表

```http
GET /api/members
```

响应示例：

```json
{
  "items": [
    {
      "id": "member_001",
      "name": "蒙亚舟",
      "grade": "2024级",
      "degreeType": "master",
      "createdAt": "2026-04-17T20:00:00Z",
      "updatedAt": "2026-04-17T20:00:00Z"
    }
  ],
  "count": 1
}
```

### 1.2 查询成员详情

```http
GET /api/members/:id
```

### 1.3 创建成员

```http
POST /api/members
```

请求体：

```json
{
  "name": "蒙亚舟",
  "grade": "2024级",
  "degreeType": "master"
}
```

说明：

- 前端当前已拦截同名成员重复添加。
- 后端与数据库唯一约束建议补齐（当前版本仍建议在服务层增加兜底校验）。

### 1.4 更新成员

```http
PATCH /api/members/:id
```

请求体：

```json
{
  "grade": "2025级"
}
```

### 1.5 删除成员

```http
DELETE /api/members/:id
```

删除规则：

- 先删除该成员在 `meeting_participants` 中的关系记录。
- 再删除 `members` 本体记录。
- 当前不会回写清空 `tasks.ownerName`，因为任务负责人目前是文本字段，不是外键关系。

## 2. Meetings

### 2.1 查询会议列表

```http
GET /api/meetings
```

响应示例：

```json
{
  "items": [
    {
      "id": "meeting_001",
      "topic": "会易达 MVP 功能拆解会",
      "meetingTime": "2026-04-17 19:00:00",
      "location": "复旦大学实验室 A201",
      "participants": [
        {
          "id": "member_001",
          "name": "蒙亚舟",
          "grade": "2024级",
          "degreeType": "master"
        }
      ],
      "createdAt": "2026-04-17T20:00:00Z",
      "updatedAt": "2026-04-17T20:00:00Z"
    }
  ],
  "count": 1
}
```

### 2.2 查询会议详情

```http
GET /api/meetings/:id
```

### 2.3 创建会议

```http
POST /api/meetings
```

请求体：

```json
{
  "topic": "会易达 MVP 功能拆解会",
  "meetingTime": "2026-04-17 19:00:00",
  "location": "复旦大学实验室 A201",
  "participantIds": ["member_001", "member_002"]
}
```

### 2.4 更新会议

```http
PATCH /api/meetings/:id
```

请求体：

```json
{
  "location": "线上腾讯会议",
  "participantIds": ["member_001", "member_002", "member_003"]
}
```

### 2.5 查询会议参会人

```http
GET /api/meetings/:id/participants
```

响应示例：

```json
{
  "items": [
    {
      "meetingId": "meeting_001",
      "memberId": "member_001",
      "createdAt": "2026-04-17 20:00:00",
      "member": {
        "id": "member_001",
        "name": "蒙亚舟",
        "grade": "2024级",
        "degreeType": "master"
      }
    }
  ],
  "count": 1
}
```

### 2.6 单独更新会议参会人

```http
PATCH /api/meetings/:id/participants
```

请求体：

```json
{
  "participantIds": ["member_001", "member_002", "member_003"]
}
```

### 2.7 删除会议

```http
DELETE /api/meetings/:id
```

删除规则：

- 先删除该会议在 `meeting_participants` 中的关系记录。
- 再把 `tasks.meeting_id` 中指向该会议的记录置为 `null`。
- 最后删除 `meetings` 本体记录。

## 3. 关联规则

### 3.1 会议与参会人

- `meetings` 保存会议基本信息。
- `meeting_participants` 保存参会人关系。
- 查询会议详情时，由后端聚合 `participants` 数组返回给前端。
- 参会人关系也可通过独立接口单独查询与更新。

### 3.2 与 tasks 的关系

- `tasks.meeting_id` 指向任务来源会议。
- 前端可通过会议详情页回看某次会议的参会成员和产出任务。

## 4. 当前建议

- 当前已实现：`GET /api/members`、`GET /api/members/:id`、`POST /api/members`、`PATCH /api/members/:id`、`DELETE /api/members/:id`。
- 当前已实现：`GET /api/meetings`、`GET /api/meetings/:id`、`GET /api/meetings/:id/participants`、`POST /api/meetings`、`PATCH /api/meetings/:id`、`PATCH /api/meetings/:id/participants`、`DELETE /api/meetings/:id`。
- 这样已经能支撑任务导入时的负责人选择、会议来源关联、会议详情回看、参会人关系的独立维护，以及测试数据和错误数据清理。