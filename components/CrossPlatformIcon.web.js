import React, { memo } from "react";
import {
  IoHomeOutline, IoHome,
  IoTrophyOutline, IoTrophy,
  IoBarChartOutline, IoBarChart,
  IoPersonCircleOutline, IoPersonCircle,
  IoCartOutline, IoCart
} from "react-icons/io5";

const ICONS = {
  "home": [IoHomeOutline, IoHome],
  "trophy": [IoTrophyOutline, IoTrophy],
  "bar-chart": [IoBarChartOutline, IoBarChart],
  "person-circle": [IoPersonCircleOutline, IoPersonCircle],
  "cart": [IoCartOutline, IoCart],
};

function CrossPlatformIcon({ name = "home", active = false, color, size = 22, style }) {
  const pair = ICONS[name] || ICONS["home"];
  const Icon = active ? pair[1] : pair[0];
  return <Icon size={size} color={color} style={style} />;
}

export default memo(CrossPlatformIcon);