import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const transformJsx = require('@babel/plugin-transform-react-jsx');
const transformModules = require('@babel/plugin-transform-modules-commonjs');

const mobileRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1))), '..');
const sourceRoot = path.join(mobileRoot, 'src');
const normalize = (value) => path.normalize(value).toLowerCase();

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function rolePolicy(overrides = {}) {
  return {
    send_text_messages: true,
    send_media: true,
    send_photos: true,
    send_voice_messages: true,
    react: true,
    ...overrides,
  };
}

export function groupSnapshot({ id = 41, version = 3, member, admin, owner, capabilities } = {}) {
  return {
    id,
    type: 'group',
    created_by: 1,
    role_permissions: {
      version,
      member: rolePolicy(member),
      admin: rolePolicy(admin),
      owner: rolePolicy(owner),
    },
    my_capabilities: {
      ...rolePolicy(),
      manage_permissions: true,
      role: 'owner',
      ...capabilities,
    },
  };
}

class SocketMock {
  constructor() {
    this.connected = true;
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(listener);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event, payload) {
    for (const listener of [...(this.listeners.get(event) || [])]) listener(payload);
  }

  setConnected(connected) {
    this.connected = connected;
    this.emit(connected ? 'connect' : 'disconnect');
  }
}

export function createGroupPermissionsHarness({ conversationId = 41, user = { id: 1 }, initialConversation = null } = {}) {
  const environment = {
    user,
    conversationId,
    initialConversation,
    initialUserId: user?.id,
    navigationCalls: [],
    announcements: [],
  };
  const socket = new SocketMock();
  const api = {
    getCalls: [],
    patchCalls: [],
    getQueue: [],
    patchQueue: [],
    enqueueGet(value) { this.getQueue.push(value); },
    enqueuePatch(value) { this.patchQueue.push(value); },
    getConversationApi(id) {
      this.getCalls.push(id);
      assert.ok(this.getQueue.length, `Unexpected GET for conversation ${id}`);
      const next = this.getQueue.shift();
      return typeof next === 'function' ? next(id) : Promise.resolve(next);
    },
    updateGroupPermissionsApi(id, payload) {
      this.patchCalls.push({ id, payload });
      assert.ok(this.patchQueue.length, `Unexpected PATCH for conversation ${id}`);
      const next = this.patchQueue.shift();
      return typeof next === 'function' ? next(id, payload) : Promise.resolve(next);
    },
  };

  let currentInstance = null;
  let rootElement = null;
  let tree = null;
  let rendering = false;
  let renderQueued = false;
  let pendingEffects = [];
  let visited = new Set();
  const instances = new Map();
  const Fragment = Symbol('Fragment');

  const React = {
    Fragment,
    createElement(type, props, ...children) {
      const normalizedChildren = children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
      return {
        type,
        key: props?.key ?? null,
        props: { ...(props || {}), children: normalizedChildren },
      };
    },
    useState(initial) {
      assert.ok(currentInstance, 'useState called outside render');
      const instance = currentInstance;
      const index = instance.hookIndex++;
      if (!instance.hooks[index]) {
        const hook = { value: typeof initial === 'function' ? initial() : initial };
        hook.set = (update) => {
          const next = typeof update === 'function' ? update(hook.value) : update;
          if (Object.is(next, hook.value)) return;
          hook.value = next;
          scheduleRender();
        };
        instance.hooks[index] = hook;
      }
      const hook = instance.hooks[index];
      return [hook.value, hook.set];
    },
    useRef(initial) {
      assert.ok(currentInstance, 'useRef called outside render');
      const instance = currentInstance;
      const index = instance.hookIndex++;
      if (!instance.hooks[index]) instance.hooks[index] = { current: initial };
      return instance.hooks[index];
    },
    useMemo(factory, deps) {
      assert.ok(currentInstance, 'useMemo called outside render');
      const instance = currentInstance;
      const index = instance.hookIndex++;
      const previous = instance.hooks[index];
      if (!previous || depsChanged(previous.deps, deps)) instance.hooks[index] = { deps, value: factory() };
      return instance.hooks[index].value;
    },
    useCallback(callback, deps) {
      return React.useMemo(() => callback, deps);
    },
    useEffect(callback, deps) {
      assert.ok(currentInstance, 'useEffect called outside render');
      const instance = currentInstance;
      const index = instance.hookIndex++;
      const previous = instance.hooks[index];
      if (!previous || depsChanged(previous.deps, deps)) {
        const hook = { deps, callback, cleanup: previous?.cleanup };
        instance.hooks[index] = hook;
        pendingEffects.push(hook);
      }
    },
  };
  React.default = React;
  React.__esModule = true;

  function depsChanged(previous, next) {
    if (!previous || !next || previous.length !== next.length) return true;
    return next.some((value, index) => !Object.is(value, previous[index]));
  }

  function scheduleRender() {
    renderQueued = true;
    if (!rendering) performRender();
  }

  function performRender() {
    rendering = true;
    try {
      do {
        renderQueued = false;
        pendingEffects = [];
        visited = new Set();
        tree = renderElement(rootElement, 'root');
        for (const [identity, instance] of instances) {
          if (!visited.has(identity)) {
            for (const hook of instance.hooks) hook?.cleanup?.();
            instances.delete(identity);
          }
        }
        const effects = pendingEffects;
        pendingEffects = [];
        for (const hook of effects) {
          hook.cleanup?.();
          hook.cleanup = hook.callback() || undefined;
        }
      } while (renderQueued);
    } finally {
      rendering = false;
    }
  }

  function renderElement(element, location) {
    if (element === null || element === undefined || element === false || element === true) return null;
    if (typeof element === 'string' || typeof element === 'number') return String(element);
    if (Array.isArray(element)) return element.map((child, index) => renderElement(child, `${location}.${index}`)).filter(Boolean);
    if (element.type === Fragment) return renderElement(element.props.children, `${location}.fragment`);
    if (typeof element.type === 'function') {
      const identity = `${location}:${element.key ?? ''}:${element.type.name || 'anonymous'}`;
      visited.add(identity);
      let instance = instances.get(identity);
      if (!instance || instance.type !== element.type) {
        instance = { type: element.type, hooks: [], hookIndex: 0 };
        instances.set(identity, instance);
      }
      instance.hookIndex = 0;
      const previous = currentInstance;
      currentInstance = instance;
      let output;
      try {
        output = element.type(element.props);
      } finally {
        currentInstance = previous;
      }
      return renderElement(output, `${identity}.output`);
    }
    const children = renderElement(element.props?.children || [], `${location}.children`);
    return {
      type: element.type,
      props: { ...(element.props || {}), children: undefined },
      children: Array.isArray(children) ? children : children == null ? [] : [children],
    };
  }

  function allNodes(node = tree, result = []) {
    if (node == null) return result;
    if (Array.isArray(node)) {
      for (const child of node) allNodes(child, result);
      return result;
    }
    if (typeof node === 'object') {
      result.push(node);
      for (const child of node.children || []) allNodes(child, result);
    }
    return result;
  }

  function textContent(node = tree) {
    if (node == null) return '';
    if (Array.isArray(node)) return node.map(textContent).join('');
    if (typeof node === 'string') return node;
    return (node.children || []).map(textContent).join('');
  }

  const host = (name) => name;
  const reactNative = {
    __esModule: true,
    AccessibilityInfo: { announceForAccessibility: (message) => environment.announcements.push(message) },
    AppState: { addEventListener: () => ({ remove() {} }) },
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    Switch: host('Switch'),
    Text: host('Text'),
    View: host('View'),
    ActivityIndicator: host('ActivityIndicator'),
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
  };
  const component = (name) => (props) => React.createElement(name, props, props.children);
  const Button = ({ title, onPress, loading, disabled = false, ...props }) => React.createElement('Button', {
    ...props,
    onPress,
    disabled: loading || disabled,
    accessibilityRole: 'button',
    accessibilityLabel: title,
    accessibilityState: { disabled: loading || disabled, busy: !!loading },
  }, loading ? 'Đang lưu' : title);
  const PermissionSwitchRow = ({ label, value, onChange, disabled, ...props }) => React.createElement('PermissionSwitchRow', {
    ...props,
    onPress: () => { if (!disabled) onChange(!value); },
    disabled: !!disabled,
    accessibilityRole: 'switch',
    accessibilityLabel: label,
    accessibilityState: { checked: !!value, disabled: !!disabled },
  }, label);
  const ErrorState = ({ title, message, onRetry }) => React.createElement('ErrorState', {
    accessibilityRole: 'alert',
    title,
    message,
    onRetry,
  }, title, message || '');
  const LoadingState = () => React.createElement('LoadingState', {}, 'Đang tải');

  const theme = {
    colors: new Proxy({}, { get: (_, key) => String(key) }),
  };
  const mocks = new Map([
    ['react', React],
    ['react-native', reactNative],
    ['@expo/vector-icons', { __esModule: true, Ionicons: component('Ionicons') }],
    ['react-native-safe-area-context', { __esModule: true, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }],
    ['@react-navigation/native', { __esModule: true, useFocusEffect: (callback) => React.useEffect(callback, [callback]) }],
  ]);
  const absoluteMocks = new Map([
    [normalize(path.join(sourceRoot, 'store', 'AuthContext.js')), { __esModule: true, useAuth: () => ({ user: environment.user }) }],
    [normalize(path.join(sourceRoot, 'store', 'ThemeContext.js')), { __esModule: true, useTheme: () => theme }],
    [normalize(path.join(sourceRoot, 'api', 'conversation.api.js')), { __esModule: true, getConversationApi: api.getConversationApi.bind(api), updateGroupPermissionsApi: api.updateGroupPermissionsApi.bind(api) }],
    [normalize(path.join(sourceRoot, 'api', 'socket.js')), { __esModule: true, getSocket: () => socket }],
    [normalize(path.join(sourceRoot, 'components', 'Button.js')), { __esModule: true, default: Button }],
    [normalize(path.join(sourceRoot, 'components', 'PermissionSwitchRow.js')), { __esModule: true, default: PermissionSwitchRow }],
    [normalize(path.join(sourceRoot, 'components', 'ErrorState.js')), { __esModule: true, default: ErrorState }],
    [normalize(path.join(sourceRoot, 'components', 'LoadingState.js')), { __esModule: true, default: LoadingState }],
    [normalize(path.join(sourceRoot, 'theme', 'tokens.js')), {
      __esModule: true,
      layout: { contentMaxWidth: 560 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 40 },
      typography: { size: {}, weight: {}, lineHeight: {}, family: {} },
    }],
  ]);
  const moduleCache = new Map();

  function resolveLocal(specifier, parentFile) {
    let candidate = path.resolve(path.dirname(parentFile), specifier);
    if (!fs.existsSync(candidate)) candidate += '.js';
    return candidate;
  }

  function loadModule(filename) {
    const normalized = normalize(filename);
    if (absoluteMocks.has(normalized)) return absoluteMocks.get(normalized);
    if (moduleCache.has(normalized)) return moduleCache.get(normalized).exports;
    const module = { exports: {} };
    moduleCache.set(normalized, module);
    const source = fs.readFileSync(filename, 'utf8');
    const transformed = babel.transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      sourceType: 'module',
      plugins: [transformJsx, transformModules],
    }).code;
    const localRequire = (specifier) => {
      if (mocks.has(specifier)) return mocks.get(specifier);
      if (specifier.startsWith('.')) return loadModule(resolveLocal(specifier, filename));
      return require(specifier);
    };
    new Function('require', 'module', 'exports', '__filename', '__dirname', transformed)(localRequire, module, module.exports, filename, path.dirname(filename));
    return module.exports;
  }

  const screenModule = loadModule(path.join(sourceRoot, 'screens', 'GroupPermissionsScreen.js'));
  const Screen = screenModule.default;
  const navigation = { navigate: (...args) => environment.navigationCalls.push(args) };

  function mount() {
    rootElement = React.createElement(Screen, {
      route: { params: {
        conversationId: environment.conversationId,
        initialConversation: environment.initialConversation,
        initialUserId: environment.initialUserId,
      } },
      navigation,
    });
    performRender();
  }

  async function act(callback = () => {}) {
    const result = callback();
    if (result && typeof result.then === 'function') await result;
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
      if (renderQueued && !rendering) performRender();
    }
  }

  function findAll(predicate) {
    return allNodes().filter(predicate);
  }

  function byLabel(label, { startsWith = false } = {}) {
    const matches = findAll((node) => startsWith
      ? String(node.props.accessibilityLabel || '').startsWith(label)
      : node.props.accessibilityLabel === label);
    assert.equal(matches.length, 1, `Expected one node labeled ${label}, found ${matches.length}. Rendered text: ${textContent()}`);
    return matches[0];
  }

  async function press(node) {
    assert.equal(node.props.disabled, false, `Cannot press disabled ${node.props.accessibilityLabel || node.type}`);
    await act(() => node.props.onPress());
  }

  function rerender({ nextUser = environment.user, nextConversationId = environment.conversationId } = {}) {
    environment.user = nextUser;
    environment.conversationId = nextConversationId;
    rootElement = React.createElement(Screen, {
      route: { params: {
        conversationId: environment.conversationId,
        initialConversation: environment.initialConversation,
        initialUserId: environment.initialUserId,
      } },
      navigation,
    });
    performRender();
  }

  function unmount() {
    rootElement = null;
    performRender();
  }

  return {
    api,
    socket,
    environment,
    mount,
    unmount,
    rerender,
    act,
    press,
    byLabel,
    findAll,
    text: () => textContent(),
    tree: () => tree,
  };
}
