import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

export default function CustomHeader({ title }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <View style={[
      styles.headerBar,
      {
        backgroundColor: theme.background,
        borderBottomColor: isDark ? "#232323" : "#eee",
        // No zIndex!
        // No position: "absolute"!
      }
    ]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.arrowContainer}>
        <Ionicons name="arrow-back" size={28} color={theme.brand} />
      </TouchableOpacity>
      <Text style={[
        styles.headerText,
        {
          color: theme.brand,
          textShadowColor: isDark ? "#222" : "#fff",
        }
      ]}>
        {title}
      </Text>
      <View style={{ width: 40 }} /> {/* Spacer to balance header */}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // Typical safe area heights: iOS = 52, Android = 24
    paddingTop: Platform.OS === "ios" ? 52 : 24,
    paddingBottom: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    // zIndex REMOVED!
    // no position: "absolute"
    // no shadow
  },
  arrowContainer: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});