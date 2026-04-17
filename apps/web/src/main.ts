type TaskStatus = 'todo' | 'doing' | 'done';
type TaskPriorityValue = 'low' | 'medium' | 'high';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  ownerName: string | null;
  dueDate: string | null;
  priority: TaskPriorityValue;
  status: TaskStatus;
  acceptanceCriteria: string | null;
  sourceText: string;
  sourceTimestamp: string | null;
  confidence: number;
  tags: string[];
}

interface ActionItemsPayload {
  summary: string;
  actionItems: ActionItem[];
}

interface Task {
  id: string;
  sourceActionItemId: string;
  meetingId: string | null;
  title: string;
  description: string;
  ownerName: string | null;
  dueDate: string | null;
  priority: TaskPriorityValue;
  status: TaskStatus;
  acceptanceCriteria: string | null;
  sourceText: string;
  sourceTimestamp: string | null;
  confidence: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TaskActivityLog {
  id: string;
  taskId: string;
  actionType: string;
  actionDetail: string;
  operatorName: string;
  createdAt: string;
}

interface BoardColumn {
  status: TaskStatus;
  title: 'To Do' | 'Doing' | 'Done';
  items: Task[];
}

interface BoardStats {
  total: number;
  todo: number;
  doing: number;
  done: number;
  overdue: number;
  dueSoon: number;
}

interface BoardResponse {
  columns: BoardColumn[];
  stats: BoardStats;
}

interface BoardFilters {
  status: 'all' | TaskStatus;
  ownerName: string;
  risk: 'all' | 'overdue' | 'dueSoon' | 'highPriority';
}

interface ActivityResponse {
  items: TaskActivityLog[];
  count: number;
}

interface ImportResponse {
  items: Task[];
  count: number;
}

interface Member {
  id: string;
  name: string;
  grade: string;
  degreeType: 'master' | 'phd';
  createdAt: string;
  updatedAt: string;
}

interface MeetingParticipant {
  meetingId: string;
  memberId: string;
  createdAt: string;
  member: MemberSummary;
}

interface MemberSummary {
  id: string;
  name: string;
  grade: string;
  degreeType: 'master' | 'phd';
}

interface Meeting {
  id: string;
  topic: string;
  meetingTime: string;
  location: string | null;
  participants: MemberSummary[];
  createdAt: string;
  updatedAt: string;
}

interface ListResponse<T> {
  items: T[];
  count: number;
}

const API_BASE_URL = 'http://127.0.0.1:3001';
const SAMPLE_IMPORT_PAYLOAD: ActionItemsPayload = {
  summary: '本次会议主要围绕实验复现、字段映射和看板联调展开。',
  actionItems: [
    {
      id: 'demo_101',
      title: '补全导入确认页联调说明',
      description: '整理导入确认页的输入格式、字段含义和提交链路，方便模块 2 与模块 3 联调。',
      ownerName: '蒙亚舟',
      dueDate: '2026-04-21',
      priority: 'high',
      status: 'todo',
      acceptanceCriteria: '输出一份导入链路说明，并完成页面自测。',
      sourceText: '蒙亚舟把导入确认页这块的联调链路整理一下。',
      sourceTimestamp: '00:08:12',
      confidence: 0.91,
      tags: ['联调', '导入页'],
    },
    {
      id: 'demo_102',
      title: '确认任务卡片字段展示',
      description: '对齐看板卡片上要展示的负责人、截止日期和优先级字段。',
      ownerName: '马瑀阔',
      dueDate: '2026-04-22',
      priority: 'medium',
      status: 'todo',
      acceptanceCriteria: '完成卡片字段清单并在页面中展示。',
      sourceText: '马瑀阔确认一下任务卡片具体要显示哪些字段。',
      sourceTimestamp: '00:11:20',
      confidence: 0.87,
      tags: ['看板', '字段'],
    },
  ],
};

const statsPanel = document.querySelector<HTMLDivElement>('#stats-panel');
const boardColumns = document.querySelector<HTMLDivElement>('#board-columns');
const taskDetail = document.querySelector<HTMLDivElement>('#task-detail');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh-board');
const loadSampleButton = document.querySelector<HTMLButtonElement>('#load-sample');
const previewImportButton = document.querySelector<HTMLButtonElement>('#preview-import');
const submitImportButton = document.querySelector<HTMLButtonElement>('#submit-import');
const importJsonTextarea = document.querySelector<HTMLTextAreaElement>('#import-json');
const importPreview = document.querySelector<HTMLDivElement>('#import-preview');
const importFeedback = document.querySelector<HTMLDivElement>('#import-feedback');
const meetingIdInput = document.querySelector<HTMLInputElement>('#meeting-id-input');
const operatorNameInput = document.querySelector<HTMLInputElement>('#operator-name-input');
const statusFilter = document.querySelector<HTMLSelectElement>('#status-filter');
const ownerFilter = document.querySelector<HTMLSelectElement>('#owner-filter');
const riskFilter = document.querySelector<HTMLSelectElement>('#risk-filter');
const resetFiltersButton = document.querySelector<HTMLButtonElement>('#reset-filters');
const refreshMembersButton = document.querySelector<HTMLButtonElement>('#refresh-members');
const memberNameInput = document.querySelector<HTMLInputElement>('#member-name-input');
const memberGradeInput = document.querySelector<HTMLInputElement>('#member-grade-input');
const memberDegreeTypeInput = document.querySelector<HTMLSelectElement>('#member-degree-type-input');
const createMemberButton = document.querySelector<HTMLButtonElement>('#create-member');
const memberFeedback = document.querySelector<HTMLDivElement>('#member-feedback');
const memberList = document.querySelector<HTMLDivElement>('#member-list');
const refreshMeetingsButton = document.querySelector<HTMLButtonElement>('#refresh-meetings');
const meetingTopicInput = document.querySelector<HTMLInputElement>('#meeting-topic-input');
const meetingTimeInput = document.querySelector<HTMLInputElement>('#meeting-time-input');
const meetingLocationInput = document.querySelector<HTMLInputElement>('#meeting-location-input');
const clearMeetingMembersButton = document.querySelector<HTMLButtonElement>('#clear-meeting-members');
const meetingMemberPicker = document.querySelector<HTMLDivElement>('#meeting-member-picker');
const createMeetingButton = document.querySelector<HTMLButtonElement>('#create-meeting');
const meetingFeedback = document.querySelector<HTMLDivElement>('#meeting-feedback');
const meetingList = document.querySelector<HTMLDivElement>('#meeting-list');

let selectedTaskId: string | null = null;
let draftActionItems: ActionItem[] = [];
let latestBoardData: BoardResponse | null = null;
let latestBoardStats: BoardStats | null = null;
let latestMembers: Member[] = [];
let latestMeetings: Meeting[] = [];
const boardFilters: BoardFilters = {
  status: 'all',
  ownerName: 'all',
  risk: 'all',
};

function assertElement<T>(element: T | null, message: string): T {
  if (!element) {
    throw new Error(message);
  }

  return element;
}

const safeStatsPanel = assertElement(statsPanel, 'stats panel not found');
const safeBoardColumns = assertElement(boardColumns, 'board columns not found');
const safeTaskDetail = assertElement(taskDetail, 'task detail not found');
const safeRefreshButton = assertElement(refreshButton, 'refresh button not found');
const safeLoadSampleButton = assertElement(loadSampleButton, 'load sample button not found');
const safePreviewImportButton = assertElement(previewImportButton, 'preview import button not found');
const safeSubmitImportButton = assertElement(submitImportButton, 'submit import button not found');
const safeImportJsonTextarea = assertElement(importJsonTextarea, 'import json textarea not found');
const safeImportPreview = assertElement(importPreview, 'import preview not found');
const safeImportFeedback = assertElement(importFeedback, 'import feedback not found');
const safeMeetingIdInput = assertElement(meetingIdInput, 'meeting id input not found');
const safeOperatorNameInput = assertElement(operatorNameInput, 'operator name input not found');
const safeStatusFilter = assertElement(statusFilter, 'status filter not found');
const safeOwnerFilter = assertElement(ownerFilter, 'owner filter not found');
const safeRiskFilter = assertElement(riskFilter, 'risk filter not found');
const safeResetFiltersButton = assertElement(resetFiltersButton, 'reset filters button not found');
const safeRefreshMembersButton = assertElement(refreshMembersButton, 'refresh members button not found');
const safeMemberNameInput = assertElement(memberNameInput, 'member name input not found');
const safeMemberGradeInput = assertElement(memberGradeInput, 'member grade input not found');
const safeMemberDegreeTypeInput = assertElement(memberDegreeTypeInput, 'member degree type input not found');
const safeCreateMemberButton = assertElement(createMemberButton, 'create member button not found');
const safeMemberFeedback = assertElement(memberFeedback, 'member feedback not found');
const safeMemberList = assertElement(memberList, 'member list not found');
const safeRefreshMeetingsButton = assertElement(refreshMeetingsButton, 'refresh meetings button not found');
const safeMeetingTopicInput = assertElement(meetingTopicInput, 'meeting topic input not found');
const safeMeetingTimeInput = assertElement(meetingTimeInput, 'meeting time input not found');
const safeMeetingLocationInput = assertElement(meetingLocationInput, 'meeting location input not found');
const safeClearMeetingMembersButton = assertElement(clearMeetingMembersButton, 'clear meeting members button not found');
const safeMeetingMemberPicker = assertElement(meetingMemberPicker, 'meeting member picker not found');
const safeCreateMeetingButton = assertElement(createMeetingButton, 'create meeting button not found');
const safeMeetingFeedback = assertElement(meetingFeedback, 'meeting feedback not found');
const safeMeetingList = assertElement(meetingList, 'meeting list not found');

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return '未设置';
  }

  return dateString;
}

