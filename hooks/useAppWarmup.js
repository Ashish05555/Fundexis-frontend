import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";

/**
 * Preloads icon fonts and holds the splash screen until ready.
 * This prevents icons from rendering as empty squares on first paint.
 */
export function useAppWarmup() {
  const [loaded, error] = useFonts({
    ...Ionicons.font,
    // If you use other @expo/vector-icons packs, add them here:
    // ...MaterialCommunityIcons.font,
    // ...Entypo.font,
  });

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  return loaded;
}