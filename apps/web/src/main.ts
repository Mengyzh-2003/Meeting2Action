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
  ownerMemberId: string | null;
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

interface MeetingIntake {
  id: string;
  meetingId: string | null;
  operatorName: string;
  sourceType: 'text' | 'file';
  sourceName: string | null;
  sourceContent: string;
  normalizedContent: string;
  parserMode: 'auto' | 'heuristic' | 'llm';
  parserEngine: string;
  status: 'parsed' | 'failed' | 'imported';
  summary: string | null;
  actionItems: ActionItem[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  parsedAt: string | null;
  importedAt: string | null;
}

interface ParseMeetingResponse {
  intake: MeetingIntake;
  payload: ActionItemsPayload;
}

interface PublicMember {
  id: string;
  name: string;
  studentId: string;
  degreeType: 'master' | 'phd';
  createdAt: string;
  updatedAt: string;
}

type Member = PublicMember;

interface CreatedMember extends PublicMember {
  initialPassword: string;
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
  studentId: string;
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

interface MemberStatusResponse {
  hasMembers: boolean;
  count: number;
}

interface TaskListResponse extends ListResponse<Task> {
  total: number;
  page: number;
  pageSize: number;
}

interface AuthSessionResponse {
  token: string;
  member: PublicMember;
  createdAt: string;
  expiresAt: string;
}

type TaskSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'title' | 'priority' | 'status';

interface TaskQueryState {
  keyword: string;
  sortBy: TaskSortField;
  sortOrder: 'asc' | 'desc';
}

const API_BASE_URL = 'http://127.0.0.1:3001';
const AUTH_STORAGE_KEY = 'meeting2action.authToken';
const SAMPLE_MEETING_NOTE = `会议主题：多模态目标检测项目周例会

导师：下周之前先把 Transformer 基线和 ResNet 基线的对比实验跑完，结果整理成表格。
小王负责清洗新增的夜间场景数据，这周五前给我一个可用的数据集版本。
蒙亚舟需要把前端导入链路整理一下，补充上传文本文件和解析预览的交互说明。
马璐阳跟进后端接口，把会议原文和行动项解析记录落库，周一同步联调结果。
如果时间允许，再补一版答辩汇报 PPT，把项目定位和功能矩阵说清楚。`;

const statsPanel = document.querySelector<HTMLDivElement>('#stats-panel');
const boardColumns = document.querySelector<HTMLDivElement>('#board-columns');
const taskDetail = document.querySelector<HTMLDivElement>('#task-detail');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh-board');
const taskSearchInput = document.querySelector<HTMLInputElement>('#task-search-input');
const taskSortInput = document.querySelector<HTMLSelectElement>('#task-sort-input');
const toggleTaskCreateButton = document.querySelector<HTMLButtonElement>('#toggle-task-create');
const taskCreatePanel = document.querySelector<HTMLElement>('#task-create-panel');
const taskCreateTitleInput = document.querySelector<HTMLInputElement>('#task-create-title');
const taskCreateDescriptionInput = document.querySelector<HTMLTextAreaElement>('#task-create-description');
const taskCreateOwnerInput = document.querySelector<HTMLSelectElement>('#task-create-owner');
const taskCreateDueDateInput = document.querySelector<HTMLInputElement>('#task-create-due-date');
const taskCreatePriorityInput = document.querySelector<HTMLSelectElement>('#task-create-priority');
const createTaskButton = document.querySelector<HTMLButtonElement>('#create-task');
const taskCreateFeedback = document.querySelector<HTMLDivElement>('#task-create-feedback');
const loadSampleButton = document.querySelector<HTMLButtonElement>('#load-sample');
const previewImportButton = document.querySelector<HTMLButtonElement>('#preview-import');
const submitImportButton = document.querySelector<HTMLButtonElement>('#submit-import');
const importJsonTextarea = document.querySelector<HTMLTextAreaElement>('#import-json');
const importPreview = document.querySelector<HTMLDivElement>('#import-preview');
const importFeedback = document.querySelector<HTMLDivElement>('#import-feedback');
const meetingIdInput = document.querySelector<HTMLInputElement>('#meeting-id-input');
const operatorNameInput = document.querySelector<HTMLInputElement>('#operator-name-input');
const parserModeInput = document.querySelector<HTMLSelectElement>('#parser-mode-input');
const sourceFileInput = document.querySelector<HTMLInputElement>('#source-file-input');
const sourceFileName = document.querySelector<HTMLSpanElement>('#source-file-name');
const intakeHistory = document.querySelector<HTMLDivElement>('#intake-history');
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
const memberStudentIdInput = document.querySelector<HTMLInputElement>('#member-student-id-input');
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
const authGate = document.querySelector<HTMLDivElement>('#auth-gate');
const authModeLabel = document.querySelector<HTMLSpanElement>('#auth-mode-label');
const authTitle = document.querySelector<HTMLHeadingElement>('#auth-title');
const authFeedback = document.querySelector<HTMLDivElement>('#auth-feedback');
const authLoginForm = document.querySelector<HTMLFormElement>('#auth-login-form');
const authStudentIdInput = document.querySelector<HTMLInputElement>('#auth-student-id-input');
const authPasswordInput = document.querySelector<HTMLInputElement>('#auth-password-input');
const authPasswordToggle = document.querySelector<HTMLButtonElement>('#auth-password-toggle');
const authLoginButton = document.querySelector<HTMLButtonElement>('#auth-login-button');
const authEmptyState = document.querySelector<HTMLDivElement>('#auth-empty-state');
const firstMemberForm = document.querySelector<HTMLFormElement>('#first-member-form');
const firstMemberNameInput = document.querySelector<HTMLInputElement>('#first-member-name-input');
const firstMemberStudentIdInput = document.querySelector<HTMLInputElement>('#first-member-student-id-input');
const firstMemberDegreeTypeInput = document.querySelector<HTMLSelectElement>('#first-member-degree-type-input');
const createFirstMemberButton = document.querySelector<HTMLButtonElement>('#create-first-member-button');
const firstMemberFeedback = document.querySelector<HTMLDivElement>('#first-member-feedback');

let selectedTaskId: string | null = null;
let selectedDashboardTaskId: string | null = null;
let draftActionItems: ActionItem[] = [];
let draftSummary = '';
let draftParserEngine = '';
let currentParsedIntakeId: string | null = null;
let latestBoardData: BoardResponse | null = null;
let latestBoardStats: BoardStats | null = null;
let latestWorkspaceBoardData: BoardResponse | null = null;
let latestMembers: Member[] = [];
let latestMeetings: Meeting[] = [];
let latestIntakes: MeetingIntake[] = [];
let currentUserMemberId: string | null = null;
let authToken: string | null = null;
let hasInitializedMembers = false;
let taskSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const boardFilters: BoardFilters = {
  status: 'all',
  ownerName: 'all',
  risk: 'all',
};
const taskQueryState: TaskQueryState = {
  keyword: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
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
const safeTaskSearchInput = assertElement(taskSearchInput, 'task search input not found');
const safeTaskSortInput = assertElement(taskSortInput, 'task sort input not found');
const safeToggleTaskCreateButton = assertElement(toggleTaskCreateButton, 'toggle task create button not found');
const safeTaskCreatePanel = assertElement(taskCreatePanel, 'task create panel not found');
const safeTaskCreateTitleInput = assertElement(taskCreateTitleInput, 'task create title input not found');
const safeTaskCreateDescriptionInput = assertElement(taskCreateDescriptionInput, 'task create description input not found');
const safeTaskCreateOwnerInput = assertElement(taskCreateOwnerInput, 'task create owner input not found');
const safeTaskCreateDueDateInput = assertElement(taskCreateDueDateInput, 'task create due date input not found');
const safeTaskCreatePriorityInput = assertElement(taskCreatePriorityInput, 'task create priority input not found');
const safeCreateTaskButton = assertElement(createTaskButton, 'create task button not found');
const safeTaskCreateFeedback = assertElement(taskCreateFeedback, 'task create feedback not found');
const safeLoadSampleButton = assertElement(loadSampleButton, 'load sample button not found');
const safePreviewImportButton = assertElement(previewImportButton, 'preview import button not found');
const safeSubmitImportButton = assertElement(submitImportButton, 'submit import button not found');
const safeImportJsonTextarea = assertElement(importJsonTextarea, 'import json textarea not found');
const safeImportPreview = assertElement(importPreview, 'import preview not found');
const safeImportFeedback = assertElement(importFeedback, 'import feedback not found');
const safeMeetingIdInput = assertElement(meetingIdInput, 'meeting id input not found');
const safeOperatorNameInput = assertElement(operatorNameInput, 'operator name input not found');
const safeParserModeInput = assertElement(parserModeInput, 'parser mode input not found');
const safeSourceFileInput = assertElement(sourceFileInput, 'source file input not found');
const safeSourceFileName = assertElement(sourceFileName, 'source file name not found');
const safeIntakeHistory = assertElement(intakeHistory, 'intake history not found');
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
const safeMemberStudentIdInput = assertElement(memberStudentIdInput, 'member student id input not found');
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
const safeAuthGate = assertElement(authGate, 'auth gate not found');
const safeAuthModeLabel = assertElement(authModeLabel, 'auth mode label not found');
const safeAuthTitle = assertElement(authTitle, 'auth title not found');
const safeAuthFeedback = assertElement(authFeedback, 'auth feedback not found');
const safeAuthLoginForm = assertElement(authLoginForm, 'auth login form not found');
const safeAuthStudentIdInput = assertElement(authStudentIdInput, 'auth student id input not found');
const safeAuthPasswordInput = assertElement(authPasswordInput, 'auth password input not found');
const safeAuthPasswordToggle = assertElement(authPasswordToggle, 'auth password toggle not found');
const safeAuthLoginButton = assertElement(authLoginButton, 'auth login button not found');
const safeAuthEmptyState = assertElement(authEmptyState, 'auth empty state not found');
const safeFirstMemberForm = assertElement(firstMemberForm, 'first member form not found');
const safeFirstMemberNameInput = assertElement(firstMemberNameInput, 'first member name input not found');
const safeFirstMemberStudentIdInput = assertElement(firstMemberStudentIdInput, 'first member student id input not found');
const safeFirstMemberDegreeTypeInput = assertElement(firstMemberDegreeTypeInput, 'first member degree input not found');
const safeCreateFirstMemberButton = assertElement(createFirstMemberButton, 'create first member button not found');
const safeFirstMemberFeedback = assertElement(firstMemberFeedback, 'first member feedback not found');

function escapeHtml(value: unknown): string {
  return String(value ?? '')
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

function buildBoardStatsFromTasks(tasks: Task[]): BoardStats {
  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'todo').length,
    doing: tasks.filter((task) => task.status === 'doing').length,
    done: tasks.filter((task) => task.status === 'done').length,
    overdue: tasks.filter(isOverdue).length,
    dueSoon: tasks.filter((task) => isDueSoon(task) && !isOverdue(task)).length,
  };
}

function buildBoardFromTasks(tasks: Task[]): BoardResponse {
  return {
    columns: [
      { status: 'todo', title: 'To Do', items: tasks.filter((task) => task.status === 'todo') },
      { status: 'doing', title: 'Doing', items: tasks.filter((task) => task.status === 'doing') },
      { status: 'done', title: 'Done', items: tasks.filter((task) => task.status === 'done') },
    ],
    stats: buildBoardStatsFromTasks(tasks),
  };
}

function buildTaskQueryPath(): string {
  const params = new URLSearchParams();

  if (taskQueryState.keyword.trim()) {
    params.set('keyword', taskQueryState.keyword.trim());
  }

  params.set('sortBy', taskQueryState.sortBy);
  params.set('sortOrder', taskQueryState.sortOrder);
  params.set('page', '1');
  params.set('pageSize', '100');

  return `/api/tasks?${params.toString()}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const payload = await response.json() as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Ignore non-JSON error responses.
    }

    if (response.status === 401) {
      clearAuthSession();
      renderTeamSwitcher();
      renderDashboardTodos();
      renderAuthGate();
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function saveAuthToken(token: string): void {
  authToken = token;
  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

function clearAuthSession(): void {
  authToken = null;
  currentUserMemberId = null;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function returnToLoginGate(): void {
  document.querySelectorAll<HTMLElement>('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === 'view-dashboard');
  });
  document.querySelectorAll<HTMLElement>('.view-container').forEach((view) => {
    view.classList.toggle('active', view.id === 'view-dashboard');
  });
  document.querySelectorAll<HTMLElement>('.user-dropdown').forEach((dropdown) => {
    dropdown.classList.remove('open');
  });
  document.querySelectorAll<HTMLElement>('.current-user-badge').forEach((badge) => {
    badge.classList.remove('open');
  });
  document.querySelectorAll<HTMLElement>('.apple-drawer').forEach((drawer) => {
    drawer.classList.remove('open');
  });

  safeAuthPasswordInput.value = '';
  renderAuthGate();
  window.setTimeout(() => safeAuthStudentIdInput.focus(), 0);
}

async function restoreAuthSession(): Promise<void> {
  const storedToken = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedToken) {
    clearAuthSession();
    return;
  }

  authToken = storedToken;

  try {
    const session = await fetchJson<AuthSessionResponse>('/api/users/me');
    currentUserMemberId = session.member.id;
  } catch {
    clearAuthSession();
  }
}

async function loginWithCredentials(username: string, password: string): Promise<void> {
  const session = await fetchJson<AuthSessionResponse>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  saveAuthToken(session.token);
  currentUserMemberId = session.member.id;
}

async function logoutCurrentUser(): Promise<void> {
  if (!authToken) {
    clearAuthSession();
    return;
  }

  try {
    await fetchJson<{ loggedOut: true }>('/api/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAuthSession();
  }
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

function isLikelyJsonPayload(rawText: string): boolean {
  const trimmed = rawText.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function parseImportPayload(rawText: string): ActionItem[] {
  const parsed = JSON.parse(rawText) as ActionItemsPayload | ActionItem[];

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeActionItem);
  }

  if ('actionItems' in parsed && Array.isArray(parsed.actionItems)) {
    return parsed.actionItems.map(normalizeActionItem);
  }

  throw new Error('JSON 中未找到 actionItems 数组。');
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return '未记录';
  }

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString('zh-CN', { hour12: false });
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

function createStyledImportCard(item: ActionItem, index: number): string {
  return `
    <article class="aic-card" data-import-index="${index}">
      <div class="aic-header">
        <span class="aic-index">行动项 ${String(index + 1).padStart(2, '0')}</span>
        <div class="aic-priority-group">
          <button type="button" class="aic-prio-btn${item.priority === 'high' ? ' aic-prio-active' : ''}" data-prio-value="high"><span class="aic-prio-dot aic-dot-high"></span>高</button>
          <button type="button" class="aic-prio-btn${item.priority === 'medium' ? ' aic-prio-active' : ''}" data-prio-value="medium"><span class="aic-prio-dot aic-dot-medium"></span>中</button>
          <button type="button" class="aic-prio-btn${item.priority === 'low' ? ' aic-prio-active' : ''}" data-prio-value="low"><span class="aic-prio-dot aic-dot-low"></span>低</button>
          <input type="hidden" data-field="priority" value="${item.priority}" />
        </div>
      </div>
      <input class="aic-title-input" data-field="title" type="text" value="${escapeHtml(item.title)}" placeholder="任务标题" />
      <div class="aic-meta-row">
        ${(() => {
          const ownerMember = item.ownerName ? latestMembers.find((m) => m.name === item.ownerName) : null;
          const initialColor = ownerMember ? avatarColorByMemberId(ownerMember.id) : item.ownerName ? '#007AFF' : '#86868B';
          return `<div class="aic-owner-pill${item.ownerName ? ' has-owner' : ''}" data-owner-pill>
          <div class="aic-owner-avatar-sm" style="background:${initialColor};">${item.ownerName ? escapeHtml(item.ownerName.charAt(0)) : '?'}</div>
          <span class="aic-owner-label">${item.ownerName ? escapeHtml(item.ownerName) : '未指派'}</span>
          <span class="aic-owner-caret">▾</span>
          <input type="hidden" data-field="ownerName" value="${escapeHtml(item.ownerName ?? '')}" />
          <div class="aic-owner-dropdown">
            <div class="aic-owner-option${!item.ownerName ? ' selected' : ''}" data-option-value="" data-option-color="#86868B">
              <div class="aic-owner-option-avatar" style="background:#86868B;">?</div>
              <span>未指派</span>
            </div>
            ${latestMembers.map((m) => {
              const color = avatarColorByMemberId(m.id);
              return `<div class="aic-owner-option${item.ownerName === m.name ? ' selected' : ''}" data-option-value="${escapeHtml(m.name)}" data-option-color="${color}">
                <div class="aic-owner-option-avatar" style="background:${color};">${escapeHtml(m.name.charAt(0))}</div>
                <span>${escapeHtml(m.name)}</span>
              </div>`;
            }).join('')}
            ${item.ownerName && !latestMembers.some((m) => m.name === item.ownerName) ? `
            <div class="aic-owner-option selected" data-option-value="${escapeHtml(item.ownerName)}" data-option-color="#007AFF">
              <div class="aic-owner-option-avatar" style="background:#007AFF;">${escapeHtml(item.ownerName.charAt(0))}</div>
              <span>${escapeHtml(item.ownerName)}</span>
            </div>` : ''}
          </div>
        </div>`;
        })()}
        <div class="aic-meta-item" style="flex:1;">
          <span class="aic-meta-icon">📅</span>
          <input class="aic-meta-input aic-date-input" data-field="dueDate" type="date" value="${escapeHtml(item.dueDate ?? '')}" />
        </div>
      </div>
    </article>
  `;
}

function formatEngineLabel(engine: string): string {
  if (engine.startsWith('claude:')) {
    const model = engine.replace('claude:', '');
    if (model.includes('opus')) return `✦ Claude Opus`;
    if (model.includes('sonnet')) return `✦ Claude Sonnet`;
    if (model.includes('haiku')) return `✦ Claude Haiku`;
    return `✦ Claude`;
  }
  if (engine.startsWith('openai:')) return `⬡ ${engine.replace('openai:', '')}`;
  if (engine === 'heuristic:fallback') return `⚙ 规则引擎（降级）`;
  if (engine.startsWith('heuristic:')) return `⚙ 规则引擎`;
  return engine;
}

function updateEngineLabelElement(engine: string): void {
  const el = document.getElementById('engine-label-text');
  if (!el) return;
  el.textContent = engine ? `识别引擎：${formatEngineLabel(engine)}` : '识别引擎：会易达专属学术大模型 v2';
}

function createPreviewSummaryCard(): string {
  const engineLabel = draftParserEngine ? formatEngineLabel(draftParserEngine) : '';
  return `
    <article class="psc-card">
      <div class="psc-header">
        <div class="psc-title-row">
          <span class="psc-icon">📋</span>
          <h3 class="psc-title">AI 解析摘要</h3>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${engineLabel ? `<span class="psc-engine-badge${draftParserEngine.startsWith('claude:') ? ' psc-engine-claude' : ''}">${escapeHtml(engineLabel)}</span>` : ''}
          <span class="preview-chip preview-chip-accent">${draftActionItems.length} 条行动项</span>
        </div>
      </div>
      <p class="psc-text">${escapeHtml(draftSummary || '暂无摘要内容')}</p>
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
      const handleFieldChange = () => {
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
      };
      field.addEventListener('input', handleFieldChange);
      field.addEventListener('change', handleFieldChange);
    });