function priorityLabel(priority: TaskPriorityValue): string {
  switch (priority) {
    case 'high':
      return '高优先级';
    case 'medium':
      return '中优先级';
    default:
      return '低优先级';
  }
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  const today = new Date();
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return dueDate.getTime() < today.getTime();
}

function isDueSoon(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  const today = new Date();
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffInDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays >= 0 && diffInDays <= 3;
}

function taskRiskLabel(task: Task): string | null {
  if (isOverdue(task)) {
    return '已逾期';
  }

  if (isDueSoon(task)) {
    return '即将到期';
  }

  return null;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeActionItem(rawItem: Partial<ActionItem> & { id?: string; title?: string; description?: string; sourceText?: string }): ActionItem {
  return {
    id: rawItem.id ?? `demo_${Date.now()}`,
    title: rawItem.title ?? '未命名任务',
    description: rawItem.description ?? '暂无描述',
    ownerName: rawItem.ownerName ?? null,
    dueDate: rawItem.dueDate ?? null,
    priority: rawItem.priority ?? 'medium',
    status: rawItem.status ?? 'todo',
    acceptanceCriteria: rawItem.acceptanceCriteria ?? null,
    sourceText: rawItem.sourceText ?? '暂无来源语句',
    sourceTimestamp: rawItem.sourceTimestamp ?? null,
    confidence: rawItem.confidence ?? 0.8,
    tags: Array.isArray(rawItem.tags) ? rawItem.tags : [],
  };
}

function parseImportPayload(rawText: string): ActionItem[] {
  const parsed = JSON.parse(rawText) as ActionItemsPayload | ActionItem[];

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeActionItem);
  }

  if (Array.isArray(parsed.actionItems)) {
    return parsed.actionItems.map(normalizeActionItem);
  }

  throw new Error('JSON 中未找到 actionItems 数组。');
}

