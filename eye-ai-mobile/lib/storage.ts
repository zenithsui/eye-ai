import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveKey(provider: string, key: string): Promise<void> {
  await AsyncStorage.setItem(`eyeai_key_${provider}`, btoa(key));
}

export async function getKey(provider: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(`eyeai_key_${provider}`);
  return stored ? atob(stored) : null;
}

export async function getSetting(key: string): Promise<string | null> {
  return AsyncStorage.getItem(`eyeai_setting_${key}`);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(`eyeai_setting_${key}`, value);
}

export async function getUserName(): Promise<string | null> {
  return AsyncStorage.getItem("eyeai_name");
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem("eyeai_name", name);
}

export async function loadHistory(): Promise<
  Array<{ role: string; content: string }>
> {
  const saved = await AsyncStorage.getItem("eyeai_history");
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export async function saveHistory(
  history: Array<{ role: string; content: string }>
): Promise<void> {
  await AsyncStorage.setItem(
    "eyeai_history",
    JSON.stringify(history.slice(-20))
  );
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem("eyeai_history");
}

export async function hasAnyKey(): Promise<boolean> {
  const providers = [
    "groq",
    "gemini",
    "openrouter",
    "cerebras",
    "mistral",
    "huggingface",
  ];
  for (const p of providers) {
    const key = await getKey(p);
    if (key) return true;
  }
  return false;
}
