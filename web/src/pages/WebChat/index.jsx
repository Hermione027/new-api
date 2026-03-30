/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Card,
  Chat,
  Empty,
  Layout,
  Modal,
  Select,
  SideSheet,
  Spin,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  History,
  LogIn,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import {
  API,
  buildApiPayload,
  createLoadingAssistantMessage,
  createMessage,
  encodeToBase64,
  getLogo,
  processGroupsData,
  processModelsData,
  showError,
  stringToColor,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { PlaygroundProvider } from '../../contexts/PlaygroundContext';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useApiRequest } from '../../hooks/playground/useApiRequest';
import { useMessageActions } from '../../hooks/playground/useMessageActions';
import { useMessageEdit } from '../../hooks/playground/useMessageEdit';
import {
  DEBUG_TABS,
  MESSAGE_ROLES,
  MESSAGE_STATUS,
} from '../../constants/playground.constants';
import { OptimizedMessageActions, OptimizedMessageContent } from '../../components/playground/OptimizedComponents';
import CustomInputRender from '../../components/playground/CustomInputRender';
import {
  createWebChatSession,
  deriveWebChatSessionPreview,
  deriveWebChatSessionTitle,
  loadWebChatSessions,
  saveWebChatSessions,
  sortWebChatSessions,
} from './storage';

const SIMPLE_PARAMETER_ENABLED = {
  temperature: false,
  top_p: false,
  max_tokens: false,
  frequency_penalty: false,
  presence_penalty: false,
  seed: false,
};

const WEB_CHAT_SIDEBAR_WIDTH_STORAGE_KEY = 'webchat_sidebar_width_v1';
const DEFAULT_WEB_CHAT_SIDEBAR_WIDTH = 360;
const MIN_WEB_CHAT_SIDEBAR_WIDTH = 280;
const MAX_WEB_CHAT_SIDEBAR_WIDTH = 560;
const MIN_WEB_CHAT_CONTENT_WIDTH = 420;
const MOBILE_WEB_CHAT_SHEET_WIDTH = 'min(calc(100vw - 24px), 420px)';

const clampWebChatSidebarWidth = (width, containerWidth = null) => {
  const numericWidth = Number(width);
  const safeWidth = Number.isFinite(numericWidth)
    ? numericWidth
    : DEFAULT_WEB_CHAT_SIDEBAR_WIDTH;
  const containerMax =
    Number.isFinite(containerWidth) &&
    containerWidth > MIN_WEB_CHAT_CONTENT_WIDTH
      ? containerWidth - MIN_WEB_CHAT_CONTENT_WIDTH
      : MAX_WEB_CHAT_SIDEBAR_WIDTH;
  const maxAllowed = Math.max(
    MIN_WEB_CHAT_SIDEBAR_WIDTH,
    Math.min(MAX_WEB_CHAT_SIDEBAR_WIDTH, containerMax),
  );

  return Math.min(
    Math.max(Math.round(safeWidth), MIN_WEB_CHAT_SIDEBAR_WIDTH),
    maxAllowed,
  );
};