function createImportCard(item: ActionItem, index: number): string {
  return `
    <article class="import-item-card" data-import-index="${index}">
      <div class="import-item-header">
        <div>
          <p class="import-item-index">行动项 ${index + 1}</p>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
        <span class="priority-tag priority-${item.priority}">${priorityLabel(item.priority)}</span>
      </div>
      <div class="import-form-grid">
        <label>
          <span>标题</span>
          <input data-field="title" type="text" value="${escapeHtml(item.title)}" />
        </label>
        <label>
          <span>负责人</span>
          <input data-field="ownerName" type="text" value="${escapeHtml(item.ownerName ?? '')}" />
        </label>
        <label>
          <span>截止时间</span>
          <input data-field="dueDate" type="date" value="${escapeHtml(item.dueDate ?? '')}" />
        </label>
        <label>
          <span>优先级</span>
          <select data-field="priority">
            <option value="low" ${item.priority === 'low' ? 'selected' : ''}>low</option>
            <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>medium</option>
            <option value="high" ${item.priority === 'high' ? 'selected' : ''}>high</option>
          </select>
        </label>
        <label>
          <span>状态</span>
          <select data-field="status">
            <option value="todo" ${item.status === 'todo' ? 'selected' : ''}>todo</option>
            <option value="doing" ${item.status === 'doing' ? 'selected' : ''}>doing</option>
            <option value="done" ${item.status === 'done' ? 'selected' : ''}>done</option>
          </select>
        </label>
        <label>
          <span>置信度</span>
          <input data-field="confidence" type="number" min="0" max="1" step="0.01" value="${item.confidence}" />
        </label>
      </div>
      <label class="stack-field">
        <span>描述</span>
        <textarea data-field="description" rows="3">${escapeHtml(item.description)}</textarea>
      </label>
      <label class="stack-field">
        <span>验收标准</span>
        <textarea data-field="acceptanceCriteria" rows="2">${escapeHtml(item.acceptanceCriteria ?? '')}</textarea>
      </label>
      <label class="stack-field">
        <span>来源语句</span>
        <textarea data-field="sourceText" rows="2">${escapeHtml(item.sourceText)}</textarea>
      </label>
    </article>
  `;
}

