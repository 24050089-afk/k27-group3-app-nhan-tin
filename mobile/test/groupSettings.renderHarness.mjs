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

export function createGroupSettingsHarness({ group, user = { id: 1 }, conversationId = 41, mediaCounts = { images: 3, videos: 2 } } = {}) {
  const environment = { group, user, conversationId, mediaCounts, mediaCalls: [], navigationCalls: [] };
  let currentInstance = null;
  let rootElement = null;
  let tree = null;
  let renderQueued = false;
  let rendering = false;
  let pendingEffects = [];
  let visited = new Set();
  const instances = new Map();
  const Fragment = Symbol('Fragment');

  const React = {
    Fragment,
    createElement(type, props, ...children) {
      return {
        type,
        key: props?.key ?? null,
        props: {
          ...(props || {}),
          children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
        },
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
    useCallback(callback, deps) {
      assert.ok(currentInstance, 'useCallback called outside render');
      const instance = currentInstance;
      const index = instance.hookIndex++;
      const previous = instance.hooks[index];
      if (!previous || depsChanged(previous.deps, deps)) instance.hooks[index] = { deps, callback };
      return instance.hooks[index].callback;
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
        for (const hook of pendingEffects) {
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
      try {
        return renderElement(element.type(element.props), `${identity}.output`);
      } finally {
        currentInstance = previous;
      }
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
    } else if (typeof node === 'object') {
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
    ActivityIndicator: host('ActivityIndicator'),
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    Switch: host('Switch'),
    Text: host('Text'),
    TextInput: host('TextInput'),
    View: host('View'),
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
  };
  const component = (name) => (props) => React.createElement(name, props, props.children);
  const SettingsRow = ({ label, description, value, onPress, disabled = false }) => React.createElement('SettingsRow', {
    accessibilityRole: onPress ? 'button' : undefined,
    accessibilityLabel: label,
    accessibilityState: { disabled },
    disabled,
    onPress,
  }, label, description || '', value || '');
  const Button = ({ title, onPress, disabled = false }) => React.createElement('Button', {
    accessibilityRole: 'button', accessibilityLabel: title, accessibilityState: { disabled }, disabled, onPress,
  }, title);
  const theme = { colors: new Proxy({}, { get: (_, key) => String(key) }) };
  const details = { data: environment.group, loading: false, error: null, verified: true, refresh: async () => environment.group };
  const mocks = new Map([
    ['react', React],
    ['react-native', reactNative],
    ['expo-image-picker', { __esModule: true, launchImageLibraryAsync: async () => ({ canceled: true }) }],
    ['@react-navigation/native', { __esModule: true, useFocusEffect: (callback) => React.useEffect(callback, [callback]) }],
    ['@expo/vector-icons', { __esModule: true, Ionicons: component('Ionicons') }],
    ['react-native-safe-area-context', { __esModule: true, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }],
  ]);
  const absoluteMocks = new Map([
    [normalize(path.join(sourceRoot, 'store', 'AuthContext.js')), { __esModule: true, useAuth: () => ({ user: environment.user }) }],
    [normalize(path.join(sourceRoot, 'store', 'ThemeContext.js')), { __esModule: true, useTheme: () => theme }],
    [normalize(path.join(sourceRoot, 'hooks', 'useConversationDetails.js')), { __esModule: true, default: () => details }],
    [normalize(path.join(sourceRoot, 'hooks', 'useSocketStatus.js')), { __esModule: true, default: () => true }],
    [normalize(path.join(sourceRoot, 'components', 'Avatar.js')), { __esModule: true, default: component('Avatar') }],
    [normalize(path.join(sourceRoot, 'components', 'Button.js')), { __esModule: true, default: Button }],
    [normalize(path.join(sourceRoot, 'components', 'SettingsRow.js')), { __esModule: true, default: SettingsRow }],
    [normalize(path.join(sourceRoot, 'components', 'ConfirmationDialog.js')), { __esModule: true, default: component('ConfirmationDialog') }],
    [normalize(path.join(sourceRoot, 'api', 'conversation.api.js')), {
      __esModule: true,
      getConversationMediaApi: async (id, params) => {
        environment.mediaCalls.push([id, params]);
        return { data: { counts: environment.mediaCounts } };
      },
      leaveConversationApi: async () => ({}),
      updateConversationApi: async () => ({}),
      updateConversationSettingsApi: async () => ({}),
    }],
    [normalize(path.join(sourceRoot, 'api', 'upload.api.js')), { __esModule: true, uploadChatImageApi: async () => ({ data: {} }) }],
    [normalize(path.join(sourceRoot, 'theme', 'tokens.js')), {
      __esModule: true,
      spacing: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
      typography: { family: { body: 'body' } },
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

  const Screen = loadModule(path.join(sourceRoot, 'screens', 'GroupSettingsScreen.js')).default;
  const navigation = { navigate: (...args) => environment.navigationCalls.push(args) };

  function mount() {
    rootElement = React.createElement(Screen, {
      route: { params: { conversationId, initialConversation: environment.group, initialUserId: environment.user?.id } },
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

  function byLabel(label) {
    const matches = allNodes().filter((node) => node.props.accessibilityLabel === label);
    assert.equal(matches.length, 1, `Expected one node labeled ${label}, found ${matches.length}. Rendered text: ${textContent()}`);
    return matches[0];
  }

  function unmount() {
    rootElement = null;
    performRender();
  }

  return {
    environment,
    mount,
    unmount,
    act,
    byLabel,
    text: () => textContent(),
  };
}
