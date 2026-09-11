import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { loginApi, registerApi, getMeApi, logoutApi } from '../api/auth.api';
import { connectSocket, disconnectSocket } from '../api/socket';
import { setUnauthorizedHandler } from '../api/client';
import { saveToken, saveUser, clearAuth, getToken, getUser } from '../utils/storage';
import { revokePushDeviceApi } from '../api/notification.api';
import { getPushInstallationId } from '../utils/pushInstallation';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.user, token: action.token, loading: false };
    case 'UPDATE_USER':
      if (!state.token || String(state.user?.id) !== String(action.expectedUserId)) return state;
      return { ...state, user: { ...state.user, ...action.user } };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const sessionRef = useRef(0);
  const userSyncRef = useRef(0);
  const storageQueueRef = useRef(Promise.resolve());
  stateRef.current = state;

  const enqueueStorage = (operation) => {
    const queued = storageQueueRef.current.catch(() => {}).then(operation);
    storageQueueRef.current = queued.catch(() => {});
    return queued;
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      sessionRef.current += 1;
      userSyncRef.current += 1;
      disconnectSocket();
      enqueueStorage(clearAuth).catch(() => {});
      dispatch({ type: 'LOGOUT' });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const sessionId = sessionRef.current;
      const token = await getToken();
      const user = await getUser();
      if (token && user) {
        try {
          const res = await getMeApi();
          if (sessionId !== sessionRef.current) return;
          await enqueueStorage(async () => {
            if (sessionId !== sessionRef.current) return;
            await saveUser(res.data.user);
          });
          if (sessionId !== sessionRef.current) return;
          connectSocket(token);
          dispatch({ type: 'SET_AUTH', user: res.data.user, token });
        } catch {
          if (sessionId !== sessionRef.current) return;
          disconnectSocket();
          await enqueueStorage(clearAuth);
          if (sessionId !== sessionRef.current) return;
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        if (sessionId !== sessionRef.current) return;
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await loginApi({ email, password });
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    userSyncRef.current += 1;
    await enqueueStorage(async () => {
      if (sessionId !== sessionRef.current) return;
      await saveToken(res.data.token);
      await saveUser(res.data.user);
    });
    if (sessionId !== sessionRef.current) return;
    connectSocket(res.data.token);
    dispatch({ type: 'SET_AUTH', user: res.data.user, token: res.data.token });
  };

  const register = async (name, email, password) => {
    const res = await registerApi({ name, email, password });
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    userSyncRef.current += 1;
    await enqueueStorage(async () => {
      if (sessionId !== sessionRef.current) return;
      await saveToken(res.data.token);
      await saveUser(res.data.user);
    });
    if (sessionId !== sessionRef.current) return;
    connectSocket(res.data.token);
    dispatch({ type: 'SET_AUTH', user: res.data.user, token: res.data.token });
  };

  const logout = async () => {
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    userSyncRef.current += 1;
    try {
      const installationId = await getPushInstallationId();
      await revokePushDeviceApi(installationId);
    } catch {
      // A local logout remains valid when the device is offline; server revocation is best effort.
    }
    try {
      await logoutApi();
    } catch {
      // Offline logout still clears the local session; presence will reconcile on a later login.
    }
    disconnectSocket();
    await enqueueStorage(clearAuth);
    if (sessionId !== sessionRef.current) return;
    dispatch({ type: 'LOGOUT' });
  };

  const refreshUser = async () => {
    const sessionId = sessionRef.current;
    const requestId = userSyncRef.current + 1;
    userSyncRef.current = requestId;
    const expectedUserId = stateRef.current.user?.id;
    const res = await getMeApi();
    if (sessionId !== sessionRef.current || requestId !== userSyncRef.current || !stateRef.current.token) return null;
    if (String(stateRef.current.user?.id) !== String(expectedUserId)) return null;
    const persisted = await enqueueStorage(async () => {
      if (sessionId !== sessionRef.current || requestId !== userSyncRef.current) return false;
      await saveUser(res.data.user);
      return sessionId === sessionRef.current && requestId === userSyncRef.current;
    });
    if (!persisted) return null;
    dispatch({ type: 'UPDATE_USER', user: res.data.user, expectedUserId });
    return res.data.user;
  };

  const updateUser = async (nextUser) => {
    const current = stateRef.current;
    const sessionId = sessionRef.current;
    if (!current.token || !current.user?.id || !nextUser) return false;
    const expectedUserId = current.user.id;
    if (nextUser.id != null && String(nextUser.id) !== String(expectedUserId)) return false;
    userSyncRef.current += 1;

    const mergedUser = { ...current.user, ...nextUser };
    const persisted = await enqueueStorage(async () => {
      if (
        sessionId !== sessionRef.current ||
        !stateRef.current.token ||
        String(stateRef.current.user?.id) !== String(expectedUserId)
      ) return false;
      await saveUser(mergedUser);
      return sessionId === sessionRef.current;
    });
    if (!persisted) return false;
    dispatch({ type: 'UPDATE_USER', user: mergedUser, expectedUserId });
    return true;
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