function setImportFeedback(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
  safeImportFeedback.className = `import-feedback tone-${tone}`;
  safeImportFeedback.textContent = message;
}

function bindImportPreviewEvents(): void {
  safeImportPreview.querySelectorAll<HTMLElement>('[data-import-index]').forEach((card) => {
    const index = Number(card.dataset.importIndex);
    card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]').forEach((field) => {
      field.addEventListener('input', () => {
        const fieldName = field.dataset.field as keyof ActionItem;
        const rawValue = field.value;

        if (fieldName === 'confidence') {
          draftActionItems[index].confidence = Number(rawValue);
          return;
        }

        if (fieldName === 'ownerName' || fieldName === 'dueDate' || fieldName === 'acceptanceCriteria') {
          draftActionItems[index][fieldName] = rawValue.trim() === '' ? null : rawValue;
          return;
        }

        if (fieldName === 'priority') {
          draftActionItems[index].priority = rawValue as TaskPriorityValue;
          return;
        }

        if (fieldName === 'status') {
          draftActionItems[index].status = rawValue as TaskStatus;
          return;
        }

        draftActionItems[index][fieldName] = rawValue as never;
      });
    });
  });
}

function renderImportPreview(): void {
  if (draftActionItems.length === 0) {
    safeImportPreview.className = 'import-preview empty-state';
    safeImportPreview.textContent = '暂无待确认任务。';
    return;
  }

  safeImportPreview.className = 'import-preview';
  safeImportPreview.innerHTML = draftActionItems.map(createImportCard).join('');
  bindImportPreviewEvents();
}

function loadSamplePayload(): void {
  safeImportJsonTextarea.value = JSON.stringify(SAMPLE_IMPORT_PAYLOAD, null, 2);
  setImportFeedback('示例数据已载入，可以直接解析预览。');
}

function previewImportPayload(): void {
  try {
    draftActionItems = parseImportPayload(safeImportJsonTextarea.value.trim());
    renderImportPreview();
    setImportFeedback(`已解析 ${draftActionItems.length} 条行动项，请确认后导入。`, 'success');
  } catch (error) {
    draftActionItems = [];
    renderImportPreview();
    const message = error instanceof Error ? error.message : '解析失败';
    setImportFeedback(`解析失败：${message}`, 'error');
  }
}

async function submitImportPayload(): Promise<void> {
  if (draftActionItems.length === 0) {
    setImportFeedback('请先解析并确认行动项。', 'error');
    return;
  }

  safeSubmitImportButton.disabled = true;
  setImportFeedback('正在导入任务，请稍候...');

  try {
    const response = await fetchJson<ImportResponse>('/api/tasks/import-from-action-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: safeMeetingIdInput.value.trim() || null,
        operatorName: safeOperatorNameInput.value.trim() || '蒙亚舟',
        actionItems: draftActionItems,
      }),
    });

    setImportFeedback(`导入成功，共生成 ${response.count} 条任务。`, 'success');
    await loadBoard(response.items[0]?.id ?? selectedTaskId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入失败';
    setImportFeedback(`导入失败：${message}`, 'error');
  } finally {
    safeSubmitImportButton.disabled = false;
  }
}