    const ownerPill = card.querySelector<HTMLElement>('[data-owner-pill]');
    if (ownerPill) {
      const hiddenInput = ownerPill.querySelector<HTMLInputElement>('[data-field="ownerName"]');
      const avatarEl = ownerPill.querySelector<HTMLElement>('.aic-owner-avatar-sm');
      const labelEl = ownerPill.querySelector<HTMLElement>('.aic-owner-label');

      ownerPill.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = ownerPill.dataset.open === 'true';
        document.querySelectorAll<HTMLElement>('[data-owner-pill][data-open="true"]').forEach((p) => { p.dataset.open = 'false'; });
        ownerPill.dataset.open = isOpen ? 'false' : 'true';
      });

      ownerPill.querySelectorAll<HTMLElement>('.aic-owner-option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.dataset.optionValue ?? '';
          draftActionItems[index].ownerName = val || null;
          if (hiddenInput) hiddenInput.value = val;
          ownerPill.querySelectorAll('.aic-owner-option').forEach((o) => o.classList.remove('selected'));
          opt.classList.add('selected');
          if (val) {
            ownerPill.classList.add('has-owner');
            const color = opt.dataset.optionColor ?? '#007AFF';
            if (avatarEl) { avatarEl.textContent = val.charAt(0); avatarEl.style.background = color; }
            if (labelEl) labelEl.textContent = val;
          } else {
            ownerPill.classList.remove('has-owner');
            if (avatarEl) { avatarEl.textContent = '?'; avatarEl.style.background = '#86868B'; }
            if (labelEl) labelEl.textContent = '未指派';
          }
          ownerPill.dataset.open = 'false';
        });
      });
    }

    card.querySelectorAll<HTMLButtonElement>('[data-prio-value]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prioValue = btn.dataset.prioValue as TaskPriorityValue;
        draftActionItems[index].priority = prioValue;
        card.querySelectorAll<HTMLButtonElement>('[data-prio-value]').forEach((b) => b.classList.remove('aic-prio-active'));
        btn.classList.add('aic-prio-active');
        const hiddenInput = card.querySelector<HTMLInputElement>('[data-field="priority"]');
        if (hiddenInput) hiddenInput.value = prioValue;
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
  safeImportPreview.innerHTML = createPreviewSummaryCard() + draftActionItems.map(createStyledImportCard).join('');
  bindImportPreviewEvents();
}

