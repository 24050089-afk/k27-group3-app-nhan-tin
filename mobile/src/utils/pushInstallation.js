import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY = 'proxy_push_installation_id_v1';

const makeId = () => Crypto.randomUUID();

export const getPushInstallationId = async () => {
  let value = await SecureStore.getItemAsync(KEY);
  if (!value) {
    value = makeId();
    await SecureStore.setItemAsync(KEY, value);
  }
  return value;
};
