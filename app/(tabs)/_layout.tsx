import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";

export default function TabLayout() {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBar.activeTint,
        tabBarInactiveTintColor: colors.tabBar.inactiveTint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
          href: isAdmin ? null : "/",
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="calendar-today" color={color} />
          ),
          href: isAdmin ? null : "/attendance",
        }}
      />
      <Tabs.Screen
        name="job-pool"
        options={{
          title: "Job Pool",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="briefcase" color={color} />
          ),
          href: isAdmin ? null : "/job-pool",
        }}
      />
      <Tabs.Screen
        name="admin-jobs"
        options={{
          title: "Manage Jobs",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="business-center" color={color} />
          ),
          href: isAdmin ? "/admin-jobs" : null,
        }}
      />
      <Tabs.Screen
        name="admin-attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="fact-check" color={color} />
          ),
          href: isAdmin ? "/admin-attendance" : null,
        }}
      />
      <Tabs.Screen
        name="admin-leave"
        options={{
          title: "Leaves",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="event-note" color={color} />
          ),
          href: isAdmin ? "/admin-leave" : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
