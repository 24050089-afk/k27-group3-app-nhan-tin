import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@lt_web_token';
const USER_KEY = '@lt_web_user';

export const saveToken = (token) => AsyncStorage.setItem(TOKEN_KEY, token);
export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const removeToken = () => AsyncStorage.removeItem(TOKEN_KEY);

export const saveUser = (user) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const removeUser = () => AsyncStorage.removeItem(USER_KEY);

export const clearAuth = () =>
  AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
