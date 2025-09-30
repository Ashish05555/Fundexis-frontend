import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define your color palettes here
const lightTheme = {
  mode: "light",
  background: "#F7FAFF",
  card: "#F7F8FF",
  border: "#E9EEFF",
  text: "#222",
  textSecondary: "#6E7FAA",
  brand: "#120FD8",
  sectionTitle: "#2540F6",
  white: "#fff",
  header: "#120FD8",
  error: "#e53935",
};

const darkTheme = {
  mode: "dark",
  background: "#10192A",
  card: "#1B2239",
  border: "#27304B",
  text: "#f6f6f6",
  textSecondary: "#BFC8E6",
  brand: "#7B80FF",
  sectionTitle: "#7B80FF",
  white: "#222",
  header: "#1B2239",
  error: "#e53935",
};

const ThemeContext = createContext({
  theme: lightTheme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    (async () => {
      // Try loading from AsyncStorage first
      const saved = await AsyncStorage.getItem("@theme");
      if (saved === "dark") setTheme(darkTheme);
      else if (saved === "light") setTheme(lightTheme);
      else {
        // Otherwise, use system preference as fallback
        const sys = Appearance.getColorScheme();
        setTheme(sys === "dark" ? darkTheme : lightTheme);
      }
    })();
  }, []);

  // When theme changes, persist it
  const toggleTheme = async () => {
    const nextTheme = theme.mode === "light" ? darkTheme : lightTheme;
    setTheme(nextTheme);
    await AsyncStorage.setItem("@theme", nextTheme.mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}