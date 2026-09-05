import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { api, mediaUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function StoryBar() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    api("/api/stories")
      .then((d) => setStories(d.stories || []))
      .catch(() => {});
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={{ paddingHorizontal: 12 }}
    >
      <View style={styles.item}>
        <View style={[styles.ring, styles.own]}>
          <Image
            source={{ uri: mediaUrl(user?.avatar) || undefined }}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          Your story
        </Text>
      </View>

      {stories.map((s) => (
        <TouchableOpacity key={s._id} style={styles.item}>
          <View style={[styles.ring, s.seen && styles.seen]}>
            <Image
              source={{ uri: mediaUrl(s.user?.avatar) || undefined }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {s.user?.username}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#262626",
    paddingVertical: 12,
  },
  item: { alignItems: "center", marginRight: 14, width: 70 },
  ring: {
    padding: 2,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#dd2a7b",
  },
  own: { borderColor: "#555", borderStyle: "dashed" },
  seen: { borderColor: "#555" },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
  },
  name: { color: "#fff", fontSize: 11, marginTop: 4, maxWidth: 70 },
});