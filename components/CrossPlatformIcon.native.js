import React, { memo } from "react";
import { Ionicons } from "@expo/vector-icons";

function CrossPlatformIcon({ name = "home", active = false, color, size = 22, style }) {
  const iconName = `${name}${active ? "" : "-outline"}`;
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}

export default memo(CrossPlatformIcon);