function renderIntakeHistory(): void {
  if (latestIntakes.length === 0) {
    safeIntakeHistory.className = 'activity-feed empty-state';
    safeIntakeHistory.textContent = '暂无来源语句';
    return;
  }

  safeIntakeHistory.className = 'activity-feed';
  safeIntakeHistory.innerHTML = latestIntakes
    .slice(0, 8)
    .map((intake) => `
      <div class="feed-item" data-intake-id="${escapeHtml(intake.id)}" style="cursor:pointer; padding-right:32px;">
        <div class="feed-icon">${intake.status === 'imported' ? '✓' : 'AI'}</div>
        <div class="feed-content">
          <p>${escapeHtml(intake.summary ?? intake.sourceContent.slice(0, 48))}</p>
          <span>${escapeHtml(formatDateTime(intake.parsedAt ?? intake.createdAt))} · ${escapeHtml(intake.parserEngine)}</span>
        </div>
        <button class="intake-delete-btn" data-delete-intake-id="${escapeHtml(intake.id)}" title="删除此记录">×</button>
      </div>
    `)
    .join('');

  safeIntakeHistory.querySelectorAll<HTMLElement>('[data-intake-id]').forEach((item) => {
    item.addEventListener('click', () => {
      const intakeId = item.dataset.intakeId;
      const intake = latestIntakes.find((entry) => entry.id === intakeId);
      if (!intake) {
        return;
      }

      safeImportJsonTextarea.value = intake.sourceContent;
      safeSourceFileName.textContent = intake.sourceName ?? (intake.sourceType === 'file' ? '上传文件' : '手动输入');
      safeParserModeInput.value = intake.parserMode;
      draftActionItems = intake.actionItems.map(normalizeActionItem);
      draftSummary = intake.summary ?? '';
      draftParserEngine = intake.parserEngine;
      currentParsedIntakeId = intake.id;
      renderImportPreview();
      updateEngineLabelElement(draftParserEngine);
      setImportFeedback(`已加载解析记录 ${intake.id}。`, 'success');
    });
  });

  safeIntakeHistory.querySelectorAll<HTMLButtonElement>('[data-delete-intake-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteIntakeId;
      if (!id) return;
      try {
        await fetchJson<{ deleted: true; id: string }>(`/api/meeting-intakes/${id}`, { method: 'DELETE' });
        latestIntakes = latestIntakes.filter((entry) => entry.id !== id);
        renderIntakeHistory();
        if (currentParsedIntakeId === id) {
          currentParsedIntakeId = null;
          draftActionItems = [];
          draftSummary = '';
          draftParserEngine = '';
          renderImportPreview();
        }
        setImportFeedback('解析记录已删除。', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败';
        setImportFeedback(`删除失败：${message}`, 'error');
      }
    });
  });
}

