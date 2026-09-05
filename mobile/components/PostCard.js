import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, mediaUrl } from "../utils/api";

const { width } = Dimensions.get("window");

export default function PostCard({ post, onPressUser }) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount || 0);

  const media = post.media?.[0];
  const uri = mediaUrl(media?.url);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => (next ? n + 1 : n - 1));
    try {
      await api(`/api/posts/${post._id}/like`, { method: "POST" });
    } catch {}
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => onPressUser?.(post.user?.username)}
      >
        <Image
          source={{ uri: mediaUrl(post.user?.avatar) || undefined }}
          style={styles.avatar}
        />
        <Text style={styles.username}>{post.user?.username}</Text>
      </TouchableOpacity>

      {uri ? (
        <TouchableOpacity activeOpacity={0.95} onPress={toggleLike}>
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={26}
            color={liked ? "#ff2d55" : "#fff"}
          />
        </TouchableOpacity>
        <Ionicons name="chatbubble-outline" size={24} color="#fff" style={{ marginLeft: 16 }} />
        <Ionicons name="paper-plane-outline" size={24} color="#fff" style={{ marginLeft: 16 }} />
      </View>

      {likes > 0 && <Text style={styles.likes}>{likes} likes</Text>}
      {!!post.caption && (
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.user?.username} </Text>
          {post.caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    marginRight: 10,
  },
  username: { color: "#fff", fontWeight: "700" },
  image: { width, height: width, backgroundColor: "#111" },
  actions: { flexDirection: "row", padding: 12 },
  likes: { color: "#fff", fontWeight: "700", paddingHorizontal: 12 },
  caption: { color: "#fff", paddingHorizontal: 12, marginTop: 4 },
});