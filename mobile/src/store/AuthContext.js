import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { loginApi, registerApi, getMeApi } from '../api/auth.api';
import { saveToken, saveUser, clearAuth, getToken, getUser } from '../utils/storage';

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

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const user = await getUser();
      if (token && user) {
        dispatch({ type: 'SET_AUTH', user, token });
      } else {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await loginApi({ email, password });
    await saveToken(res.data.token);
    await saveUser(res.data.user);
    dispatch({ type: 'SET_AUTH', user: res.data.user, token: res.data.token });
  };

  const register = async (name, email, password) => {
    const res = await registerApi({ name, email, password });
    await saveToken(res.data.token);
    await saveUser(res.data.user);
    dispatch({ type: 'SET_AUTH', user: res.data.user, token: res.data.token });
  };

  const logout = async () => {
    await clearAuth();
    dispatch({ type: 'LOGOUT' });
  };

  const refreshUser = async () => {
    const res = await getMeApi();
    await saveUser(res.data.user);
    dispatch({ type: 'SET_AUTH', user: res.data.user, token: state.token });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