async function loadIntakes(): Promise<void> {
  const response = await fetchJson<ListResponse<MeetingIntake>>('/api/meeting-intakes');
  latestIntakes = response.items;
  renderIntakeHistory();
}

function loadSamplePayload(): void {
  safeImportJsonTextarea.value = SAMPLE_MEETING_NOTE;
  safeSourceFileName.textContent = '暂无来源语句';
  setImportFeedback('已载入示例会议纪要，可以直接点击解析。');
}

async function previewImportPayload(): Promise<void> {
  const rawText = safeImportJsonTextarea.value.trim();

  if (!rawText) {
    draftActionItems = [];
    draftSummary = '';
    draftParserEngine = '';
    currentParsedIntakeId = null;
    renderImportPreview();
    setImportFeedback('请先输入会议纪要文本或上传文本文件。', 'error');
    return;
  }

  safePreviewImportButton.disabled = true;
  safePreviewImportButton.classList.add('btn-loading');
  safePreviewImportButton.textContent = '解析中...';
  setImportFeedback('正在调用模型解析，请稍候...', 'neutral');

  try {
    if (isLikelyJsonPayload(rawText)) {
      draftActionItems = parseImportPayload(rawText);
      draftSummary = '当前预览来自手工 JSON 输入。';
      draftParserEngine = '';
      currentParsedIntakeId = null;
    } else {
      const response = await fetchJson<ParseMeetingResponse>('/api/meeting-intakes/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: safeMeetingIdInput.value.trim() || null,
          operatorName: safeOperatorNameInput.value.trim() || '系统',
          parserMode: safeParserModeInput.value,
          sourceType: safeSourceFileInput.files?.[0] ? 'file' : 'text',
          sourceName: safeSourceFileInput.files?.[0]?.name ?? null,
          content: rawText,
        }),
      });

      draftActionItems = response.payload.actionItems.map(normalizeActionItem);
      draftSummary = response.payload.summary;
      draftParserEngine = response.intake.parserEngine;
      currentParsedIntakeId = response.intake.id;
      await loadIntakes();
    }

    renderImportPreview();
    updateEngineLabelElement(draftParserEngine);
  } catch (error) {
    draftActionItems = [];
    draftSummary = '';
    draftParserEngine = '';
    currentParsedIntakeId = null;
    renderImportPreview();
    const message = error instanceof Error ? error.message : '未知错误';
    setImportFeedback(`解析失败：${message}`, 'error');
  } finally {
    safePreviewImportButton.disabled = false;
    safePreviewImportButton.classList.remove('btn-loading');
    safePreviewImportButton.textContent = '一键解析';
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
    const response = currentParsedIntakeId
      ? await fetchJson<ImportResponse>(`/api/meeting-intakes/${currentParsedIntakeId}/import-to-board`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operatorName: safeOperatorNameInput.value.trim() || '????',
          }),
        })
      : await fetchJson<ImportResponse>('/api/tasks/import-from-action-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: safeMeetingIdInput.value.trim() || null,
            operatorName: safeOperatorNameInput.value.trim() || '????',
            actionItems: draftActionItems,
          }),
        });

    setImportFeedback(`导入成功，共生成 ${response.count} 条任务。`, 'success');
    await loadIntakes();
    await loadBoard(response.items[0]?.id ?? selectedTaskId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '????';
    setImportFeedback(`?????${message}`, 'error');
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

function setAuthFeedback(message: string, tone: 'success' | 'error' | 'neutral' = 'neutral'): void {
  const nextMessage = message.trim();
  safeAuthFeedback.textContent = nextMessage;
  safeAuthFeedback.className = `auth-feedback tone-${tone}${nextMessage ? '' : ' hidden'}`;
}

function setFirstMemberFeedback(message: string, tone: 'success' | 'error' | 'neutral' = 'neutral'): void {
  const nextMessage = message.trim();
  safeFirstMemberFeedback.textContent = nextMessage;
  safeFirstMemberFeedback.className = `auth-feedback tone-${tone}${nextMessage ? '' : ' hidden'}`;
}

function setAuthPasswordVisible(visible: boolean): void {
  safeAuthPasswordInput.type = visible ? 'text' : 'password';
  safeAuthPasswordToggle.textContent = visible ? '隐藏' : '显示';
  safeAuthPasswordToggle.setAttribute('aria-label', visible ? '隐藏密码' : '显示密码');
}

function renderAuthGate(): void {
  const currentMember = currentUserMemberId
    ? latestMembers.find((member) => member.id === currentUserMemberId) ?? null
    : null;
  const hasMembers = hasInitializedMembers || latestMembers.length > 0;
  const isAuthenticated = Boolean(currentMember);

  document.body.classList.toggle('auth-locked', !isAuthenticated);
  safeAuthGate.classList.toggle('hidden', isAuthenticated);

  if (!hasMembers) {
    safeAuthModeLabel.textContent = '首次初始化';
    safeAuthTitle.textContent = '创建首位成员';
    safeAuthLoginForm.classList.add('hidden');
    safeAuthEmptyState.classList.remove('hidden');
    safeFirstMemberForm.classList.remove('hidden');
    setAuthFeedback('');
    setAuthPasswordVisible(false);
    return;
  }

  safeAuthModeLabel.textContent = '账号登录';
  safeAuthTitle.textContent = '欢迎进入内部工作区';
  safeAuthLoginForm.classList.remove('hidden');
  safeAuthEmptyState.classList.add('hidden');
  safeFirstMemberForm.classList.add('hidden');
  setFirstMemberFeedback('');

  if (!isAuthenticated) {
    setAuthFeedback('');
    setAuthPasswordVisible(false);
  }
}

function renderDashboardTodos(): void {
  const allTasks = latestBoardData ? latestBoardData.columns.flatMap((c) => c.items) : [];
  const userName = getCurrentUserName();

  if (!currentUserMemberId) {
    safeDashboardTodoList.innerHTML = '<div class="empty-state" style="padding: 24px;">请先完成登录，再查看你的待办任务。</div>';
    return;
  }

  const myTodos = allTasks.filter((t) => {
    if (t.status === 'done') {
      return false;
    }

    if (currentUserMemberId) {
      return t.ownerMemberId === currentUserMemberId;
    }

    return t.ownerName === userName;
  });

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
        <div class="d-label">操作</div>
        <button class="apple-secondary-btn small-btn" data-delete-task-id="${task.id}" style="color:var(--danger);">删除任务</button>
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

  safeDashboardDetailContentBody.querySelectorAll<HTMLButtonElement>('[data-delete-task-id]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      await deleteTask(task.id);
    });
  });

  setupEditableTaskFields(safeDashboardDetailContentBody, task);
}

