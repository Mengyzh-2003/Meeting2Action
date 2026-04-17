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
// const statusFilter = document.querySelector<HTMLSelectElement>('#status-filter');
const statusDropdownMenu = document.querySelector<HTMLDivElement>('#status-dropdown-menu');
const statusFilterBadge = document.querySelector<HTMLDivElement>('#status-filter-badge');
const statusFilterDot = document.querySelector<HTMLDivElement>('#status-filter-dot');
const statusFilterName = document.querySelector<HTMLSpanElement>('#status-filter-name');

const ownerDropdownMenu = document.querySelector<HTMLDivElement>('#owner-dropdown-menu');
const ownerFilterBadge = document.querySelector<HTMLDivElement>('#owner-filter-badge');
const ownerFilterAvatar = document.querySelector<HTMLDivElement>('#owner-filter-avatar');
const ownerFilterName = document.querySelector<HTMLSpanElement>('#owner-filter-name');
const riskDropdownMenu = document.querySelector<HTMLDivElement>('#risk-dropdown-menu');
const riskFilterBadge = document.querySelector<HTMLDivElement>('#risk-filter-badge');
const riskFilterDot = document.querySelector<HTMLDivElement>('#risk-filter-dot');
const riskFilterName = document.querySelector<HTMLSpanElement>('#risk-filter-name');
// const riskFilter = document.querySelector<HTMLSelectElement>('#risk-filter');
const resetFiltersButton = document.querySelector<HTMLButtonElement>('#reset-filters');
const refreshMembersButton = document.querySelector<HTMLButtonElement>('#refresh-members');
const memberNameInput = document.querySelector<HTMLInputElement>('#member-name-input');
const memberGradeInput = document.querySelector<HTMLInputElement>('#member-grade-input');
const memberDegreeTypeInput = document.querySelector<HTMLSelectElement>('#member-degree-type-input');
const createMemberButton = document.querySelector<HTMLButtonElement>('#create-member');
const memberFeedback = document.querySelector<HTMLDivElement>('#member-feedback');
const memberSearchContainer = document.querySelector<HTMLDivElement>('#member-search-container');
const memberSearchInput = document.querySelector<HTMLInputElement>('#member-search-input');
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
const navUserBadge = document.querySelector<HTMLDivElement>('#nav-user-badge');
const navUserAvatar = document.querySelector<HTMLDivElement>('#nav-user-avatar');
const navUserName = document.querySelector<HTMLSpanElement>('#nav-user-name');
const dropdownUserList = document.querySelector<HTMLDivElement>('#dropdown-user-list');
const userDropdownMenu = document.querySelector<HTMLDivElement>('#user-dropdown-menu');
const dashboardWelcome = document.querySelector<HTMLHeadingElement>('#dashboard-welcome');
const dashboardTodoList = document.querySelector<HTMLDivElement>('#dashboard-todo-list');
const dashboardActivityFeed = document.querySelector<HTMLDivElement>('#dashboard-activity-feed');
const dashboardTaskDetail = document.querySelector<HTMLDivElement>('#dashboard-task-detail');
const dashboardDetailContentBody = document.querySelector<HTMLDivElement>('#dashboard-detail-content-body');

let selectedTaskId: string | null = null;
let selectedDashboardTaskId: string | null = null;
let draftActionItems: ActionItem[] = [];
let latestBoardData: BoardResponse | null = null;
let latestBoardStats: BoardStats | null = null;
let latestMembers: Member[] = [];
let latestMeetings: Meeting[] = [];
let currentUserMemberId: string | null = null;
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
// const safeStatusFilter = assertElement(statusFilter, 'status filter not found');
const safeStatusDropdownMenu = assertElement(statusDropdownMenu, 'status dropdown menu not found');
const safeStatusFilterDot = assertElement(statusFilterDot, 'status filter dot');
const safeStatusFilterName = assertElement(statusFilterName, 'status filter name');

const safeOwnerDropdownMenu = assertElement(ownerDropdownMenu, 'owner dropdown menu not found');
const safeOwnerFilterBadge = assertElement(ownerFilterBadge, 'owner filter badge not found');
const safeOwnerFilterAvatar = assertElement(ownerFilterAvatar, 'owner filter avatar not found');
const safeOwnerFilterName = assertElement(ownerFilterName, 'owner filter name not found');