function renderStats(stats: BoardStats): void {
  const cards = [
    ['全部任务', String(stats.total)],
    ['待办', String(stats.todo)],
    ['进行中', String(stats.doing)],
    ['已完成', String(stats.done)],
    ['即将到期', String(stats.dueSoon)],
    ['已逾期', String(stats.overdue)],
  ];

  safeStatsPanel.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <p class="stat-label">${label}</p>
          <p class="stat-value">${value}</p>
        </article>
      `,
    )
    .join('');
}

function setMemberFeedback(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
  safeMemberFeedback.className = `import-feedback tone-${tone}`;
  safeMemberFeedback.textContent = message;
}

function setMeetingFeedback(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
  safeMeetingFeedback.className = `import-feedback tone-${tone}`;
  safeMeetingFeedback.textContent = message;
}

function degreeTypeLabel(value: Member['degreeType']): string {
  return value === 'phd' ? '博士' : '硕士';
}

function renderMeetingMemberPicker(): void {
  if (latestMembers.length === 0) {
    safeMeetingMemberPicker.className = 'participant-picker empty-state';
    safeMeetingMemberPicker.textContent = '暂无成员，请先创建成员。';
    return;
  }

  safeMeetingMemberPicker.className = 'participant-picker';
  safeMeetingMemberPicker.innerHTML = latestMembers
    .map(
      (member) => `
        <label class="participant-option">
          <input type="checkbox" value="${member.id}" data-create-meeting-member />
          <div>
            <strong>${escapeHtml(member.name)}</strong>
            <span>${escapeHtml(member.grade)} · ${degreeTypeLabel(member.degreeType)}</span>
          </div>
        </label>
      `,
    )
    .join('');
}

function getSelectedCreateMeetingMemberIds(): string[] {
  return Array.from(safeMeetingMemberPicker.querySelectorAll<HTMLInputElement>('[data-create-meeting-member]:checked')).map(
    (input) => input.value,
  );
}

function clearCreateMeetingMemberSelection(): void {
  safeMeetingMemberPicker.querySelectorAll<HTMLInputElement>('[data-create-meeting-member]').forEach((input) => {
    input.checked = false;
  });
}

function createMemberCard(member: Member): string {
  return `
    <article class="resource-item">
      <div class="resource-item-header">
        <div>
          <p class="resource-item-index">成员 ID：${escapeHtml(member.id)}</p>
          <h3>${escapeHtml(member.name)}</h3>
        </div>
        <div class="resource-actions">
          <button class="danger-button" data-delete-member-id="${member.id}">删除成员</button>
        </div>
      </div>
      <div class="resource-meta">
        <div>
          <span>年级</span>
          <strong>${escapeHtml(member.grade)}</strong>
        </div>
        <div>
          <span>培养层次</span>
          <strong>${degreeTypeLabel(member.degreeType)}</strong>
        </div>
      </div>
    </article>
  `;
}

function createMeetingCard(meeting: Meeting): string {
  const selectedIds = new Set(meeting.participants.map((participant) => participant.id));

  return `
    <article class="resource-item">
      <div class="resource-item-header">
        <div>
          <p class="resource-item-index">会议 ID：${escapeHtml(meeting.id)}</p>
          <h3>${escapeHtml(meeting.topic)}</h3>
        </div>
        <div class="resource-actions">
          <button class="danger-button" data-delete-meeting-id="${meeting.id}">删除会议</button>
        </div>
      </div>
      <div class="resource-meta">
        <div>
          <span>会议时间</span>
          <strong>${escapeHtml(meeting.meetingTime)}</strong>
        </div>
        <div>
          <span>会议地点</span>
          <strong>${escapeHtml(meeting.location ?? '未设置')}</strong>
        </div>
      </div>
      <div class="participant-tag-list">
        ${meeting.participants.length > 0
          ? meeting.participants
              .map(
                (participant) => `
                  <div class="participant-tag">
                    <strong>${escapeHtml(participant.name)}</strong>
                    <span>${escapeHtml(participant.grade)} · ${degreeTypeLabel(participant.degreeType)}</span>
                  </div>
                `,
              )
              .join('')
          : '<div class="empty-state">当前会议暂无参会人。</div>'}
      </div>
      <div class="meeting-participants-panel">
        <div class="meeting-participants-header">
          <span>独立维护参会人</span>
          <button class="secondary-button small-button" data-save-meeting-participants="${meeting.id}">保存参会人</button>
        </div>
        <div class="participant-checkbox-grid">
          ${latestMembers.length > 0
            ? latestMembers
                .map(
                  (member) => `
                    <label class="participant-option">
                      <input
                        type="checkbox"
                        value="${member.id}"
                        data-edit-meeting-participant="${meeting.id}"
                        ${selectedIds.has(member.id) ? 'checked' : ''}
                      />
                      <div>
                        <strong>${escapeHtml(member.name)}</strong>
                        <span>${escapeHtml(member.grade)} · ${degreeTypeLabel(member.degreeType)}</span>
                      </div>
                    </label>
                  `,
                )
                .join('')
            : '<div class="empty-state">暂无成员可供选择。</div>'}
        </div>
      </div>
    </article>
  `;
}

function bindMemberEvents(): void {
  safeMemberList.querySelectorAll<HTMLButtonElement>('[data-delete-member-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const memberId = button.dataset.deleteMemberId;

      if (!memberId) {
        return;
      }

      try {
        await fetchJson(`/api/members/${memberId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setMemberFeedback(`成员 ${memberId} 已删除。`, 'success');
        await loadResources();
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除成员失败';
        setMemberFeedback(`删除成员失败：${message}`, 'error');
      }
    });
  });
}