function setMemberFeedback(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
  safeMemberFeedback.className = `import-feedback tone-${tone}`;
  safeMemberFeedback.textContent = message;
}

function setMeetingFeedback(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral', showLaunchBtn = false): void {
  safeMeetingFeedback.className = `import-feedback tone-${tone}`;
  if (showLaunchBtn) {
    safeMeetingFeedback.innerHTML = `<span>${escapeHtml(message)}</span><button class="launch-wemeet-btn" onclick="window.open('wemeet://','_blank')">🎥 拉起腾讯会议</button>`;
  } else {
    safeMeetingFeedback.textContent = message;
  }
}

function setTaskCreateFeedback(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
  safeTaskCreateFeedback.className = `import-feedback mt-10 tone-${tone}`;
  safeTaskCreateFeedback.textContent = message;
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

function memberAccountLabel(member: Pick<PublicMember, 'degreeType' | 'studentId'>): string {
  return `${degreeTypeLabel(member.degreeType)} · 年级 ${member.studentId}`;
}

function avatarColorByMemberId(memberId: string): string {
  const palette = ['#5AC8FA', '#34C759', '#5856D6', '#FF9500', '#FF2D55', '#007AFF'];
  const hash = Array.from(memberId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function applyCurrentUser(member: PublicMember): void {
  const accountLabel = memberAccountLabel(member);
  safeNavUserAvatar.textContent = member.name.slice(0, 1);
  safeNavUserAvatar.style.background = avatarColorByMemberId(member.id);
  safeNavUserAvatar.style.color = '#FFFFFF';
  safeNavUserName.textContent = `${member.name}（${accountLabel}）`;
  safeDashboardWelcome.textContent = `${getGreetingByHour()}，${member.name}。`;
  safeOperatorNameInput.value = member.name;
}

function applyLoggedOutUser(): void {
  safeNavUserAvatar.textContent = '未';
  safeNavUserAvatar.style.background = '#86868B';
  safeNavUserAvatar.style.color = '#FFFFFF';
  safeNavUserName.textContent = '请先登录';
  safeDashboardWelcome.textContent = `${getGreetingByHour()}。`;
  safeOperatorNameInput.value = '';
}

function renderTeamSwitcher(): void {
  if (latestMembers.length === 0) {
    safeDropdownUserList.innerHTML =
      '<div class="dropdown-header" style="margin: 0; border: none; text-transform: none; letter-spacing: 0;">等待创建首位成员</div>';
    safeNavUserAvatar.textContent = '?';
    safeNavUserAvatar.style.background = '#86868B';
    safeNavUserName.textContent = '未初始化';
    safeDashboardWelcome.textContent = `${getGreetingByHour()}。`;
    safeOperatorNameInput.value = '';
    currentUserMemberId = null;
    return;
  }

  const currentMember = currentUserMemberId
    ? latestMembers.find((member) => member.id === currentUserMemberId) ?? null
    : null;

  if (currentMember) {
    applyCurrentUser(currentMember);
  } else {
    currentUserMemberId = null;
    applyLoggedOutUser();
  }

  if (!currentMember) {
    safeDropdownUserList.innerHTML = '<div class="dropdown-header" style="margin: 0; border: none; text-transform: none; letter-spacing: 0;">请先在登录页完成登录</div>';
    return;
  }

  const color = avatarColorByMemberId(currentMember.id);
  safeDropdownUserList.innerHTML = `
    <div class="dropdown-item active">
      <div class="user-avatar" style="background:${color};color:#FFFFFF;">${escapeHtml(currentMember.name.slice(0, 1))}</div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span>${escapeHtml(currentMember.name)}</span>
        <span style="font-size:12px; opacity:0.75;">年级 ${escapeHtml(currentMember.studentId)}</span>
      </div>
    </div>
    <div class="dropdown-item" data-user-logout="true">退出当前登录</div>
  `;
}

function bindTeamSwitcherEvents(): void {
  safeDropdownUserList.addEventListener('click', async (event) => {
    const logoutItem = (event.target as HTMLElement).closest<HTMLElement>('[data-user-logout]');
    if (logoutItem) {
      await logoutCurrentUser();
      renderTeamSwitcher();
      renderDashboardTodos();
      returnToLoginGate();
      return;
    }
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
            <span>${escapeHtml(member.studentId)} · ${degreeTypeLabel(member.degreeType)}</span>
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
          <strong>${escapeHtml(member.studentId)}</strong>
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
  const selectedIds = new Set(meeting.participants.map((p) => p.id));
  const timeLabel = meeting.meetingTime
    ? new Date(meeting.meetingTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : '未设置';

  const participantAvatars = meeting.participants.slice(0, 6).map((p) => {
    const color = avatarColorByMemberId(p.id);
    return `<div class="mc-avatar" style="background:${color};" title="${escapeHtml(p.name)}">${escapeHtml(p.name.charAt(0))}</div>`;
  }).join('');
  const extraCount = meeting.participants.length - 6;

  return `
    <article class="meeting-card" data-meeting-id="${escapeHtml(meeting.id)}">
      <div class="mc-header">
        <div class="mc-main">
          <h3 class="mc-topic">${escapeHtml(meeting.topic)}</h3>
          <div class="mc-chips">
            <span class="mc-chip">🕐 ${escapeHtml(timeLabel)}</span>
            ${meeting.location ? `<span class="mc-chip">📍 ${escapeHtml(meeting.location)}</span>` : ''}
          </div>
        </div>
        <div class="mc-actions">
          <button class="launch-wemeet-btn" onclick="window.open('wemeet://','_blank')">🎥 腾讯会议</button>
          <button class="mc-delete-btn" data-delete-meeting-id="${escapeHtml(meeting.id)}" title="删除会议">🗑</button>
        </div>
      </div>

      <div class="mc-participants-row">
        ${meeting.participants.length > 0
          ? `<div class="mc-avatar-stack">${participantAvatars}${extraCount > 0 ? `<div class="mc-avatar mc-avatar-more">+${extraCount}</div>` : ''}</div>
             <span class="mc-participant-names">${meeting.participants.slice(0, 3).map((p) => escapeHtml(p.name)).join('、')}${meeting.participants.length > 3 ? ' 等' : ''}</span>`
          : '<span class="mc-no-participants">暂无参会人</span>'}
      </div>

      <details class="mc-edit-section">
        <summary class="mc-edit-summary">编辑参会人</summary>
        <div class="mc-checkbox-grid">
          ${latestMembers.length > 0
            ? latestMembers.map((member) => `
                <label class="mc-checkbox-item">
                  <input type="checkbox" value="${escapeHtml(member.id)}" data-edit-meeting-participant="${escapeHtml(meeting.id)}" ${selectedIds.has(member.id) ? 'checked' : ''} />
                  <div class="mc-checkbox-avatar" style="background:${avatarColorByMemberId(member.id)};">${escapeHtml(member.name.charAt(0))}</div>
                  <div class="mc-checkbox-info">
                    <strong>${escapeHtml(member.name)}</strong>
                    <span>${escapeHtml(member.studentId)} · ${degreeTypeLabel(member.degreeType)}</span>
                  </div>
                </label>`).join('')
            : '<span class="mc-no-participants">暂无可选成员</span>'}
        </div>
        <button class="apple-primary-btn small-btn mc-save-btn" data-save-meeting-participants="${escapeHtml(meeting.id)}" style="margin-top:10px;">保存参会人</button>
      </details>
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
    m.studentId.toLowerCase().includes(searchText.toLowerCase())
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
            <td style="padding:12px 16px; color:var(--text-main);">${escapeHtml(member.studentId)}</td>
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

async function loadMemberStatus(): Promise<void> {
  const status = await fetchJson<MemberStatusResponse>('/api/members/status');
  hasInitializedMembers = status.hasMembers;
}

async function loadResources(): Promise<void> {
  try {
    await loadMemberStatus();

    if (!authToken) {
      latestMembers = [];
      latestMeetings = [];
      renderTeamSwitcher();
      renderAuthGate();
      renderMeetingMemberPicker();
      renderTaskCreateOwnerOptions();
      renderStatusFilter();
      renderRiskFilter();
      renderOwnerFilter();
      return;
    }

    const [membersResponse, meetingsResponse] = await Promise.all([
      fetchJson<ListResponse<Member>>('/api/members'),
      fetchJson<ListResponse<Meeting>>('/api/meetings'),
    ]);
    hasInitializedMembers = membersResponse.count > 0;
    latestMembers = membersResponse.items;
    latestMeetings = meetingsResponse.items;
    renderTeamSwitcher();
    renderAuthGate();
    renderMeetingMemberPicker();
    renderTaskCreateOwnerOptions();
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
    setAuthFeedback(`加载成员失败：${message}`, 'error');
  }
}

function renderTaskCreateOwnerOptions(): void {
  const options = ['<option value="">待指派</option>'];

  [...latestMembers]
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
    .forEach((member) => {
      options.push(`<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`);
    });

  safeTaskCreateOwnerInput.innerHTML = options.join('');
}

async function createMember(): Promise<void> {
  const name = safeMemberNameInput.value.trim();
  const studentId = safeMemberStudentIdInput.value.trim();
  const degreeType = safeMemberDegreeTypeInput.value as Member['degreeType'];

  if (!name || !studentId) {
    setMemberFeedback('请填写成员姓名和年级。', 'error');
    return;
  }

  if (latestMembers.some(m => m.name === name)) {
    setMemberFeedback(`成员 ${name} 已存在，请勿重复添加。`, 'error');
    return;
  }

  if (latestMembers.some(m => m.studentId === studentId)) {
    setMemberFeedback(`年级 ${studentId} 已存在，请勿重复添加。`, 'error');
    return;
  }

  safeCreateMemberButton.disabled = true;

  try {
    const createdMember = await fetchJson<CreatedMember>('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, studentId, degreeType }),
    });
    safeMemberNameInput.value = '';
    safeMemberStudentIdInput.value = '';
    safeMemberDegreeTypeInput.value = 'master';
    setMemberFeedback(`成员 ${name} 已创建，初始密码为 ${createdMember.initialPassword}。请妥善保存，成员列表不会再展示密码。`, 'success');
    await loadResources();
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建成员失败';
    setMemberFeedback(`创建成员失败：${message}`, 'error');
  } finally {
    safeCreateMemberButton.disabled = false;
  }
}

async function createFirstMemberFromGate(): Promise<void> {
  const name = safeFirstMemberNameInput.value.trim();
  const studentId = safeFirstMemberStudentIdInput.value.trim();
  const degreeType = safeFirstMemberDegreeTypeInput.value as Member['degreeType'];

  if (!name || !studentId) {
    setFirstMemberFeedback('请填写首位成员姓名和年级。', 'error');
    return;
  }

  safeCreateFirstMemberButton.disabled = true;

  try {
    const createdMember = await fetchJson<CreatedMember>('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, studentId, degreeType }),
    });

    setFirstMemberFeedback(`首位成员已创建，初始密码为 ${createdMember.initialPassword}，正在登录。请妥善保存，成员列表不会再展示密码。`, 'success');
    await loginWithCredentials(createdMember.name, createdMember.initialPassword);
    setAuthFeedback(`欢迎进入系统，当前登录账号：${createdMember.name}。`, 'success');
    safeFirstMemberNameInput.value = '';
    safeFirstMemberStudentIdInput.value = '';
    safeFirstMemberDegreeTypeInput.value = 'master';
    safeAuthStudentIdInput.value = createdMember.name;
    safeAuthPasswordInput.value = createdMember.initialPassword;
    await loadResources();
    await loadBoard();
    await loadIntakes();
    renderDashboardTodos();
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建首位成员失败';
    setFirstMemberFeedback(`创建首位成员失败：${message}`, 'error');
  } finally {
    safeCreateFirstMemberButton.disabled = false;
  }
}

async function submitAuthLogin(): Promise<void> {
  const username = safeAuthStudentIdInput.value.trim();
  const password = safeAuthPasswordInput.value.trim();

  if (!username || !password) {
    setAuthFeedback('请输入用户名和密码。', 'error');
    return;
  }

  safeAuthLoginButton.disabled = true;

  try {
    await loginWithCredentials(username, password);
    setAuthFeedback('登录成功，正在进入内部工作台。', 'success');
    await loadResources();
    await loadBoard();
    await loadIntakes();
    renderDashboardTodos();
    safeAuthPasswordInput.value = '';
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败';
    setAuthFeedback(`登录失败：${message}`, 'error');
  } finally {
    safeAuthLoginButton.disabled = false;
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
    setMeetingFeedback('', 'neutral');
    await loadResources();
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建会议失败';
    setMeetingFeedback(`创建会议失败：${message}`, 'error');
  } finally {
    safeCreateMeetingButton.disabled = false;
  }
}

async function createTask(): Promise<void> {
  const title = safeTaskCreateTitleInput.value.trim();
  const description = safeTaskCreateDescriptionInput.value.trim();
  const ownerMemberId = safeTaskCreateOwnerInput.value || null;
  const dueDate = safeTaskCreateDueDateInput.value || null;
  const priority = safeTaskCreatePriorityInput.value as TaskPriorityValue;

  if (!title || !description) {
    setTaskCreateFeedback('请填写任务标题和描述。', 'error');
    return;
  }

  safeCreateTaskButton.disabled = true;
  setTaskCreateFeedback('正在创建任务，请稍候...', 'neutral');

  try {
    const task = await fetchJson<Task>('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        ownerMemberId,
        dueDate,
        priority,
        operatorName: getCurrentUserName() || '系统操作',
      }),
    });

    safeTaskCreateTitleInput.value = '';
    safeTaskCreateDescriptionInput.value = '';
    safeTaskCreateOwnerInput.value = '';
    safeTaskCreateDueDateInput.value = '';
    safeTaskCreatePriorityInput.value = 'medium';
    setTaskCreateFeedback(`任务 ${task.title} 已创建。`, 'success');
    await loadBoard(task.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建任务失败';
    setTaskCreateFeedback(`创建任务失败：${message}`, 'error');
  } finally {
    safeCreateTaskButton.disabled = false;
  }
}

async function refreshWorkspaceBoardView(preferredTaskId?: string | null): Promise<void> {
  if (latestWorkspaceBoardData) {
    await renderBoardView(filterBoard(latestWorkspaceBoardData), preferredTaskId ?? selectedTaskId);
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
        await refreshWorkspaceBoardView();
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
        await refreshWorkspaceBoardView();
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
        await refreshWorkspaceBoardView();
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

async function deleteTask(taskId: string): Promise<void> {
  await fetchJson<{ deleted: true; id: string }>(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  });

  if (selectedTaskId === taskId) {
    selectedTaskId = null;
  }

  if (selectedDashboardTaskId === taskId) {
    selectedDashboardTaskId = null;
  }

  await loadBoard();
}

function createTaskOwnerDropdownHTML(task: Task): string {
  const member = task.ownerMemberId ? latestMembers.find((m) => m.id === task.ownerMemberId) ?? null : null;
  const currentOwner = member?.name ?? task.ownerName;
  const avatarTxt = currentOwner ? currentOwner.charAt(0) : '?';
  const avatarBg = member ? avatarColorByMemberId(member.id) : 'var(--text-muted)';
  const displayName = currentOwner || '待指派';

  let itemsHTML = `
    <div class="dropdown-item ${!task.ownerMemberId ? 'active' : ''}" data-task-owner-id="">
      <div class="user-avatar" style="background:var(--text-muted); color:white; width:24px; height:24px; font-size:12px;">?</div>
      待指派
    </div>
  `;

  [...latestMembers].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).forEach((m) => {
    const isActive = task.ownerMemberId === m.id ? 'active' : '';
    const color = avatarColorByMemberId(m.id);
    itemsHTML += `
      <div class="dropdown-item ${isActive}" data-task-owner-id="${escapeHtml(m.id)}">
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
        const value = item.dataset.taskOwnerId || null;
        
        await fetchJson<Task>(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerMemberId: value }),
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
          <div class="d-label">操作</div>
          <button class="apple-secondary-btn small-btn" data-delete-task-id="${taskDetailData.id}" style="color:var(--danger);">删除任务</button>
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

  safeTaskDetail.querySelectorAll<HTMLButtonElement>('[data-delete-task-id]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      await deleteTask(taskDetailData.id);
      const safeTaskDrawer = document.getElementById('task-drawer');
      if (safeTaskDrawer) {
        safeTaskDrawer.classList.remove('open');
      }
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
    const [board, taskList] = await Promise.all([
      fetchJson<BoardResponse>('/api/board'),
      fetchJson<TaskListResponse>(buildTaskQueryPath()),
    ]);
    latestBoardData = board;
    latestBoardStats = board.stats;
    latestWorkspaceBoardData = buildBoardFromTasks(taskList.items);
    await renderBoardView(filterBoard(latestWorkspaceBoardData), preferredTaskId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    safeBoardColumns.innerHTML = `<div class="column-empty">加载失败：${message}</div>`;
    safeTaskDetail.textContent = '无法加载任务详情。';
  }
}

async function initializeApp(): Promise<void> {
  await restoreAuthSession();
  loadSamplePayload();
  await loadResources();
  await loadBoard();
  await loadIntakes();
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
  await refreshWorkspaceBoardView(selectedTaskId);
});

safeToggleTaskCreateButton.addEventListener('click', () => {
  const isOpen = safeTaskCreatePanel.classList.toggle('open');
  safeToggleTaskCreateButton.textContent = isOpen ? '收起新建' : '新建任务';
});

safeTaskSearchInput.addEventListener('input', () => {
  taskQueryState.keyword = safeTaskSearchInput.value;

  if (taskSearchDebounceTimer) {
    clearTimeout(taskSearchDebounceTimer);
  }

  taskSearchDebounceTimer = setTimeout(() => {
    void loadBoard(selectedTaskId);
  }, 220);
});

safeTaskSortInput.addEventListener('change', async () => {
  const [sortBy, sortOrder] = safeTaskSortInput.value.split(':') as [TaskSortField, TaskQueryState['sortOrder']];
  taskQueryState.sortBy = sortBy;
  taskQueryState.sortOrder = sortOrder;
  await loadBoard(selectedTaskId);
});

safeCreateTaskButton.addEventListener('click', async () => {
  await createTask();
});

safeLoadSampleButton.addEventListener('click', () => {
  loadSamplePayload();
});

safePreviewImportButton.addEventListener('click', async () => {
  await previewImportPayload();
});

safeSubmitImportButton.addEventListener('click', async () => {
  await submitImportPayload();
});

safeSourceFileInput.addEventListener('change', async () => {
  const file = safeSourceFileInput.files?.[0];

  if (!file) {
    safeSourceFileName.textContent = '未选择文件';
    return;
  }

  safeSourceFileName.textContent = file.name;
  safeImportJsonTextarea.value = await file.text();
  setImportFeedback(`已载入文件 ${file.name}，可以开始解析。`, 'success');
});

safeRefreshMembersButton.addEventListener('click', async () => {
  await loadResources();
});

safeRefreshMeetingsButton.addEventListener('click', async () => {
  await loadResources();
});

safeAuthLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitAuthLogin();
});

safeAuthPasswordToggle.addEventListener('click', () => {
  setAuthPasswordVisible(safeAuthPasswordInput.type === 'password');
});

safeCreateMemberButton.addEventListener('click', async () => {
  await createMember();
});

safeFirstMemberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createFirstMemberFromGate();
});

safeCreateMeetingButton.addEventListener('click', async () => {
  await createMeeting();
});

safeClearMeetingMembersButton.addEventListener('click', () => {
  clearCreateMeetingMemberSelection();
});

bindTeamSwitcherEvents();
void initializeApp();

document.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('[data-owner-pill][data-open="true"]').forEach((p) => { p.dataset.open = 'false'; });
});