const safeRiskDropdownMenu = assertElement(riskDropdownMenu, 'risk dropdown');
const safeRiskFilterDot = assertElement(riskFilterDot, 'risk dot');
const safeRiskFilterName = assertElement(riskFilterName, 'risk name');
// const safeRiskFilter = assertElement(riskFilter, 'risk filter not found');
const safeResetFiltersButton = assertElement(resetFiltersButton, 'reset filters button not found');
const safeRefreshMembersButton = assertElement(refreshMembersButton, 'refresh members button not found');
const safeMemberNameInput = assertElement(memberNameInput, 'member name input not found');
const safeMemberGradeInput = assertElement(memberGradeInput, 'member grade input not found');
const safeMemberDegreeTypeInput = assertElement(memberDegreeTypeInput, 'member degree type input not found');
const safeCreateMemberButton = assertElement(createMemberButton, 'create member button not found');
const safeMemberFeedback = assertElement(memberFeedback, 'member feedback not found');
const safeMemberSearchContainer = assertElement(memberSearchContainer, 'member search container');
const safeMemberSearchInput = assertElement(memberSearchInput, 'member search input');
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
const safeNavUserBadge = assertElement(navUserBadge, 'nav user badge not found');
const safeNavUserAvatar = assertElement(navUserAvatar, 'nav user avatar not found');
const safeNavUserName = assertElement(navUserName, 'nav user name not found');
const safeDropdownUserList = assertElement(dropdownUserList, 'dropdown user list not found');
const safeUserDropdownMenu = assertElement(userDropdownMenu, 'user dropdown menu not found');
const safeDashboardWelcome = assertElement(dashboardWelcome, 'dashboard welcome not found');
const safeDashboardTodoList = assertElement(dashboardTodoList, 'dashboard todo list not found');
const safeDashboardActivityFeed = assertElement(dashboardActivityFeed, 'dashboard activity feed not found');
const safeDashboardTaskDetail = assertElement(dashboardTaskDetail, 'dashboard task detail not found');
const safeDashboardDetailContentBody = assertElement(dashboardDetailContentBody, 'dashboard detail content body not found');

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

function getCurrentUserName(): string {
  const member = latestMembers.find((m) => m.id === currentUserMemberId);
  return member?.name ?? (safeOperatorNameInput.value.trim() || '');
}

function renderDashboardTodos(): void {
  const allTasks = latestBoardData ? latestBoardData.columns.flatMap((c) => c.items) : [];
  const userName = getCurrentUserName();
  const myTodos = allTasks.filter((t) => t.ownerName === userName && t.status !== 'done');

  if (myTodos.length === 0) {
    safeDashboardTodoList.innerHTML = '<div class="empty-state" style="padding: 24px;">太棒了！当前没有任何待办任务。</div>';
    return;
  }

  safeDashboardTodoList.innerHTML = myTodos
    .map((task) => {
      let dueBadge = '';
      if (isOverdue(task)) {
        dueBadge = '<span class="due-badge due-today">已逾期</span>';
      } else if (isDueSoon(task)) {
        dueBadge = '<span class="due-badge due-soon">即将截止</span>';
      } else if (task.dueDate) {
        dueBadge = `<span class="due-badge" style="background:var(--bg-body); color:var(--text-muted);">${formatDate(task.dueDate)}</span>`;
      }
      return `
        <div class="urgent-task-item ${selectedDashboardTaskId === task.id ? 'active' : ''}" data-dashboard-task-id="${task.id}">
          <div class="task-main-info">
            <h4>${escapeHtml(task.title)}</h4>
            <p>状态：${task.status.toUpperCase()}</p>
          </div>
          <div class="task-action">
            ${dueBadge}
          </div>
        </div>
      `;
    })
    .join('');

  safeDashboardTodoList.querySelectorAll<HTMLElement>('[data-dashboard-task-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      const taskId = card.dataset.dashboardTaskId;
      if (taskId) {
        await openDashboardTaskDetail(taskId);
      }
    });
  });
}