const getStoredWebChatSidebarWidth = () => {
  try {
    const storedWidth = localStorage.getItem(
      WEB_CHAT_SIDEBAR_WIDTH_STORAGE_KEY,
    );
    if (!storedWidth) {
      return DEFAULT_WEB_CHAT_SIDEBAR_WIDTH;
    }
    return clampWebChatSidebarWidth(Number(storedWidth));
  } catch (error) {
    return DEFAULT_WEB_CHAT_SIDEBAR_WIDTH;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const getOptionValues = (options = []) =>
  options
    .map((option) => option?.value)
    .filter((value) => value !== undefined && value !== null);

const getAvailableWebChatGroupValues = (
  selectedModel,
  groupOptions = [],
  modelGroupsMap = {},
) => {
  const allGroupValues = getOptionValues(groupOptions);
  if (!selectedModel) {
    return allGroupValues;
  }

  const relatedGroups = modelGroupsMap[selectedModel];
  if (!Array.isArray(relatedGroups) || relatedGroups.length === 0) {
    return allGroupValues;
  }

  const relatedGroupSet = new Set(relatedGroups);
  return allGroupValues.filter((group) => relatedGroupSet.has(group));
};

const getAvailableWebChatModelValues = (
  selectedGroup,
  modelOptions = [],
  groupModelsMap = {},
) => {
  const allModelValues = getOptionValues(modelOptions);
  if (!selectedGroup) {
    return allModelValues;
  }

  const relatedModels = groupModelsMap[selectedGroup];
  if (!Array.isArray(relatedModels) || relatedModels.length === 0) {
    return allModelValues;
  }

  const relatedModelSet = new Set(relatedModels);
  return allModelValues.filter((model) => relatedModelSet.has(model));
};

const sortWebChatOptionsByAvailability = (options = [], availableValues = []) => {
  const availableValueSet = new Set(availableValues);

  return options
    .map((option, index) => ({
      option,
      index,
      isAvailable: availableValueSet.has(option?.value),
    }))
    .sort((left, right) => {
      if (left.isAvailable === right.isAvailable) {
        return left.index - right.index;
      }
      return left.isAvailable ? -1 : 1;
    })
    .map(({ option }) => option);
};

const getWebChatOptionState = (value, currentValue, availableValues = []) => {
  if (value === currentValue) {
    return 'active';
  }
  if (availableValues.includes(value)) {
    return 'compatible';
  }
  return 'linked';
};

const buildWebChatAvailabilityMaps = ({
  pricingItems = [],
  modelOptions = [],
  groupOptions = [],
  autoGroups = [],
}) => {
  const modelValues = getOptionValues(modelOptions);
  const groupValues = getOptionValues(groupOptions);

  if (groupValues.length === 1 && groupValues[0] === '') {
    return {
      modelGroupsMap: {},
      groupModelsMap: {},
    };
  }

  const modelValueSet = new Set(modelValues);
  const groupValueSet = new Set(groupValues);
  const modelGroupsMap = {};
  const groupModelsMap = {};

  const addRelation = (model, group) => {
    if (!model || !group) {
      return;
    }

    if (!modelGroupsMap[model]) {
      modelGroupsMap[model] = [];
    }
    if (!modelGroupsMap[model].includes(group)) {
      modelGroupsMap[model].push(group);
    }

    if (!groupModelsMap[group]) {
      groupModelsMap[group] = [];
    }
    if (!groupModelsMap[group].includes(model)) {
      groupModelsMap[group].push(model);
    }
  };

  pricingItems.forEach((item) => {
    const modelName = item?.model_name;
    if (!modelName || !modelValueSet.has(modelName)) {
      return;
    }

    const enableGroups = Array.isArray(item?.enable_groups)
      ? item.enable_groups
      : [];

    enableGroups.forEach((group) => {
      if (groupValueSet.has(group)) {
        addRelation(modelName, group);
      }
    });

    if (
      groupValueSet.has('auto') &&
      autoGroups.some((group) => enableGroups.includes(group))
    ) {
      addRelation(modelName, 'auto');
    }
  });

  return {
    modelGroupsMap,
    groupModelsMap,
  };
};

const resolveWebChatSelection = ({
  currentModel,
  currentGroup,
  modelOptions = [],
  groupOptions = [],
  modelGroupsMap = {},
  groupModelsMap = {},
}) => {
  const allModelValues = getOptionValues(modelOptions);
  const allGroupValues = getOptionValues(groupOptions);

  let nextModel = allModelValues.includes(currentModel)
    ? currentModel
    : (allModelValues[0] ?? '');
  let nextGroup = allGroupValues.includes(currentGroup)
    ? currentGroup
    : (allGroupValues[0] ?? '');

  const availableGroupsForModel = getAvailableWebChatGroupValues(
    nextModel,
    groupOptions,
    modelGroupsMap,
  );
  if (
    availableGroupsForModel.length > 0 &&
    !availableGroupsForModel.includes(nextGroup)
  ) {
    nextGroup = availableGroupsForModel[0];
  }

  const availableModelsForGroup = getAvailableWebChatModelValues(
    nextGroup,
    modelOptions,
    groupModelsMap,
  );
  if (
    availableModelsForGroup.length > 0 &&
    !availableModelsForGroup.includes(nextModel)
  ) {
    nextModel = availableModelsForGroup[0];
  }

  const finalGroupsForModel = getAvailableWebChatGroupValues(
    nextModel,
    groupOptions,
    modelGroupsMap,
  );
  if (finalGroupsForModel.length > 0 && !finalGroupsForModel.includes(nextGroup)) {
    nextGroup = finalGroupsForModel[0];
  }

  return {
    model: nextModel,
    group: nextGroup,
  };
};

const generateAvatarDataUrl = (username) => {
  if (!username) {
    return getLogo();
  }

  const firstLetter = username[0].toUpperCase();
  const bgColor = stringToColor(username);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="${bgColor}" />
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="16" fill="#ffffff" font-family="sans-serif">${firstLetter}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${encodeToBase64(svg)}`;
};

const isSessionGenerating = (session) =>
  (session?.messages || []).some(
    (message) =>
      message.status === MESSAGE_STATUS.LOADING ||
      message.status === MESSAGE_STATUS.INCOMPLETE,
  );

const LoginPrompt = ({ onLogin }) => {
  const { t } = useTranslation();

  return (
    <div className='h-full flex items-center justify-center px-4'>
      <Card
        className='w-full max-w-xl !rounded-3xl overflow-hidden shadow-xl'
        bordered={false}
        bodyStyle={{ padding: 0 }}
      >
        <div className='px-8 py-10 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 text-white'>
          <div className='w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-5'>
            <MessageSquare size={28} />
          </div>
          <Typography.Title heading={2} className='!text-white !mb-2'>
            {t('登录后即可开始网页对话')}
          </Typography.Title>
          <Typography.Text className='!text-white/90 text-base'>
            {t('直接使用你自己的模型权限和账户额度，无需额外填写 API Key。')}
          </Typography.Text>
        </div>
        <div className='px-8 py-8 space-y-6'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3'>
              <div className='text-sm font-semibold text-emerald-700'>
                {t('模型选择')}
              </div>
              <div className='text-xs text-emerald-600 mt-1'>
                {t('按你的账号权限展示可用模型')}
              </div>
            </div>
            <div className='rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3'>
              <div className='text-sm font-semibold text-cyan-700'>
                {t('历史记录')}
              </div>
              <div className='text-xs text-cyan-600 mt-1'>
                {t('当前设备内按账号保存会话历史')}
              </div>
            </div>
            <div className='rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3'>
              <div className='text-sm font-semibold text-blue-700'>
                {t('额度结算')}
              </div>
              <div className='text-xs text-blue-600 mt-1'>
                {t('仍然走站内现有计费和分组逻辑')}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='primary'
              size='large'
              icon={<LogIn size={16} />}
              onClick={onLogin}
              style={{ borderRadius: 999 }}
            >
              {t('登录后使用')}
            </Button>
            <Typography.Text type='tertiary'>
              {t('登录后即可开始使用当前账号的网页对话能力')}
            </Typography.Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

const SessionList = ({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  t,
}) => {
  if (sessions.length === 0) {
    return (
      <Empty
        image={null}
        description={t('还没有历史会话')}
        style={{ padding: '32px 16px' }}
      />
    );
  }

  return (
    <div className='space-y-2'>
      {sessions.map((session) => {
        const preview = deriveWebChatSessionPreview(session.messages);
        const isActive = session.id === activeSessionId;

        return (
          <button
            key={session.id}
            type='button'
            onClick={() => onSelect(session.id)}
            className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
              isActive
                ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                : 'border-[var(--semi-color-border)] bg-white hover:border-cyan-300 hover:bg-slate-50'
            }`}
          >
            <div className='flex items-start gap-3'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <Typography.Text
                    strong
                    style={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {session.title || t('新对话')}
                  </Typography.Text>
                  {session.model && (
                    <Tag
                      color='cyan'
                      size='small'
                      className='web-chat-session-model-tag'
                    >
                      {session.model}
                    </Tag>
                  )}
                </div>
                <Typography.Text
                  type='tertiary'
                  size='small'
                  style={{
                    display: 'block',
                    marginTop: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {preview || t('点击开始新的聊天')}
                </Typography.Text>
                <Typography.Text
                  type='tertiary'
                  size='small'
                  style={{ display: 'block', marginTop: 8 }}
                >
                  {dayjs(session.updatedAt).format('MM-DD HH:mm')}
                </Typography.Text>
              </div>

              <Button
                theme='borderless'
                type='tertiary'
                icon={<Trash2 size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(session.id);
                }}
                className='!rounded-full !text-slate-400 hover:!text-red-600 hover:!bg-red-50'
                aria-label={t('删除会话')}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

const WebChat = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userState] = useContext(UserContext);

  const currentUser = userState?.user || getStoredUser();
  const userId = currentUser?.id;
  const userGroup = currentUser?.group || '';

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [allModels, setAllModels] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [modelGroupsMap, setModelGroupsMap] = useState({});
  const [groupModelsMap, setGroupModelsMap] = useState({});
  const [historyVisible, setHistoryVisible] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [debugData, setDebugData] = useState({});
  const [activeDebugTab, setActiveDebugTab] = useState(DEBUG_TABS.REQUEST);
  const [sidebarWidth, setSidebarWidth] = useState(getStoredWebChatSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const sseSourceRef = useRef(null);
  const chatRef = useRef(null);
  const layoutRef = useRef(null);

  const sortedSessions = useMemo(
    () => sortWebChatSessions(sessions),
    [sessions],
  );

  const activeSession = useMemo(
    () =>
      sortedSessions.find((session) => session.id === activeSessionId) ||
      sortedSessions[0] ||
      null,
    [activeSessionId, sortedSessions],
  );

  const currentMessages = activeSession?.messages || [];
  const currentInputs = useMemo(
    () => ({
      model: activeSession?.model || '',
      group: activeSession?.group || '',
      stream: true,
      imageEnabled: false,
      imageUrls: [],
    }),
    [activeSession?.group, activeSession?.model],
  );

  const availableGroupValues = useMemo(
    () =>
      getAvailableWebChatGroupValues(
        activeSession?.model,
        allGroups,
        modelGroupsMap,
      ),
    [activeSession?.model, allGroups, modelGroupsMap],
  );

  const availableModelValues = useMemo(
    () =>
      getAvailableWebChatModelValues(
        activeSession?.group,
        allModels,
        groupModelsMap,
      ),
    [activeSession?.group, allModels, groupModelsMap],
  );

  const sortedGroupOptions = useMemo(
    () => sortWebChatOptionsByAvailability(allGroups, availableGroupValues),
    [allGroups, availableGroupValues],
  );

  const sortedModelOptions = useMemo(
    () => sortWebChatOptionsByAvailability(allModels, availableModelValues),
    [allModels, availableModelValues],
  );

  const needsAutoModelSwitchHint = useMemo(() => {
    if (!activeSession?.model || !activeSession?.group) {
      return false;
    }
    return !availableGroupValues.includes(activeSession.group);
  }, [activeSession?.group, activeSession?.model, availableGroupValues]);

  const needsAutoGroupSwitchHint = useMemo(() => {
    if (!activeSession?.model || !activeSession?.group) {
      return false;
    }
    return !availableModelValues.includes(activeSession.model);
  }, [activeSession?.group, activeSession?.model, availableModelValues]);

  const styleState = useMemo(() => ({ isMobile }), [isMobile]);

  const roleInfo = useMemo(
    () => ({
      user: {
        name: currentUser?.username || 'User',
        avatar: generateAvatarDataUrl(currentUser?.username),
      },
      assistant: {
        name: 'Assistant',
        avatar: getLogo(),
      },
      system: {
        name: 'System',
        avatar: getLogo(),
      },
    }),
    [currentUser?.username],
  );

  const isAnySessionGenerating = useMemo(
    () => sessions.some((session) => isSessionGenerating(session)),
    [sessions],
  );

  const setSessionMessages = useCallback((sessionId, nextValue) => {
    if (!sessionId) {
      return;
    }

    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        const previousMessages = Array.isArray(session.messages)
          ? session.messages
          : [];
        const nextMessages =
          typeof nextValue === 'function'
            ? nextValue(previousMessages)
            : nextValue;

        return {
          ...session,
          messages: nextMessages,
          title: deriveWebChatSessionTitle(nextMessages),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const updateSessionFields = useCallback((sessionId, patch) => {
    if (!sessionId) {
      return;
    }

    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId ? { ...session, ...patch } : session,
      ),
    );
  }, []);

  const setCurrentMessages = useCallback(
    (nextValue) => {
      if (!activeSessionId) {
        return;
      }
      setSessionMessages(activeSessionId, nextValue);
    },
    [activeSessionId, setSessionMessages],
  );

  const persistCurrentMessages = useCallback(
    (messages) => {
      if (!activeSessionId) {
        return;
      }
      setSessionMessages(activeSessionId, messages);
    },
    [activeSessionId, setSessionMessages],
  );

  const { sendRequest, onStopGenerator } = useApiRequest(
    setCurrentMessages,
    setDebugData,
    setActiveDebugTab,
    sseSourceRef,
    persistCurrentMessages,
  );

  const { editingMessageId, editValue, setEditValue, handleMessageEdit, handleEditSave, handleEditCancel } =
    useMessageEdit(
      setCurrentMessages,
      currentInputs,
      SIMPLE_PARAMETER_ENABLED,
      sendRequest,
      persistCurrentMessages,
    );

  const ensureIdleBeforeMutatingSessions = useCallback(() => {
    if (!isAnySessionGenerating) {
      return true;
    }

    Toast.warning({
      content: t('请先停止当前回复，再执行这个操作'),
      duration: 2,
    });
    return false;
  }, [isAnySessionGenerating, t]);

  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const getSidebarResizeBounds = useCallback(() => {
    const containerWidth = layoutRef.current?.getBoundingClientRect().width;
    return {
      containerWidth,
      minWidth: MIN_WEB_CHAT_SIDEBAR_WIDTH,
      maxWidth: clampWebChatSidebarWidth(
        MAX_WEB_CHAT_SIDEBAR_WIDTH,
        containerWidth,
      ),
    };
  }, []);

  const handleSidebarResizeStart = useCallback((event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  const handleSidebarResizeReset = useCallback(() => {
    const { containerWidth } = getSidebarResizeBounds();
    setSidebarWidth(
      clampWebChatSidebarWidth(
        DEFAULT_WEB_CHAT_SIDEBAR_WIDTH,
        containerWidth,
      ),
    );
  }, [getSidebarResizeBounds]);

  const handleSidebarResizeKeyDown = useCallback(
    (event) => {
      const { containerWidth, minWidth, maxWidth } = getSidebarResizeBounds();
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSidebarWidth((prevWidth) =>
          clampWebChatSidebarWidth(prevWidth - 24, containerWidth),
        );
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSidebarWidth((prevWidth) =>
          clampWebChatSidebarWidth(prevWidth + 24, containerWidth),
        );
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setSidebarWidth(minWidth);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setSidebarWidth(maxWidth);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleSidebarResizeReset();
      }
    },
    [getSidebarResizeBounds, handleSidebarResizeReset],
  );

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setActiveSessionId(null);
      setAllModels([]);
      setAllGroups([]);
      setModelGroupsMap({});
      setGroupModelsMap({});
      setHistoryVisible(false);
      handleEditCancel();
      return;
    }

    const loadedSessions = loadWebChatSessions(userId);
    const initialSessions =
      loadedSessions.length > 0
        ? loadedSessions
        : [createWebChatSession()];

    setSessions(initialSessions);
    setActiveSessionId(initialSessions[0].id);
    handleEditCancel();
  }, [handleEditCancel, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    saveWebChatSessions(userId, sessions);
  }, [sessions, userId]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const syncSidebarWidthToViewport = () => {
      const containerWidth = layoutRef.current?.getBoundingClientRect().width;
      setSidebarWidth((prevWidth) =>
        clampWebChatSidebarWidth(prevWidth, containerWidth),
      );
    };

    syncSidebarWidthToViewport();
    window.addEventListener('resize', syncSidebarWidthToViewport);

    return () => {
      window.removeEventListener('resize', syncSidebarWidthToViewport);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    try {
      localStorage.setItem(
        WEB_CHAT_SIDEBAR_WIDTH_STORAGE_KEY,
        String(sidebarWidth),
      );
    } catch (error) {
      // Ignore localStorage write failures.
    }
  }, [isMobile, sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar || isMobile) {
      return;
    }

    const handleMouseMove = (event) => {
      const containerRect = layoutRef.current?.getBoundingClientRect();
      if (!containerRect) {
        return;
      }

      const nextWidth = clampWebChatSidebarWidth(
        event.clientX - containerRect.left,
        containerRect.width,
      );
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMobile, isResizingSidebar]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    const loadChatConfig = async () => {
      setLoadingConfig(true);
      try {
        const [modelsResult, groupsResult, pricingResult] =
          await Promise.allSettled([
            API.get('/api/user/models'),
            API.get('/api/user/self/groups'),
            API.get('/api/pricing'),
          ]);

        if (cancelled) {
          return;
        }

        let nextModelOptions = [];
        let nextGroupOptions = [];

        if (modelsResult.status === 'fulfilled') {
          if (modelsResult.value.data.success) {
            const { modelOptions } = processModelsData(
              modelsResult.value.data.data || [],
              '',
            );
            nextModelOptions = modelOptions;
            setAllModels(modelOptions);
          } else {
            showError(modelsResult.value.data.message || t('加载模型失败'));
          }
        } else {
          showError(t('加载模型失败'));
        }

        if (groupsResult.status === 'fulfilled') {
          if (groupsResult.value.data.success) {
            nextGroupOptions = processGroupsData(
              groupsResult.value.data.data || {},
              userGroup,
            );
            setAllGroups(nextGroupOptions);
          } else {
            showError(groupsResult.value.data.message || t('加载分组失败'));
          }
        } else {
          showError(t('加载分组失败'));
        }

        if (
          pricingResult.status === 'fulfilled' &&
          pricingResult.value.data.success
        ) {
          const {
            modelGroupsMap: nextModelGroupsMap,
            groupModelsMap: nextGroupModelsMap,
          } = buildWebChatAvailabilityMaps({
            pricingItems: pricingResult.value.data.data || [],
            modelOptions: nextModelOptions,
            groupOptions: nextGroupOptions,
            autoGroups: pricingResult.value.data.auto_groups || [],
          });

          setModelGroupsMap(nextModelGroupsMap);
          setGroupModelsMap(nextGroupModelsMap);
        } else {
          setModelGroupsMap({});
          setGroupModelsMap({});
        }
      } finally {
        if (!cancelled) {
          setLoadingConfig(false);
        }
      }
    };

    loadChatConfig();

    return () => {
      cancelled = true;
    };
  }, [t, userGroup, userId]);

  useEffect(() => {
    if (!activeSession?.id) {
      return;
    }

    const nextSelection = resolveWebChatSelection({
      currentModel: activeSession.model,
      currentGroup: activeSession.group,
      modelOptions: allModels,
      groupOptions: allGroups,
      modelGroupsMap,
      groupModelsMap,
    });

    if (
      nextSelection.model !== activeSession.model ||
      nextSelection.group !== activeSession.group
    ) {
      updateSessionFields(activeSession.id, nextSelection);
    }
  }, [
    activeSession?.group,
    activeSession?.id,
    activeSession?.model,
    allGroups,
    allModels,
    groupModelsMap,
    modelGroupsMap,
    updateSessionFields,
  ]);

  useEffect(() => {
    if (activeSessionId && sessions.some((session) => session.id === activeSessionId)) {
      return;
    }

    if (sortedSessions.length > 0) {
      setActiveSessionId(sortedSessions[0].id);
    }
  }, [activeSessionId, sessions, sortedSessions]);

  useEffect(() => {
    handleEditCancel();
  }, [activeSessionId, handleEditCancel]);

  const handleGroupChange = useCallback(
    (value) => {
      if (!activeSession?.id) {
        return;
      }

      const availableModelsForGroup = getAvailableWebChatModelValues(
        value,
        allModels,
        groupModelsMap,
      );
      const nextModel = availableModelsForGroup.includes(activeSession.model)
        ? activeSession.model
        : (availableModelsForGroup[0] ?? '');

      if (nextModel && nextModel !== activeSession.model) {
        Toast.info({
          content: t('该分组下不支持当前模型，已自动切换模型'),
          duration: 2,
        });
      }

      updateSessionFields(activeSession.id, {
        group: value,
        model: nextModel,
      });
    },
    [
      activeSession?.id,
      activeSession?.model,
      allModels,
      groupModelsMap,
      t,
      updateSessionFields,
    ],
  );

  const handleModelChange = useCallback(
    (value) => {
      if (!activeSession?.id) {
        return;
      }

      const availableGroupsForModel = getAvailableWebChatGroupValues(
        value,
        allGroups,
        modelGroupsMap,
      );
      const nextGroup = availableGroupsForModel.includes(activeSession.group)
        ? activeSession.group
        : (availableGroupsForModel[0] ?? '');

      if (nextGroup !== activeSession.group) {
        Toast.info({
          content: t('当前分组下不支持该模型，已自动切换分组'),
          duration: 2,
        });
      }

      updateSessionFields(activeSession.id, {
        model: value,
        group: nextGroup,
      });
    },
    [
      activeSession?.group,
      activeSession?.id,
      allGroups,
      modelGroupsMap,
      t,
      updateSessionFields,
    ],
  );

  const handleCreateSession = useCallback(() => {
    if (!ensureIdleBeforeMutatingSessions()) {
      return;
    }

    const nextSelection = resolveWebChatSelection({
      currentModel: activeSession?.model || allModels[0]?.value || '',
      currentGroup: activeSession?.group || allGroups[0]?.value || '',
      modelOptions: allModels,
      groupOptions: allGroups,
      modelGroupsMap,
      groupModelsMap,
    });

    const newSession = createWebChatSession({
      model: nextSelection.model,
      group: nextSelection.group,
    });

    setSessions((prevSessions) => [newSession, ...prevSessions]);
    setActiveSessionId(newSession.id);
    setHistoryVisible(false);
  }, [
    activeSession?.group,
    activeSession?.model,
    allGroups,
    allModels,
    ensureIdleBeforeMutatingSessions,
    groupModelsMap,
    modelGroupsMap,
  ]);

  const handleSelectSession = useCallback(
    (sessionId) => {
      if (sessionId === activeSessionId) {
        setHistoryVisible(false);
        return;
      }

      if (!ensureIdleBeforeMutatingSessions()) {
        return;
      }

      setActiveSessionId(sessionId);
      setHistoryVisible(false);
    },
    [activeSessionId, ensureIdleBeforeMutatingSessions],
  );

  const handleDeleteSession = useCallback(
    (sessionId) => {
      if (!ensureIdleBeforeMutatingSessions()) {
        return;
      }

      Modal.confirm({
        title: t('删除这个会话？'),
        content: t('删除后当前设备上的这段聊天历史将无法恢复。'),
        okText: t('删除'),
        cancelText: t('取消'),
        okButtonProps: {
          type: 'danger',
        },
        onOk: () => {
          let nextActiveId = activeSessionId;

          setSessions((prevSessions) => {
            const remainingSessions = prevSessions.filter(
              (session) => session.id !== sessionId,
            );
            const nextSessions =
              remainingSessions.length > 0
                ? remainingSessions
                : [
                    createWebChatSession({
                      ...resolveWebChatSelection({
                        currentModel:
                          activeSession?.model || allModels[0]?.value || '',
                        currentGroup:
                          activeSession?.group || allGroups[0]?.value || '',
                        modelOptions: allModels,
                        groupOptions: allGroups,
                        modelGroupsMap,
                        groupModelsMap,
                      }),
                    }),
                  ];

            if (!nextSessions.some((session) => session.id === nextActiveId)) {
              nextActiveId = sortWebChatSessions(nextSessions)[0].id;
            }

            return nextSessions;
          });

          setActiveSessionId(nextActiveId);
        },
      });
    },
    [
      activeSession?.group,
      activeSession?.model,
      activeSessionId,
      allGroups,
      allModels,
      ensureIdleBeforeMutatingSessions,
      groupModelsMap,
      modelGroupsMap,
      t,
    ],
  );

  const handleMessageSend = useCallback(
    (content) => {
      const trimmedContent =
        typeof content === 'string' ? content.trim() : '';

      if (!trimmedContent) {
        return;
      }

      if (!activeSession?.id) {
        return;
      }

      if (!currentInputs.model) {
        Toast.warning({
          content: t('请先选择模型'),
          duration: 2,
        });
        return;
      }

      const userMessage = createMessage(
        MESSAGE_ROLES.USER,
        trimmedContent,
      );
      const loadingMessage = createLoadingAssistantMessage();

      setCurrentMessages((prevMessages) => {
        const nextMessages = [...prevMessages, userMessage];
        const payload = buildApiPayload(
          nextMessages,
          null,
          currentInputs,
          SIMPLE_PARAMETER_ENABLED,
        );

        sendRequest(payload, true);
        return [...nextMessages, loadingMessage];
      });
    },
    [
      activeSession?.id,
      currentInputs,
      sendRequest,
      setCurrentMessages,
      t,
    ],
  );

  const messageActions = useMessageActions(
    currentMessages,
    setCurrentMessages,
    handleMessageSend,
    persistCurrentMessages,
  );

  const toggleReasoningExpansion = useCallback(
    (messageId) => {
      setCurrentMessages((prevMessages) =>
        prevMessages.map((message) =>
          message.id === messageId &&
          message.role === MESSAGE_ROLES.ASSISTANT
            ? {
                ...message,
                isReasoningExpanded: !message.isReasoningExpanded,
              }
            : message,
        ),
      );
    },
    [setCurrentMessages],
  );

  const renderInputArea = useCallback((props) => {
    return <CustomInputRender {...props} />;
  }, []);

  const renderCustomChatContent = useCallback(
    ({ message, className }) => {
      const isCurrentlyEditing = editingMessageId === message.id;

      return (
        <OptimizedMessageContent
          message={message}
          className={className}
          styleState={styleState}
          onToggleReasoningExpansion={toggleReasoningExpansion}
          isEditing={isCurrentlyEditing}
          onEditSave={handleEditSave}
          onEditCancel={handleEditCancel}
          editValue={editValue}
          onEditValueChange={setEditValue}
        />
      );
    },
    [
      editValue,
      editingMessageId,
      handleEditCancel,
      handleEditSave,
      setEditValue,
      styleState,
      toggleReasoningExpansion,
    ],
  );

  const renderChatBoxAction = useCallback(
    ({ message }) => {
      const isAnyMessageGenerating = currentMessages.some(
        (item) =>
          item.status === MESSAGE_STATUS.LOADING ||
          item.status === MESSAGE_STATUS.INCOMPLETE,
      );
      const isCurrentlyEditing = editingMessageId === message.id;

      return (
        <OptimizedMessageActions
          message={message}
          styleState={styleState}
          onMessageReset={messageActions.handleMessageReset}
          onMessageCopy={messageActions.handleMessageCopy}
          onMessageDelete={messageActions.handleMessageDelete}
          onRoleToggle={messageActions.handleRoleToggle}
          onMessageEdit={handleMessageEdit}
          isAnyMessageGenerating={isAnyMessageGenerating}
          isEditing={isCurrentlyEditing}
        />
      );
    },
    [
      currentMessages,
      editingMessageId,
      handleMessageEdit,
      messageActions,
      styleState,
    ],
  );

  const handleClearMessages = useCallback(() => {
    setCurrentMessages([]);
  }, [setCurrentMessages]);

  const renderGroupSelectOption = useCallback(
    (item) => {
      const state = getWebChatOptionState(
        item.value,
        currentInputs.group,
        availableGroupValues,
      );
      const title = item.value || item.label;
      const subtitle =
        item.value && item.fullLabel && item.fullLabel !== item.value
          ? item.fullLabel
          : null;
      const statusText =
        state === 'active'
          ? t('当前')
          : state === 'compatible'
            ? t('可直用')
            : t('会联动');

      return (
        <div
          className={`web-chat-select-option is-${state}`}
          onClick={item.onClick}
          onMouseEnter={item.onMouseEnter}
        >
          <div className='web-chat-select-option-main'>
            <span className={`web-chat-option-dot is-${state}`} />
            <div className='web-chat-select-option-text'>
              <Typography.Text strong>{title}</Typography.Text>
              {subtitle ? (
                <Typography.Text type='tertiary' size='small'>
                  {subtitle}
                </Typography.Text>
              ) : null}
            </div>
          </div>
          <span className={`web-chat-option-status is-${state}`}>
            {statusText}
          </span>
        </div>
      );
    },
    [availableGroupValues, currentInputs.group, t],
  );

  const renderModelSelectOption = useCallback(
    (item) => {
      const state = getWebChatOptionState(
        item.value,
        currentInputs.model,
        availableModelValues,
      );
      const statusText =
        state === 'active'
          ? t('当前')
          : state === 'compatible'
            ? t('可直用')
            : t('会联动');

      return (
        <div
          className={`web-chat-select-option is-${state}`}
          onClick={item.onClick}
          onMouseEnter={item.onMouseEnter}
        >
          <div className='web-chat-select-option-main'>
            <span className={`web-chat-option-dot is-${state}`} />
            <div className='web-chat-select-option-text'>
              <Typography.Text strong>{item.value || item.label}</Typography.Text>
            </div>
          </div>
          <span className={`web-chat-option-status is-${state}`}>
            {statusText}
          </span>
        </div>
      );
    },
    [availableModelValues, currentInputs.model, t],
  );

  const sidebarContent = (
    <div className='h-full flex flex-col'>
      {isMobile ? (
        <div className='flex items-center justify-between gap-3 mb-3'>
          <div className='min-w-0'>
            <Typography.Text strong className='text-base'>
              {t('会话与设置')}
            </Typography.Text>
            <Typography.Text type='tertiary' size='small' className='!block mt-1'>
              {t('切换会话、分组和模型')}
            </Typography.Text>
          </div>
          <Button
            type='primary'
            size='small'
            icon={<Plus size={14} />}
            onClick={handleCreateSession}
            style={{ borderRadius: 999 }}
          >
            {t('新建')}
          </Button>
        </div>
      ) : (
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div>
            <Typography.Title heading={5} className='!mb-1'>
              {t('AI 对话')}
            </Typography.Title>
            <Typography.Text type='tertiary'>
              {t('使用当前登录账号的额度和模型权限')}
            </Typography.Text>
          </div>
          <Button
            type='primary'
            icon={<Plus size={14} />}
            onClick={handleCreateSession}
            style={{ borderRadius: 999 }}
          >
            {t('新建')}
          </Button>
        </div>
      )}

      <Card
        bordered={false}
        className='!rounded-2xl !mb-4'
        bodyStyle={{ padding: isMobile ? 14 : 16 }}
      >
        <div className='space-y-4'>
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <Users size={16} className='text-slate-500' />
              <Typography.Text strong>{t('分组')}</Typography.Text>
            </div>
            <Select
              placeholder={t('请选择分组')}
              value={currentInputs.group}
              optionList={sortedGroupOptions}
              onChange={handleGroupChange}
              renderOptionItem={renderGroupSelectOption}
              disabled={!activeSession || loadingConfig}
              style={{ width: '100%' }}
              className='!rounded-xl'
            />
            {activeSession?.model && allGroups.length > availableGroupValues.length && (
              <Typography.Text
                size='small'
                type={needsAutoModelSwitchHint ? 'warning' : 'tertiary'}
                className='!block mt-2'
              >
                {needsAutoModelSwitchHint
                  ? t('切换分组时会自动匹配该分组下可用的模型')
                  : t('当前模型可用的分组已优先排在前面')}
              </Typography.Text>
            )}
          </div>

          <div>
            <div className='flex items-center gap-2 mb-2'>
              <Sparkles size={16} className='text-slate-500' />
              <Typography.Text strong>{t('模型')}</Typography.Text>
            </div>
            <Select
              placeholder={t('请选择模型')}
              value={currentInputs.model}
              optionList={sortedModelOptions}
              onChange={handleModelChange}
              renderOptionItem={renderModelSelectOption}
              disabled={!activeSession || loadingConfig}
              filter
              autoClearSearchValue={false}
              style={{ width: '100%' }}
              className='!rounded-xl'
            />
            {activeSession?.group && allModels.length > availableModelValues.length && (
              <Typography.Text
                size='small'
                type={needsAutoGroupSwitchHint ? 'warning' : 'tertiary'}
                className='!block mt-2'
              >
                {needsAutoGroupSwitchHint
                  ? t('切换模型时会自动匹配该模型可用的分组')
                  : t('当前分组可用的模型已优先排在前面')}
              </Typography.Text>
            )}
          </div>

          <div className='rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3'>
            <Typography.Text size='small' type='tertiary'>
              {t('发送消息时会继续复用站内现有的分发、计费和权限控制逻辑。')}
            </Typography.Text>
          </div>
        </div>
      </Card>

      <div className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? '' : 'pr-1'}`}>
        <SessionList
          sessions={sortedSessions}
          activeSessionId={activeSession?.id}
          onSelect={handleSelectSession}
          onDelete={handleDeleteSession}
          t={t}
        />
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className='mt-[60px] h-[calc(100vh-64px)] web-chat-page-shell'>
        <LoginPrompt onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <PlaygroundProvider
      value={{
        onPasteImage: () => {},
        imageUrls: [],
        imageEnabled: false,
      }}
      >
      <div
        ref={layoutRef}
        className='mt-[60px] h-[calc(100vh-64px)] w-full overflow-hidden web-chat-page-shell'
      >
        <Layout className='web-chat-layout h-full w-full bg-transparent overflow-hidden'>
          {!isMobile && (
            <Layout.Sider
              width={sidebarWidth}
              className='web-chat-sidebar h-full'
              style={{
                background: 'transparent',
                padding: '16px 0 16px 16px',
                width: `${sidebarWidth}px`,
                minWidth: `${sidebarWidth}px`,
                maxWidth: `${sidebarWidth}px`,
                flex: `0 0 ${sidebarWidth}px`,
              }}
            >
              <div className='web-chat-sidebar-shell h-full rounded-3xl p-4 overflow-hidden'>
                {sidebarContent}
              </div>
            </Layout.Sider>
          )}

          {!isMobile && (
            <div
              role='separator'
              aria-orientation='vertical'
              aria-label={t('拖动调整历史侧栏宽度')}
              tabIndex={0}
              className={`web-chat-resize-handle ${
                isResizingSidebar ? 'is-resizing' : ''
              }`}
              onMouseDown={handleSidebarResizeStart}
              onDoubleClick={handleSidebarResizeReset}
              onKeyDown={handleSidebarResizeKeyDown}
            />
          )}

          <Layout.Content
            className='web-chat-content h-full min-w-0'
            style={{
              padding: isMobile ? '12px' : '16px',
              paddingLeft: isMobile ? '12px' : '16px',
            }}
          >
            {!activeSession ? (
              <div className='h-full flex items-center justify-center'>
                <Spin size='large' />
              </div>
            ) : (
              <Card
                bordered={false}
                className='web-chat-main-card h-full w-full min-w-0 !rounded-3xl overflow-hidden'
                bodyStyle={{
                  padding: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div className='web-chat-main-header px-4 sm:px-6 py-4 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='web-chat-main-header-icon w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0'>
                      <MessageSquare size={20} />
                    </div>
                    <div className='min-w-0'>
                      <Typography.Title
                        heading={5}
                        className='web-chat-main-header-title !mb-0'
                      >
                        {activeSession.title || t('新对话')}
                      </Typography.Title>
                      <div className='flex flex-wrap items-center gap-2 mt-1'>
                        {currentInputs.model ? (
                          <Tag
                            color='blue'
                            size='small'
                            className='web-chat-model-tag'
                          >
                            {currentInputs.model}
                          </Tag>
                        ) : (
                          <Typography.Text className='web-chat-main-header-subtitle text-sm'>
                            {t('请选择模型开始对话')}
                          </Typography.Text>
                        )}
                        {currentInputs.group && (
                          <Tag
                            color='green'
                            size='small'
                            className='web-chat-group-tag'
                          >
                            {currentInputs.group}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    {isMobile && (
                      <Button
                        theme='borderless'
                        type='primary'
                        icon={<History size={16} />}
                        onClick={() => setHistoryVisible(true)}
                        className='web-chat-main-header-action !rounded-full'
                      />
                    )}
                    <Button
                      theme='borderless'
                      type='primary'
                      icon={<Plus size={16} />}
                      onClick={handleCreateSession}
                      className='web-chat-main-header-action !rounded-full'
                    >
                      {!isMobile && t('新建会话')}
                    </Button>
                  </div>
                </div>

                <div className='flex-1 overflow-hidden'>
                  <Chat
                    ref={chatRef}
                    roleConfig={roleInfo}
                    chats={currentMessages}
                    uploadProps={{
                      action: '',
                      showUploadList: false,
                    }}
                    renderInputArea={renderInputArea}
                    chatBoxRenderConfig={{
                      renderChatBoxContent: renderCustomChatContent,
                      renderChatBoxAction: renderChatBoxAction,
                      renderChatBoxTitle: () => null,
                    }}
                    style={{
                      height: '100%',
                      maxWidth: '100%',
                      overflow: 'hidden',
                    }}
                    onMessageSend={handleMessageSend}
                    onMessageCopy={messageActions.handleMessageCopy}
                    onMessageReset={messageActions.handleMessageReset}
                    onMessageDelete={messageActions.handleMessageDelete}
                    onStopGenerator={onStopGenerator}
                    onClear={handleClearMessages}
                    showClearContext
                    showStopGenerate
                    className='h-full'
                    placeholder={t('输入问题后开始对话')}
                  />
                </div>
              </Card>
            )}
          </Layout.Content>
        </Layout>

        <SideSheet
          visible={historyVisible}
          placement='left'
          onCancel={() => setHistoryVisible(false)}
          closeOnEsc
          title={t('聊天历史')}
          width={isMobile ? MOBILE_WEB_CHAT_SHEET_WIDTH : 420}
          bodyStyle={{ padding: isMobile ? 12 : 16 }}
          className='web-chat-history-sheet'
        >
          {sidebarContent}
        </SideSheet>
      </div>
    </PlaygroundProvider>
  );
};

export default WebChat;
