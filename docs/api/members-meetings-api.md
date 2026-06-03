# Members / Meetings 接口说明

更新时间：2026-06-03

本文档描述当前仓库已经落地的成员、会议与参会人接口。以下说明以当前代码为准。

## 1. 鉴权说明

支持两种会话头：

- `Authorization: Bearer <token>`
- `X-Session-Token: <token>`

当前权限边界：

| 接口 | 是否需要登录 |
|---|---|
| `GET /api/members/status` | 否 |
| `GET /api/members` | 是 |
| `GET /api/members/:id` | 是 |
| `POST /api/members` | 首位成员可匿名创建，其余情况需要登录 |
| `PATCH /api/members/:id` | 是 |
| `DELETE /api/members/:id` | 是 |
| `GET /api/meetings` | 否 |
| `GET /api/meetings/:id` | 否 |
| `GET /api/meetings/:id/participants` | 否 |
| `POST /api/meetings` | 是 |
| `PATCH /api/meetings/:id` | 是 |
| `PATCH /api/meetings/:id/participants` | 是 |
| `DELETE /api/meetings/:id` | 是 |

## 2. Members

### 2.1 成员状态

```http
GET /api/members/status
```

响应示例：

```json
{
  "hasMembers": true,
  "count": 3
}
```

该接口用于登录页判断是否要进入“首位成员初始化”模式。

### 2.2 查询成员列表

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
      "studentId": "一年级",
      "degreeType": "master",
      "createdAt": "2026-06-03T07:00:00.000Z",
      "updatedAt": "2026-06-03T07:00:00.000Z"
    }
  ],
  "count": 1
}
```

说明：

- 当前列表响应不返回密码。
- 当前成员字段已从旧的 `grade` 模型切换为 `studentId`。

### 2.3 查询成员详情

```http
GET /api/members/:id
```

返回单个成员对象，字段结构与成员列表一致。

### 2.4 创建成员

```http
POST /api/members
```

请求体：

```json
{
  "name": "蒙亚舟",
  "studentId": "一年级",
  "degreeType": "master"
}
```

成功响应示例：

```json
{
  "id": "member_001",
  "name": "蒙亚舟",
  "studentId": "一年级",
  "degreeType": "master",
  "createdAt": "2026-06-03T07:00:00.000Z",
  "updatedAt": "2026-06-03T07:00:00.000Z",
  "initialPassword": "314159"
}
```

说明：

- 当系统中还没有成员时，允许匿名创建首位成员。
- 当系统中已有成员时，创建成员需要登录。
- `initialPassword` 只会在创建成功当次响应中返回，用于前端提示保存。
- 数据库当前对 `name` 和 `studentId` 都做了唯一性约束。

### 2.5 更新成员

```http
PATCH /api/members/:id
```

请求体示例：

```json
{
  "studentId": "二年级"
}
```

可更新字段：

- `name`
- `studentId`
- `degreeType`

说明：

- 如果成员姓名变更，后端会同步回写该成员名下任务的 `owner_name`。

### 2.6 删除成员

```http
DELETE /api/members/:id
```

成功响应：

```json
{
  "deleted": true,
  "id": "member_001"
}
```

删除规则：

- 先删除 `meeting_participants` 中的参会关系
- 再将 `tasks.owner_member_id` 置空
- 最后删除 `members` 记录本身
- 当前不会清空 `tasks.owner_name`，因为任务仍保留文本回退字段

## 3. Meetings

### 3.1 查询会议列表

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
      "meetingTime": "2026-06-03 19:00:00",
      "location": "复旦大学实验室 A201",
      "participants": [
        {
          "id": "member_001",
          "name": "蒙亚舟",
          "studentId": "一年级",
          "degreeType": "master"
        }
      ],
      "createdAt": "2026-06-03T07:00:00.000Z",
      "updatedAt": "2026-06-03T07:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 3.2 查询会议详情

```http
GET /api/meetings/:id
```

返回单个会议对象，字段结构与列表项一致。

### 3.3 创建会议

```http
POST /api/meetings
```

请求体：

```json
{
  "topic": "会易达 MVP 功能拆解会",
  "meetingTime": "2026-06-03 19:00:00",
  "location": "复旦大学实验室 A201",
  "participantIds": ["member_001", "member_002"]
}
```

### 3.4 更新会议

```http
PATCH /api/meetings/:id
```

请求体示例：

```json
{
  "location": "线上腾讯会议"
}
```

### 3.5 查询会议参会人

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
      "createdAt": "2026-06-03T07:00:00.000Z",
      "member": {
        "id": "member_001",
        "name": "蒙亚舟",
        "studentId": "一年级",
        "degreeType": "master"
      }
    }
  ],
  "count": 1
}
```

### 3.6 单独更新会议参会人

```http
PATCH /api/meetings/:id/participants
```

请求体：

```json
{
  "participantIds": ["member_001", "member_002", "member_003"]
}
```

### 3.7 删除会议

```http
DELETE /api/meetings/:id
```

删除规则：

- 先删除 `meeting_participants` 中的关系记录
- 再把 `tasks.meeting_id` 中指向该会议的记录置为 `null`
- 最后删除 `meetings` 本体记录

## 4. 关系说明

### 4.1 会议与参会人

- `meetings` 保存会议主体信息
- `meeting_participants` 保存多对多参会关系
- 查询会议详情时，后端会聚合 `participants` 数组返回

### 4.2 会议与任务

- `tasks.meeting_id` 表示任务来源会议
- 前端可以基于会议信息回看会议产出任务和相关成员

### 4.3 成员与登录

- 成员记录保存 `name`、`studentId`、`degreeType`
- 当前登录用户名实际使用成员 `name`
- 密码为创建成员时生成的 6 位初始密码的哈希值