function bindMeetingEvents(): void {
  safeMeetingList.querySelectorAll<HTMLButtonElement>('[data-delete-meeting-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const meetingId = button.dataset.deleteMeetingId;

      if (!meetingId) {
        return;
      }

      try {
        await fetchJson(`/api/meetings/${meetingId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setMeetingFeedback(`会议 ${meetingId} 已删除。`, 'success');
        await loadResources();
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除会议失败';
        setMeetingFeedback(`删除会议失败：${message}`, 'error');
      }
    });
  });

  safeMeetingList.querySelectorAll<HTMLButtonElement>('[data-save-meeting-participants]').forEach((button) => {
    button.addEventListener('click', async () => {
      const meetingId = button.dataset.saveMeetingParticipants;

      if (!meetingId) {
        return;
      }

      const participantIds = Array.from(
        safeMeetingList.querySelectorAll<HTMLInputElement>(`[data-edit-meeting-participant="${meetingId}"]:checked`),
      ).map((input) => input.value);

      try {
        await fetchJson(`/api/meetings/${meetingId}/participants`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ participantIds }),
        });
        setMeetingFeedback(`会议 ${meetingId} 的参会人已更新。`, 'success');
        await loadResources();
      } catch (error) {
        const message = error instanceof Error ? error.message : '更新参会人失败';
        setMeetingFeedback(`更新参会人失败：${message}`, 'error');
      }
    });
  });
}

function renderMembers(): void {
  if (latestMembers.length === 0) {
    safeMemberList.className = 'resource-list empty-state';
    safeMemberList.textContent = '当前没有成员数据。';
    return;
  }

  safeMemberList.className = 'resource-list';
  safeMemberList.innerHTML = latestMembers.map(createMemberCard).join('');
  bindMemberEvents();
}

function renderMeetings(): void {
  if (latestMeetings.length === 0) {
    safeMeetingList.className = 'resource-list empty-state';
    safeMeetingList.textContent = '当前没有会议数据。';
    return;
  }

  safeMeetingList.className = 'resource-list';
  safeMeetingList.innerHTML = latestMeetings.map(createMeetingCard).join('');
  bindMeetingEvents();
}

async function loadResources(): Promise<void> {
  try {
    const [membersResponse, meetingsResponse] = await Promise.all([
      fetchJson<ListResponse<Member>>('/api/members'),
      fetchJson<ListResponse<Meeting>>('/api/meetings'),
    ]);
    latestMembers = membersResponse.items;
    latestMeetings = meetingsResponse.items;
    renderMeetingMemberPicker();
    renderMembers();
    renderMeetings();
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载资源失败';
    safeMemberList.className = 'resource-list empty-state';
    safeMemberList.textContent = `成员加载失败：${message}`;
    safeMeetingList.className = 'resource-list empty-state';
    safeMeetingList.textContent = `会议加载失败：${message}`;
  }
}

async function createMember(): Promise<void> {
  const name = safeMemberNameInput.value.trim();
  const grade = safeMemberGradeInput.value.trim();
  const degreeType = safeMemberDegreeTypeInput.value as Member['degreeType'];

  if (!name || !grade) {
    setMemberFeedback('请填写成员姓名和年级。', 'error');
    return;
  }

  safeCreateMemberButton.disabled = true;

  try {
    await fetchJson<Member>('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, grade, degreeType }),
    });
    safeMemberNameInput.value = '';
    safeMemberGradeInput.value = '';
    safeMemberDegreeTypeInput.value = 'master';
    setMemberFeedback(`成员 ${name} 已创建。`, 'success');
    await loadResources();
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建成员失败';
    setMemberFeedback(`创建成员失败：${message}`, 'error');
  } finally {
    safeCreateMemberButton.disabled = false;
  }
}

async function createMeeting(): Promise<void> {
  const topic = safeMeetingTopicInput.value.trim();
  const meetingTime = safeMeetingTimeInput.value.trim();
  const location = safeMeetingLocationInput.value.trim();
  const participantIds = getSelectedCreateMeetingMemberIds();

  if (!topic || !meetingTime) {
    setMeetingFeedback('请填写会议主题和会议时间。', 'error');
    return;
  }

  safeCreateMeetingButton.disabled = true;

  try {
    await fetchJson<Meeting>('/api/meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        meetingTime,
        location: location || null,
        participantIds,
      }),
    });
    safeMeetingTopicInput.value = '';
    safeMeetingTimeInput.value = '';
    safeMeetingLocationInput.value = '';
    clearCreateMeetingMemberSelection();
    setMeetingFeedback(`会议 ${topic} 已创建。`, 'success');
    await loadResources();
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建会议失败';
    setMeetingFeedback(`创建会议失败：${message}`, 'error');
  } finally {
    safeCreateMeetingButton.disabled = false;
  }
}

function renderOwnerFilter(columns: BoardColumn[]): void {
  const ownerNames = Array.from(
    new Set(
      columns
        .flatMap((column) => column.items)
        .map((task) => task.ownerName)
        .filter((ownerName): ownerName is string => Boolean(ownerName)),
    ),
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'));

  safeOwnerFilter.innerHTML = [
    '<option value="all">全部负责人</option>',
    ...ownerNames.map((ownerName) => `<option value="${escapeHtml(ownerName)}">${escapeHtml(ownerName)}</option>`),
  ].join('');

  safeOwnerFilter.value = ownerNames.includes(boardFilters.ownerName) ? boardFilters.ownerName : 'all';
}

function taskMatchesFilters(task: Task): boolean {
  if (boardFilters.status !== 'all' && task.status !== boardFilters.status) {
    return false;
  }

  if (boardFilters.ownerName !== 'all' && task.ownerName !== boardFilters.ownerName) {
    return false;
  }

  if (boardFilters.risk === 'overdue' && !isOverdue(task)) {
    return false;
  }

  if (boardFilters.risk === 'dueSoon' && !isDueSoon(task)) {
    return false;
  }

  if (boardFilters.risk === 'highPriority' && task.priority !== 'high') {
    return false;
  }

  return true;
}

function filterBoard(board: BoardResponse): BoardResponse {
  const columns = board.columns.map((column) => ({
    ...column,
    items: column.items.filter(taskMatchesFilters),
  }));

  return {
    columns,
    stats: latestBoardStats ?? board.stats,
  };
}

async function renderBoardView(board: BoardResponse, preferredTaskId?: string | null): Promise<void> {
  renderStats(latestBoardStats ?? board.stats);
  renderOwnerFilter(latestBoardData?.columns ?? board.columns);
  renderBoard(board.columns);
  bindBoardEvents(board.columns);

  const allTasks = board.columns.flatMap((column) => column.items);
  const nextSelectedTask = allTasks.find((task) => task.id === (preferredTaskId ?? selectedTaskId)) ?? allTasks[0];

  if (nextSelectedTask) {
    selectedTaskId = nextSelectedTask.id;
    renderBoard(board.columns);
    bindBoardEvents(board.columns);
    await renderTaskDetail(nextSelectedTask);
  } else {
    selectedTaskId = null;
    safeTaskDetail.textContent = '当前筛选条件下没有任务。';
  }
}

async function updateTaskStatus(task: Task, status: TaskStatus): Promise<void> {
  await fetchJson<Task>(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      operatorName: '蒙亚舟',
    }),
  });

  await loadBoard(task.id);
}

function createStatusActions(task: Task): string {
  return ['todo', 'doing', 'done']
    .map((status) => {
      const active = task.status === status;
      return `
        <button class="status-chip ${active ? 'active' : ''}" data-task-id="${task.id}" data-next-status="${status}">
          ${status.toUpperCase()}
        </button>
      `;
    })
    .join('');
}

function renderBoard(columns: BoardColumn[]): void {
  safeBoardColumns.innerHTML = columns
    .map(
      (column) => `
        <section class="board-column">
          <header class="column-header">
            <h3>${column.title}</h3>
            <span>${column.items.length}</span>
          </header>
          <div class="column-body">
            ${
              column.items.length > 0
                ? column.items
                    .map(
                      (task) => `
                        <article class="task-card ${selectedTaskId === task.id ? 'selected' : ''} ${isOverdue(task) ? 'risk-overdue' : ''} ${isDueSoon(task) ? 'risk-due-soon' : ''}" data-task-card-id="${task.id}">
                          <div class="task-card-top">
                            <p class="task-title">${task.title}</p>
                            <div class="task-badge-group">
                              ${taskRiskLabel(task) ? `<span class="risk-badge ${isOverdue(task) ? 'risk-badge-overdue' : 'risk-badge-due-soon'}">${taskRiskLabel(task)}</span>` : ''}
                              <span class="priority-tag priority-${task.priority}">${priorityLabel(task.priority)}</span>
                            </div>
                          </div>
                          <p class="task-meta">负责人：${task.ownerName ?? '待指派'}</p>
                          <p class="task-meta">截止时间：${formatDate(task.dueDate)}</p>
                          <div class="status-actions">
                            ${createStatusActions(task)}
                          </div>
                        </article>
                      `,
                    )
                    .join('')
                : '<div class="column-empty">当前列暂无任务</div>'
            }
          </div>
        </section>
      `,
    )
    .join('');
}

async function renderTaskDetail(task: Task): Promise<void> {
  const taskDetailData = await fetchJson<Task>(`/api/tasks/${task.id}`);
  const activity = await fetchJson<ActivityResponse>(`/api/tasks/${task.id}/activity`);

  safeTaskDetail.innerHTML = `
    <div class="detail-block">
      <h3>${taskDetailData.title}</h3>
      <p>${taskDetailData.description}</p>
    </div>
    <div class="detail-grid">
      <div><span>负责人</span><strong>${taskDetailData.ownerName ?? '待指派'}</strong></div>
      <div><span>截止时间</span><strong>${formatDate(taskDetailData.dueDate)}</strong></div>
      <div><span>优先级</span><strong>${priorityLabel(taskDetailData.priority)}</strong></div>
      <div><span>置信度</span><strong>${taskDetailData.confidence}</strong></div>
    </div>
    <div class="detail-block">
      <h4>验收标准</h4>
      <p>${taskDetailData.acceptanceCriteria ?? '暂无验收标准'}</p>
    </div>
    <div class="detail-block">
      <h4>来源语句</h4>
      <p>${taskDetailData.sourceText}</p>
    </div>
    <div class="detail-block">
      <h4>活动记录</h4>
      <div class="activity-list">
        ${activity.items
          .map(
            (item) => `
              <div class="activity-item">
                <p>${item.actionDetail}</p>
                <span>${item.operatorName} · ${item.createdAt}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function bindBoardEvents(columns: BoardColumn[]): void {
  const allTasks = columns.flatMap((column) => column.items);

  safeBoardColumns.querySelectorAll<HTMLElement>('[data-task-card-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      const taskId = card.dataset.taskCardId;
      const task = allTasks.find((item) => item.id === taskId);

      if (!task) {
        return;
      }

      selectedTaskId = task.id;
      renderBoard(columns);
      bindBoardEvents(columns);
      await renderTaskDetail(task);
    });
  });

  safeBoardColumns.querySelectorAll<HTMLButtonElement>('[data-next-status]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const taskId = button.dataset.taskId;
      const nextStatus = button.dataset.nextStatus as TaskStatus;
      const task = allTasks.find((item) => item.id === taskId);

      if (!task || !nextStatus || task.status === nextStatus) {
        return;
      }

      await updateTaskStatus(task, nextStatus);
    });
  });
}

async function loadBoard(preferredTaskId?: string | null): Promise<void> {
  try {
    const [board, stats] = await Promise.all([
      fetchJson<BoardResponse>('/api/board'),
      fetchJson<BoardStats>('/api/board/stats'),
    ]);
    latestBoardData = board;
    latestBoardStats = stats;
    await renderBoardView(filterBoard(latestBoardData), preferredTaskId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    safeBoardColumns.innerHTML = `<div class="column-empty">加载失败：${message}</div>`;
    safeTaskDetail.textContent = '无法加载任务详情。';
  }
}

safeRefreshButton.addEventListener('click', async () => {
  await loadBoard(selectedTaskId);
  await loadResources();
});

safeStatusFilter.addEventListener('change', async () => {
  boardFilters.status = safeStatusFilter.value as BoardFilters['status'];

  if (latestBoardData) {
    await renderBoardView(filterBoard(latestBoardData), selectedTaskId);
  }
});

safeOwnerFilter.addEventListener('change', async () => {
  boardFilters.ownerName = safeOwnerFilter.value;

  if (latestBoardData) {
    await renderBoardView(filterBoard(latestBoardData), selectedTaskId);
  }
});

safeRiskFilter.addEventListener('change', async () => {
  boardFilters.risk = safeRiskFilter.value as BoardFilters['risk'];

  if (latestBoardData) {
    await renderBoardView(filterBoard(latestBoardData), selectedTaskId);
  }
});

safeResetFiltersButton.addEventListener('click', async () => {
  boardFilters.status = 'all';
  boardFilters.ownerName = 'all';
  boardFilters.risk = 'all';
  safeStatusFilter.value = 'all';
  safeOwnerFilter.value = 'all';
  safeRiskFilter.value = 'all';

  if (latestBoardData) {
    await renderBoardView(filterBoard(latestBoardData), selectedTaskId);
  }
});

safeLoadSampleButton.addEventListener('click', () => {
  loadSamplePayload();
});

safePreviewImportButton.addEventListener('click', () => {
  previewImportPayload();
});

safeSubmitImportButton.addEventListener('click', async () => {
  await submitImportPayload();
});

safeRefreshMembersButton.addEventListener('click', async () => {
  await loadResources();
});

safeRefreshMeetingsButton.addEventListener('click', async () => {
  await loadResources();
});

safeCreateMemberButton.addEventListener('click', async () => {
  await createMember();
});

safeCreateMeetingButton.addEventListener('click', async () => {
  await createMeeting();
});

safeClearMeetingMembersButton.addEventListener('click', () => {
  clearCreateMeetingMemberSelection();
});

loadSamplePayload();
void loadBoard();
void loadResources();