async function openDashboardTaskDetail(taskId: string): Promise<void> {
  selectedDashboardTaskId = taskId;
  safeDashboardTodoList.querySelectorAll<HTMLElement>('[data-dashboard-task-id]').forEach((c) => {
    c.classList.toggle('active', c.dataset.dashboardTaskId === taskId);
  });

  safeDashboardActivityFeed.style.display = 'none';
  safeDashboardTaskDetail.style.display = 'flex';

  const task = await fetchJson<Task>(`/api/tasks/${taskId}`);

  const currentVal = task.dueDate || new Date().toISOString().split('T')[0];
  const [y, m, d] = currentVal.split('-').map(Number);
  const isDue = isOverdue(task);

  safeDashboardDetailContentBody.innerHTML = `
    <div class="d-section" style="display:flex; gap:24px; align-items:center; flex-wrap:wrap;">
      <div>
        <div class="d-label">负责人</div>
        ${createTaskOwnerDropdownHTML(task)}
      </div>
      <div>
        <div class="d-label">当前状态</div>
        ${createStatusActions(task)}
      </div>
      <div>
        <div class="d-label" style="display:flex; gap:4px; align-items:center;">
           规定截止 <span style="font-size:11px; opacity:0.6; font-weight:normal;">(滚轮调整)</span>
        </div>
        <div class="date-scroll-picker" style="color:${isDue ? 'var(--danger)' : 'inherit'}; margin-top:2px;">
          <span class="date-part year" tabindex="0">${y}</span>/
          <span class="date-part month" tabindex="0">${String(m).padStart(2, '0')}</span>/
          <span class="date-part day" tabindex="0">${String(d).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
    <div class="d-section">
      <div class="d-label">任务描述 & 标题</div>
      <h3 style="font-size:18px; margin-bottom:8px;">${escapeHtml(task.title)}</h3>
      <p style="color:var(--text-muted); margin:0;">${escapeHtml(task.description || '暂无描述')}</p>
    </div>
    <div class="d-section">
      <div class="d-label">验收标准 (Acceptance Criteria)</div>
      <div class="d-box">${escapeHtml(task.acceptanceCriteria ?? '暂无验收标准')}</div>
    </div>
    <div class="d-section">
      <div class="d-label">AI 语义溯源 (置信度 ${task.confidence})</div>
      <div class="d-box">${escapeHtml(task.sourceText || '暂无')}</div>
    </div>
  `;

  safeDashboardDetailContentBody.querySelectorAll<HTMLButtonElement>('[data-next-status]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const nextStatus = button.dataset.nextStatus as TaskStatus;
      if (!nextStatus || task.status === nextStatus) return;
      await updateTaskStatus(task, nextStatus);
      // Re-open the detail view to refresh the content with the new status
      await openDashboardTaskDetail(task.id);
    });
  });

  setupEditableTaskFields(safeDashboardDetailContentBody, task);
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

function getGreetingByHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return '上午好';
  }
  if (hour < 18) {
    return '下午好';
  }
  return '晚上好';
}

function memberGradeLabel(member: Pick<Member, 'degreeType' | 'grade'>): string {
  return `${degreeTypeLabel(member.degreeType)}${member.grade}`;
}

function avatarColorByMemberId(memberId: string): string {
  const palette = ['#5AC8FA', '#34C759', '#5856D6', '#FF9500', '#FF2D55', '#007AFF'];
  const hash = Array.from(memberId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function applyCurrentUser(member: Member): void {
  const gradeLabel = memberGradeLabel(member);
  safeNavUserAvatar.textContent = member.name.slice(0, 1);
  safeNavUserAvatar.style.background = avatarColorByMemberId(member.id);
  safeNavUserAvatar.style.color = '#FFFFFF';
  safeNavUserName.textContent = `${member.name}（${gradeLabel}）`;
  safeDashboardWelcome.textContent = `${getGreetingByHour()}，${member.name}。`;
  safeOperatorNameInput.value = member.name;
}

function renderTeamSwitcher(): void {
  if (latestMembers.length === 0) {
    safeDropdownUserList.innerHTML =
      '<div class="dropdown-header" style="margin: 0; border: none; text-transform: none; letter-spacing: 0;">暂无成员，请先在资源中心添加成员</div>';
    safeNavUserAvatar.textContent = '?';
    safeNavUserAvatar.style.background = '#86868B';
    safeNavUserName.textContent = '暂无成员';
    safeDashboardWelcome.textContent = `${getGreetingByHour()}。`;
    safeOperatorNameInput.value = '';
    currentUserMemberId = null;
    return;
  }

  const currentMember = latestMembers.find((member) => member.id === currentUserMemberId) ?? latestMembers[0];
  currentUserMemberId = currentMember.id;
  applyCurrentUser(currentMember);

  safeDropdownUserList.innerHTML = latestMembers
    .map((member) => {
      const isActive = member.id === currentUserMemberId;
      const color = avatarColorByMemberId(member.id);
      return `
        <div class="dropdown-item ${isActive ? 'active' : ''}" data-user-member-id="${escapeHtml(member.id)}">
          <div class="user-avatar" style="background:${color};color:#FFFFFF;">${escapeHtml(member.name.slice(0, 1))}</div>
          ${escapeHtml(member.name)}（${escapeHtml(memberGradeLabel(member))}）
        </div>
      `;
    })
    .join('');
}

function bindTeamSwitcherEvents(): void {
  safeDropdownUserList.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-user-member-id]');
    if (!item) {
      return;
    }

    const memberId = item.dataset.userMemberId;
    if (!memberId) {
      return;
    }

    const targetMember = latestMembers.find((member) => member.id === memberId);
    if (!targetMember) {
      return;
    }

    currentUserMemberId = targetMember.id;
    renderTeamSwitcher();
    renderDashboardTodos();
    safeUserDropdownMenu.classList.remove('open');
    safeNavUserBadge.classList.remove('open');
  });
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

