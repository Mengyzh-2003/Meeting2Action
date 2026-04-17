CREATE TABLE IF NOT EXISTS tasks (
  id TEXT NOT NULL PRIMARY KEY,
  source_action_item_id TEXT NOT NULL,
  meeting_id TEXT,
  title TEXT NOT NULL CHECK (length(title) <= 120),
  description TEXT NOT NULL,
  owner_name TEXT CHECK (owner_name IS NULL OR length(owner_name) <= 50),
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  acceptance_criteria TEXT,
  source_text TEXT NOT NULL,
  source_timestamp TEXT CHECK (source_timestamp IS NULL OR length(source_timestamp) <= 20),
  confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_name ON tasks (owner_name);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id ON tasks (meeting_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_action_item_id ON tasks (source_action_item_id);

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  UPDATE tasks
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS members (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) <= 50),
  grade TEXT NOT NULL CHECK (length(grade) <= 20),
  degree_type TEXT NOT NULL CHECK (degree_type IN ('master', 'phd')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_name ON members (name);
CREATE INDEX IF NOT EXISTS idx_members_grade ON members (grade);
CREATE INDEX IF NOT EXISTS idx_members_degree_type ON members (degree_type);

CREATE TRIGGER IF NOT EXISTS trg_members_updated_at
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  UPDATE members
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT NOT NULL PRIMARY KEY,
  topic TEXT NOT NULL CHECK (length(topic) <= 120),
  meeting_time TEXT NOT NULL,
  location TEXT CHECK (location IS NULL OR length(location) <= 120),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meetings_topic ON meetings (topic);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_time ON meetings (meeting_time);

CREATE TRIGGER IF NOT EXISTS trg_meetings_updated_at
AFTER UPDATE ON meetings
FOR EACH ROW
BEGIN
  UPDATE meetings
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id, member_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings (id),
  FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_member_id ON meeting_participants (member_id);

CREATE TABLE IF NOT EXISTS task_activity_logs (
  id TEXT NOT NULL PRIMARY KEY,
  task_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'status_changed', 'owner_changed', 'due_date_changed')),
  action_detail TEXT NOT NULL,
  operator_name TEXT NOT NULL CHECK (length(operator_name) <= 50),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks (id)
);

CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_id ON task_activity_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_action_type ON task_activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_created_at ON task_activity_logs (created_at);