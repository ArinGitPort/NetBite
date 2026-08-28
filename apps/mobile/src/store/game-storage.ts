import Storage from 'expo-sqlite/kv-store';

// Native builds use SQLite for durable, app-local game progress.
export const gameStorage = Storage;
