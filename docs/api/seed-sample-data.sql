INSERT OR REPLACE INTO members (id, name, grade, degree_type)
VALUES
  ('member_001', '蒙亚舟', '2024级', 'master'),
  ('member_002', '马瑀阔', '2024级', 'master'),
  ('member_003', '刘帝恺', '2023级', 'phd'),
  ('member_004', '杨羽因', '2023级', 'phd');

INSERT OR REPLACE INTO meetings (id, topic, meeting_time, location)
VALUES
  ('meeting_001', '会易达 MVP 功能拆解会', '2026-04-17 19:00:00', '复旦大学实验室 A201'),
  ('meeting_002', '任务看板联调准备会', '2026-04-18 14:00:00', '线上腾讯会议');

INSERT OR REPLACE INTO meeting_participants (meeting_id, member_id)
VALUES
  ('meeting_001', 'member_001'),
  ('meeting_001', 'member_002'),
  ('meeting_001', 'member_003'),
  ('meeting_002', 'member_001'),
  ('meeting_002', 'member_002'),
  ('meeting_002', 'member_004');

INSERT OR REPLACE INTO tasks (
  id,
  source_action_item_id,
  meeting_id,
  title,
  description,
  owner_name,
  due_date,
  priority,
  status,
  acceptance_criteria,
  source_text,
  source_timestamp,
  confidence,
  tags
)
VALUES
  (
    'task_001',
    'ai_001',
    'meeting_001',
    '完成三组对比实验复现',
    '基于当前基线模型，完成论文中三组对比实验的复现，并整理结果表格。',
    '蒙亚舟',
    '2026-04-24',
    'high',
    'todo',
    '提交实验结果表，并汇报不同设置下的性能差异。',
    '蒙亚舟下周把三组对比实验跑完，结果整理成表。',
    '00:18:32',
    0.92,
    '["实验","复现","CVPR"]'
  ),
  (
    'task_002',
    'ai_002',
    'meeting_001',
    '整理 actionItems 字段映射',
    '完成 actionItems 到 tasks 的字段映射说明，供前后端联调使用。',
    '马瑀阔',
    '2026-04-20',
    'medium',
    'doing',
    '输出一份字段映射表，并完成接口字段统一。',
    '马瑀阔把 actionItems 和 task 的字段映射先整理出来。',
    '00:25:10',
    0.88,
    '["接口","字段映射"]'
  ),
  (
    'task_003',
    'ai_003',
    'meeting_002',
    '完成看板首页原型',
    '实现待办、进行中、已完成三列看板的第一版页面结构。',
    '蒙亚舟',
    '2026-04-22',
    'high',
    'done',
    '页面可展示任务卡片并区分三种状态。',
    '看板首页这周先把三列原型搭起来。',
    '00:10:45',
    0.9,
    '["前端","看板"]'
  );

INSERT OR REPLACE INTO task_activity_logs (
  id,
  task_id,
  action_type,
  action_detail,
  operator_name,
  created_at
)
VALUES
  (
    'log_001',
    'task_001',
    'created',
    '根据 actionItems 自动创建任务。',
    'system',
    '2026-04-17 20:05:00'
  ),
  (
    'log_002',
    'task_002',
    'created',
    '根据 actionItems 自动创建任务。',
    'system',
    '2026-04-17 20:06:00'
  ),
  (
    'log_003',
    'task_002',
    'status_changed',
    '任务状态从 todo 更新为 doing。',
    '马瑀阔',
    '2026-04-18 09:30:00'
  ),
  (
    'log_004',
    'task_003',
    'created',
    '根据 actionItems 自动创建任务。',
    'system',
    '2026-04-17 20:10:00'
  ),
  (
    'log_005',
    'task_003',
    'status_changed',
    '任务状态从 todo 更新为 doing。',
    '蒙亚舟',
    '2026-04-18 10:00:00'
  ),
  (
    'log_006',
    'task_003',
    'status_changed',
    '任务状态从 doing 更新为 done。',
    '蒙亚舟',
    '2026-04-19 18:00:00'
  );