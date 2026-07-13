import Constants from 'expo-constants';

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';