function renderMembers(searchText: string = ''): void {
  const filteredMembers = latestMembers.filter(m => 
    m.name.toLowerCase().includes(searchText.toLowerCase()) || 
    m.grade.toLowerCase().includes(searchText.toLowerCase())
  );

  if (latestMembers.length === 0) {
    safeMemberSearchContainer.style.display = 'none';
    safeMemberList.className = 'resource-list empty-state';
    safeMemberList.textContent = '当前没有成员数据。';
    return;
  }

  safeMemberSearchContainer.style.display = 'block';

  if (filteredMembers.length === 0) {
    safeMemberList.className = 'resource-list empty-state';
    safeMemberList.textContent = '没有找到匹配的成员。';
    return;
  }

  safeMemberList.className = 'resource-list';
  
  let tableHTML = `
    <div style="background:var(--bg-body); border-radius:12px; border:1px solid var(--border-light); overflow-y:auto; max-height:380px;">
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:14px;">
        <thead style="background:var(--bg-card); position:sticky; top:0; z-index:10; box-shadow:0 1px 0 var(--border-light);">
          <tr>
            <th style="padding:12px 16px; font-weight:600; color:var(--text-muted); background:var(--bg-card);">姓名</th>
            <th style="padding:12px 16px; font-weight:600; color:var(--text-muted); background:var(--bg-card);">年级</th>
            <th style="padding:12px 16px; font-weight:600; color:var(--text-muted); background:var(--bg-card);">培养层次</th>
            <th style="padding:12px 16px; font-weight:600; color:var(--text-muted); text-align:right; background:var(--bg-card);">操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  [...filteredMembers].sort((a,b) => a.name.localeCompare(b.name, 'zh-CN')).forEach(member => {
    tableHTML += `
          <tr style="border-bottom:1px solid var(--border-light); transition:0.2s;">
            <td style="padding:12px 16px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:50%; background:${avatarColorByMemberId(member.id)}; color:white; display:flex; justify-content:center; align-items:center; font-size:12px; font-weight:bold;">
                  ${escapeHtml(member.name.charAt(0))}
                </div>
                <span style="font-weight:500;">${escapeHtml(member.name)}</span>
              </div>
            </td>
            <td style="padding:12px 16px; color:var(--text-main);">${escapeHtml(member.grade)}</td>
            <td style="padding:12px 16px; color:var(--text-main);">${degreeTypeLabel(member.degreeType)}</td>
            <td style="padding:12px 16px; text-align:right;">
              <button class="apple-secondary-btn small-btn" style="color:var(--danger); border-color:transparent; background:transparent;" data-delete-member-id="${member.id}" onmouseover="this.style.background='var(--danger-soft)'" onmouseout="this.style.background='transparent'">删除</button>
            </td>
          </tr>
    `;
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  safeMemberList.innerHTML = tableHTML;
  bindMemberEvents();

  if (safeMemberSearchInput.getAttribute('data-bound') !== 'true') {
    safeMemberSearchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      renderMembers(target.value);
    });
    safeMemberSearchInput.setAttribute('data-bound', 'true');
  }
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
    renderTeamSwitcher();
    renderMeetingMemberPicker();
    renderStatusFilter();
    renderRiskFilter();
    renderOwnerFilter();
    renderMembers(safeMemberSearchInput.value.trim());
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

  if (latestMembers.some(m => m.name === name)) {
    setMemberFeedback(`成员 ${name} 已存在，请勿重复添加。`, 'error');
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

function renderStatusFilter(): void {
  const currentStatus = boardFilters.status;
  const statusLabels: Record<string, string> = {
    all: '所有状态',
    todo: 'To Do',
    doing: 'Doing',
    done: 'Done'
  };
  const statusColors: Record<string, string> = {
    all: '#86868B',
    todo: 'var(--text-muted)',
    doing: '#007AFF',
    done: '#34C759'
  };

  safeStatusFilterName.textContent = statusLabels[currentStatus] || '所有状态';
  safeStatusFilterDot.style.background = statusColors[currentStatus] || '#86868B';

  let dropHTML = '';
  ['all', 'todo', 'doing', 'done'].forEach((st) => {
    const isActive = currentStatus === st ? 'active' : '';
    dropHTML += `
      <div class="dropdown-item ${isActive}" data-val="${st}">
        <div style="width:10px;height:10px;border-radius:50%;background:${statusColors[st]};margin-right:8px;"></div>
        ${statusLabels[st]}
      </div>
    `;
  });
  safeStatusDropdownMenu.innerHTML = dropHTML;

  safeStatusDropdownMenu.querySelectorAll<HTMLElement>('.dropdown-item').forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const val = item.dataset.val as BoardFilters['status'];
      if (val) {
        boardFilters.status = val;
        safeStatusDropdownMenu.classList.remove('open');
        renderStatusFilter();
        if (latestBoardData) {
          await renderBoardView(filterBoard(latestBoardData));
        }
      }
    });
  });
}

function renderRiskFilter(): void {
  const currentRisk = boardFilters.risk;
  const riskLabels: Record<string, string> = {
    all: '所有风险',
    overdue: '逾期',
    dueSoon: '即将逾期',
    highPriority: '高风险'
  };
  const riskColors: Record<string, string> = {
    all: '#86868B',
    overdue: '#FF3B30',
    dueSoon: '#FF9500',
    highPriority: '#FF2D55'
  };

  safeRiskFilterName.textContent = riskLabels[currentRisk] || '所有风险';
  safeRiskFilterDot.style.background = riskColors[currentRisk] || '#86868B';

  let dropHTML = '';
  ['all', 'overdue', 'dueSoon', 'highPriority'].forEach((r) => {
    const isActive = currentRisk === r ? 'active' : '';
    dropHTML += `
      <div class="dropdown-item ${isActive}" data-val="${r}">
        <div style="width:10px;height:10px;border-radius:50%;background:${riskColors[r]};margin-right:8px;"></div>
        ${riskLabels[r]}
      </div>
    `;
  });
  safeRiskDropdownMenu.innerHTML = dropHTML;

  safeRiskDropdownMenu.querySelectorAll<HTMLElement>('.dropdown-item').forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const val = item.dataset.val as BoardFilters['risk'];
      if (val) {
        boardFilters.risk = val;
        safeRiskDropdownMenu.classList.remove('open');
        renderRiskFilter();
        if (latestBoardData) {
          await renderBoardView(filterBoard(latestBoardData));
        }
      }
    });
  });
}

function renderOwnerFilter(): void {
  const currentOwner = boardFilters.ownerName;
  
  if (currentOwner === 'all') {
    safeOwnerFilterName.textContent = '负责人';
    safeOwnerFilterAvatar.textContent = '全';
    safeOwnerFilterAvatar.style.background = '#86868B';
  } else {
    const member = latestMembers.find(m => m.name === currentOwner);
    safeOwnerFilterName.textContent = currentOwner;
    safeOwnerFilterAvatar.textContent = currentOwner.charAt(0);
    safeOwnerFilterAvatar.style.background = member ? avatarColorByMemberId(member.id) : '#86868B';
  }

  const allItemActive = currentOwner === 'all' ? 'active' : '';
  let dropHTML = `
    <div class="dropdown-item ${allItemActive}" data-owner-value="all">
      <div class="user-avatar" style="background:#86868B; color:white; width:24px; height:24px; font-size:12px;">全</div>
      负责人
    </div>
  `;

  [...latestMembers].sort((a,b) => a.name.localeCompare(b.name, 'zh-CN')).forEach((member) => {
    const isActive = currentOwner === member.name ? 'active' : '';
    const avatarColor = avatarColorByMemberId(member.id);
    dropHTML += `
      <div class="dropdown-item ${isActive}" data-owner-value="${escapeHtml(member.name)}">
        <div class="user-avatar" style="background:${avatarColor}; color:white; width:24px; height:24px; font-size:12px;">
          ${escapeHtml(member.name.charAt(0))}
        </div>
        ${escapeHtml(member.name)}
      </div>
    `;
  });

  safeOwnerDropdownMenu.innerHTML = dropHTML;

  safeOwnerDropdownMenu.querySelectorAll<HTMLElement>('.dropdown-item').forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const val = item.dataset.ownerValue;
      if (val) {
        boardFilters.ownerName = val;
        safeOwnerDropdownMenu.classList.remove('open');
        renderOwnerFilter();
        if (latestBoardData) {
          await renderBoardView(filterBoard(latestBoardData));
        }
      }
    });
  });
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
  renderOwnerFilter();
  renderBoard(board.columns);
  renderDashboardTodos();

  const allTasks = board.columns.flatMap((column) => column.items);
  const nextSelectedTask = allTasks.find((task) => task.id === (preferredTaskId ?? selectedTaskId)) ?? allTasks[0];

  if (nextSelectedTask) {
    selectedTaskId = nextSelectedTask.id;
    renderBoard(board.columns); // Re-render to apply selection style
    await renderTaskDetail(nextSelectedTask);
  } else {
    selectedTaskId = null;
    safeTaskDetail.innerHTML = '<div class="empty-state">当前筛选条件下没有任务。</div>';
  }

  // Always bind events after all rendering is complete
  bindBoardEvents(board.columns);
}

async function updateTaskStatus(task: Task, status: TaskStatus): Promise<void> {
  await fetchJson<Task>(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      operatorName: safeOperatorNameInput.value.trim() || '系统操作',
    }),
  });

  await loadBoard(task.id);
}

function createTaskOwnerDropdownHTML(task: Task): string {
  const currentOwner = task.ownerName;
  const member = currentOwner ? latestMembers.find(m => m.name === currentOwner) : null;
  const avatarTxt = currentOwner ? currentOwner.charAt(0) : '?';
  const avatarBg = member ? avatarColorByMemberId(member.id) : 'var(--text-muted)';
  const displayName = currentOwner || '待指派';

  let itemsHTML = `
    <div class="dropdown-item ${!currentOwner ? 'active' : ''}" data-task-owner-val="">
      <div class="user-avatar" style="background:var(--text-muted); color:white; width:24px; height:24px; font-size:12px;">?</div>
      待指派
    </div>
  `;

  [...latestMembers].sort((a,b) => a.name.localeCompare(b.name, 'zh-CN')).forEach((m) => {
    const isActive = currentOwner === m.name ? 'active' : '';
    const color = avatarColorByMemberId(m.id);
    itemsHTML += `
      <div class="dropdown-item ${isActive}" data-task-owner-val="${escapeHtml(m.name)}">
         <div class="user-avatar" style="background:${color}; color:white; width:24px; height:24px; font-size:12px;">
           ${escapeHtml(m.name.charAt(0))}
         </div>
         ${escapeHtml(m.name)}
      </div>
    `;
  });

  return `
    <div class="user-menu-container task-owner-inline-container" style="position:relative; z-index: 1000;">
      <div class="current-user-badge task-owner-badge" style="height:32px; box-sizing:border-box; padding: 0 12px 0 8px; border-radius: 8px; border: 1px solid var(--border-light); background: transparent; white-space: nowrap; display: flex; align-items: center; justify-content: space-between; z-index: 1001;" onclick="event.stopPropagation(); document.querySelectorAll('.user-dropdown').forEach(el => {if (el !== this.nextElementSibling) el.classList.remove('open')}); this.nextElementSibling.classList.toggle('open');">
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="user-avatar" style="background:${avatarBg};color:white;width:20px;height:20px;font-size:10px;flex-shrink:0;">${escapeHtml(avatarTxt)}</div>
          <span style="font-weight: 600; font-size: 15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: var(--text-main);">${escapeHtml(displayName)}</span>
        </div>
        <span class="dropdown-icon" style="margin-left: 4px; flex-shrink:0;">▼</span>
      </div>
      <div class="user-dropdown" style="width: 200px; padding: 4px; left: 0; right: auto; top: calc(100% + 8px); z-index: 9999;">
        ${itemsHTML}
      </div>
    </div>
  `;
}

function createStatusActions(task: Task): string {
  return '<div class="status-pill-group">' +
    ['todo', 'doing', 'done']
      .map((status) => {
        const active = task.status === status;
        const label = status === 'todo' ? 'To Do' : status === 'doing' ? 'Doing' : 'Done';
        return `<button class="status-pill-btn ${status} ${active ? 'active' : ''}" data-task-id="${task.id}" data-next-status="${status}">${label}</button>`;
      })
      .join('') +
    '</div>';
}
function renderBoard(columns: BoardColumn[]): void {
  safeBoardColumns.innerHTML = columns
    .map(
      (column) => `
        <section class="board-col">
          <header class="col-header">
            <span>${column.title}</span>
            <span style="background:var(--border-hard); padding:2px 8px; border-radius:10px; color:white; font-size:12px;">${column.items.length}</span>
          </header>
          <div class="task-list">
            ${
              column.items.length > 0
                ? column.items
                    .map(
                      (task) => `
                        <article class="task-card ${selectedTaskId === task.id ? 'selected' : ''} ${isOverdue(task) ? 'high-risk' : ''}" data-task-card-id="${task.id}">
                          <h4 class="t-title">${task.title}</h4>
                          <div class="t-footer">
                            <div class="t-meta">
                              ${isOverdue(task) ? `<span style="color:var(--danger); font-weight:600;">已逾期</span>` : formatDate(task.dueDate)}
                            </div>
                            <div class="t-avatar" style="background:var(--accent-soft); color:var(--accent); border-radius:50%; display:flex; align-items:center; justify-content:center; width:20px; height:20px; font-size:10px; font-weight:bold;">
                              ${task.ownerName ? task.ownerName.charAt(0) : '?'}
                            </div>
                          </div>
                        </article>
                      `
                    )
                    .join('')
                : '<div class="column-empty" style="padding:10px; font-size:13px; color:var(--text-muted); text-align:center;">当前列暂无任务</div>'
            }
          </div>
        </section>
      `
    )
    .join('');
}

function setupEditableTaskFields(container: HTMLElement, task: Task): void {
  const taskOwnerContainer = container.querySelector('.task-owner-inline-container');
  if (taskOwnerContainer) {
    const dropdownItems = taskOwnerContainer.querySelectorAll<HTMLElement>('.dropdown-item');
    dropdownItems.forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const value = item.dataset.taskOwnerVal || null;
        
        await fetchJson<Task>(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerName: value }),
        });
        
        const dropdownMenu = taskOwnerContainer.querySelector('.user-dropdown');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
        
        await loadBoard(task.id);
        
        // Re-render task detail view directly where appropriate
        if (container.id === 'task-detail' || container.closest('#task-detail')) {
          await renderTaskDetail(task); // but we only have `task`, let's just trigger loadBoard which does it nicely or we can refresh by other means... wait, loadBoard will maintain selection
        } else {
          await openDashboardTaskDetail(task.id);
        }
      });
    });
  }

  const yearEl = container.querySelector('.date-part.year');
  const monthEl = container.querySelector('.date-part.month');
  const dayEl = container.querySelector('.date-part.day');
  
  if (!yearEl || !monthEl || !dayEl) return;

  const currentVal = task.dueDate || new Date().toISOString().split('T')[0];
  let [y, m, d] = currentVal.split('-').map(Number);
  let debounceTimer: ReturnType<typeof setTimeout>;

  const updateDate = () => {
    const maxDays = new Date(y, m, 0).getDate();
    if (d > maxDays) d = maxDays;
    
    const newDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    yearEl.textContent = String(y);
    monthEl.textContent = String(m).padStart(2, '0');
    dayEl.textContent = String(d).padStart(2, '0');

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await fetchJson<Task>(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDateStr }),
      });
      await loadBoard(task.id);
      renderDashboardTodos();
    }, 600);
  };

  const handleWheel = (el: Element, type: 'y'|'m'|'d') => {
    el.addEventListener('wheel', (e: Event) => {
      const wheelEvent = e as WheelEvent;
      wheelEvent.preventDefault();
      const delta = Math.sign(wheelEvent.deltaY) > 0 ? -1 : 1;
      if (type === 'y') y += delta;
      if (type === 'm') {
        m += delta;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
      }
      if (type === 'd') {
        d += delta;
        const maxDays = new Date(y, m, 0).getDate();
        if (d > maxDays) { d = 1; m++; if(m>12){m=1;y++;} }
        if (d < 1) { m--; if(m<1){m=12;y--;}; d = new Date(y, m, 0).getDate(); }
      }
      updateDate();
    });
  };

  handleWheel(yearEl, 'y');
  handleWheel(monthEl, 'm');
  handleWheel(dayEl, 'd');
}

async function renderTaskDetail(task: Task): Promise<void> {
  const taskDetailData = await fetchJson<Task>(`/api/tasks/${task.id}`);

  const currentVal = taskDetailData.dueDate || new Date().toISOString().split('T')[0];
  const [y, m, d] = currentVal.split('-').map(Number);
  const isDue = isOverdue(taskDetailData);

  safeTaskDetail.innerHTML = `
    <div class="d-section">
      <div class="d-box" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div>
          <div class="d-label">负责人</div>
          ${createTaskOwnerDropdownHTML(taskDetailData)}
        </div>
        <div>
          <div class="d-label">当前状态</div>
          ${createStatusActions(taskDetailData)}
        </div>
        <div>
          <div class="d-label" style="display:flex; gap:4px; align-items:center;">
             规定截止 <span style="font-size:11px; opacity:0.6; font-weight:normal;">(滚轮调整)</span>
          </div>
          <div class="date-scroll-picker" style="color:${isDue ? 'var(--danger)' : 'inherit'}; margin-top:2px;">
            <span class="date-part year" tabindex="0">${y}</span>/
            <span class="date-part month" tabindex="0">${String(m).padStart(2, '0')}</span>/
            <span class="date-part day" tabindex="0">${String(d).padStart(2, '0')}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="d-section">
      <div class="d-label">任务描述 & 标题</div>
      <h3 style="font-size:18px; margin-bottom:8px;">${taskDetailData.title}</h3>
      <p style="color:var(--text-muted); margin:0;">${taskDetailData.description || '暂无描述'}</p>
    </div>
    <div class="d-section">
      <div class="d-label">验收标准 (Acceptance Criteria)</div>
      <div class="d-box">${taskDetailData.acceptanceCriteria ?? '暂无验收标准'}</div>
    </div>
    <div class="d-section">
      <div class="d-label">来源语句</div>
      <div class="d-box">${taskDetailData.sourceText || '暂无'}</div>
    </div>
  `;

  safeTaskDetail.querySelectorAll<HTMLButtonElement>('[data-next-status]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const nextStatus = button.dataset.nextStatus as TaskStatus;
      if (!nextStatus || taskDetailData.status === nextStatus) return;
      await updateTaskStatus(taskDetailData, nextStatus);
    });
  });

  setupEditableTaskFields(safeTaskDetail, taskDetailData);
}
function bindBoardEvents(columns: BoardColumn[]): void {
  const allTasks = columns.flatMap((column) => column.items);

  safeBoardColumns.querySelectorAll<HTMLElement>('[data-task-card-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      const taskId = card.dataset.taskCardId;
      if (!taskId) return;

      const task = allTasks.find((item) => item.id === taskId);
      if (!task) return;

      selectedTaskId = task.id;
      
      // Select the exact card without re-rendering the board to preserve events
      safeBoardColumns.querySelectorAll<HTMLElement>('[data-task-card-id]').forEach((c) => {
        c.classList.toggle('selected', c.dataset.taskCardId === taskId);
      });

      await renderTaskDetail(task);
      const safeTaskDrawer = document.getElementById('task-drawer');
      if (safeTaskDrawer) {
        safeTaskDrawer.classList.add('open');
      }
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

// safeStatusFilter.addEventListener('change', async () => {
//   boardFilters.status = safeStatusFilter.value as BoardFilters['status'];
//
//   if (latestBoardData) {
//     await renderBoardView(filterBoard(latestBoardData), selectedTaskId);
//   }
// });

// safeRiskFilter.addEventListener('change', async () => {
//   boardFilters.risk = safeRiskFilter.value as BoardFilters['risk'];
//
//   if (latestBoardData) {
//     await renderBoardView(filterBoard(latestBoardData), selectedTaskId);
//   }
// });

safeResetFiltersButton.addEventListener('click', async () => {
  boardFilters.status = 'all';
  boardFilters.ownerName = 'all';
  boardFilters.risk = 'all';
  // safeStatusFilter.value = 'all';
  // safeRiskFilter.value = 'all';
  renderStatusFilter();
  renderRiskFilter();
  renderOwnerFilter();

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

bindTeamSwitcherEvents();
loadSamplePayload();
void loadBoard();
void loadResources();