import React, { memo } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CrossPlatformIcon from "./CrossPlatformIcon";

// Tab info for icons (ensure matches your Tab.Screen names!)
const TABS = [
  { name: "Home", icon: "home" },
  { name: "Challenges", icon: "trophy" },
  { name: "Trade", icon: "bar-chart" },
  { name: "Profile", icon: "person-circle" },
];

const BRAND_BLUE = "#120FD8";
const INACTIVE = "#B7BDD8";
const TAB_BAR_BG = "#ffffff";

const PILL_HEIGHT = 64;
const PILL_MARGIN_BOTTOM = 10;

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const extraBottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 14 : 8);
  const spacerHeight = PILL_HEIGHT + PILL_MARGIN_BOTTOM + extraBottomPad;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Reserve space so content doesn't sit under the floating bar */}
      <View style={{ height: spacerHeight }} />

      <View style={styles.absoluteFill} pointerEvents="box-none">
        <View
          style={[
            styles.pill,
            { bottom: PILL_MARGIN_BOTTOM + extraBottomPad },
            Platform.OS === "web"
              ? { boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)" }
              : null,
          ]}
        >
          {state.routes.map((route, idx) => {
            const descriptor = descriptors[route.key] || {};
            const options = descriptor.options || {};
            const label = options.tabBarLabel ?? options.title ?? route.name;

            const isFocused = state.index === idx;
            const baseIcon = TABS.find((t) => t.name === route.name)?.icon || "home";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate({ name: route.name, merge: true });
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                style={styles.item}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={isFocused ? styles.activeIconWrap : styles.iconWrap}>
                  <CrossPlatformIcon
                    name={baseIcon}
                    active={isFocused}
                    color={isFocused ? BRAND_BLUE : INACTIVE}
                    size={22}
                    style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? BRAND_BLUE : INACTIVE },
                    Platform.OS === "web" ? { userSelect: "none" } : null,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default memo(CustomTabBar);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    zIndex: 100,
  },
  absoluteFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  pill: {
    position: "absolute",
    left: 16,
    right: 16,
    height: PILL_HEIGHT,
    backgroundColor: TAB_BAR_BG,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    // subtle outline for 3D feel
    borderWidth: 1,
    borderColor: "rgba(23,64,255,0.10)",

    // iOS shadow
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },

    // Android elevation
    elevation: 16,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minWidth: 64,
  },
  iconWrap: {
    borderRadius: 16,
    padding: 6,
  },
  activeIconWrap: {
    backgroundColor: "#E9EEFF",
    borderRadius: 16,
    padding: 6,
    marginBottom: -2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 0.1,
  },
});