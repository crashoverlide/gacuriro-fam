import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // adjust path if needed

const { width } = Dimensions.get("window");

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
    // navigation.navigate("Login"); // uncomment if you have navigation
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.username}>{user?.username || "username"}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Text style={styles.more}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Avatar + Stats */}
        <View style={styles.profileRow}>
          <Image
            source={{
              uri: user?.avatar || "https://via.placeholder.com/150",
            }}
            style={styles.avatar}
          />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>4</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>
        </View>

        {/* Name */}
        <Text style={styles.fullName}>{user?.fullName || "Full Name"}</Text>
        <Text style={styles.bio}>{user?.bio || ""}</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editText}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.editText}>Share profile</Text>
          </TouchableOpacity>
        </View>

        {/* Highlights */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlights}>
          {["New", "Best", "Family", "Friends", "Travel"].map((item, i) => (
            <View key={i} style={styles.highlightItem}>
              <View style={[styles.highlightCircle, i === 0 && styles.dashed]}>
                {i === 0 ? (
                  <Text style={{ fontSize: 28, color: "#888" }}>+</Text>
                ) : (
                  <Image
                    source={{ uri: user?.avatar }}
                    style={styles.highlightImage}
                  />
                )}
              </View>
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* ===== SETTINGS MENU (Mobile) ===== */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <MenuItem
              icon="⚙️"
              label="Settings and privacy"
              onPress={() => {
                setMenuVisible(false);
                // navigation.navigate("Settings");
              }}
            />
            <MenuItem icon="🕐" label="Your activity" onPress={() => setMenuVisible(false)} />
            <MenuItem icon="🌙" label="Switch appearance" onPress={() => setMenuVisible(false)} />
            <MenuItem icon="📅" label="Scheduled content" onPress={() => setMenuVisible(false)} />
            <MenuItem icon="↗️" label="Share profile" onPress={() => setMenuVisible(false)} />
            <MenuItem icon="🔗" label="Copy link" onPress={() => setMenuVisible(false)} />
            <MenuItem icon="⚠️" label="Report a problem" onPress={() => setMenuVisible(false)} />

            <View style={styles.divider} />

            <MenuItem
              icon="🚪"
              label="Log out"
              danger
              onPress={handleLogout}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && { color: "#ff3b30" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  username: { color: "#fff", fontSize: 20, fontWeight: "700" },
  more: { color: "#fff", fontSize: 28, fontWeight: "300" },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: "#333",
  },
  stats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginLeft: 20,
  },
  stat: { alignItems: "center" },
  statNumber: { color: "#fff", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#aaa", fontSize: 13 },
  fullName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 12,
    marginHorizontal: 16,
  },
  bio: { color: "#ddd", fontSize: 14, marginHorizontal: 16, marginTop: 4 },
  buttons: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  shareBtn: {
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  editText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  highlights: { marginTop: 20, paddingLeft: 16 },
  highlightItem: { alignItems: "center", marginRight: 16 },
  highlightCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  dashed: { borderStyle: "dashed" },
  highlightImage: { width: 66, height: 66, borderRadius: 33 },
  highlightText: { color: "#fff", fontSize: 12, marginTop: 6 },

  // Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  menu: {
    backgroundColor: "#1c1c1e",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuIcon: { fontSize: 20, width: 32 },
  menuLabel: { color: "#fff", fontSize: 16 },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 8,
  },
});