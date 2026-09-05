import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../utils/api";
import { API_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CreateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [asset, setAsset] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = async (useCamera) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission needed");
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.8,
        });

    if (!result.canceled) setAsset(result.assets[0]);
  };

  const share = async () => {
    if (!asset) return Alert.alert("Select media first");
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const form = new FormData();
      form.append("media", {
        uri: asset.uri,
        name: asset.fileName || "upload.jpg",
        type: asset.mimeType || "image/jpeg",
      });
      form.append("caption", caption);

      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      Alert.alert("Posted!");
      setAsset(null);
      setCaption("");
      navigation.navigate("Home");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>New post</Text>
        <TouchableOpacity onPress={share} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ff4d9e" />
          ) : (
            <Text style={styles.share}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {asset ? (
        <Image source={{ uri: asset.uri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <TouchableOpacity style={styles.btn} onPress={() => pick(false)}>
            <Text style={styles.btnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => pick(true)}>
            <Text style={styles.btnText}>Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.caption}
        placeholder="Write a caption..."
        placeholderTextColor="#888"
        multiline
        value={caption}
        onChangeText={setCaption}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#262626",
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 16 },
  share: { color: "#ff4d9e", fontWeight: "700", fontSize: 16 },
  preview: { width: "100%", height: 320, backgroundColor: "#111" },
  placeholder: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#111",
  },
  btn: {
    backgroundColor: "#ff4d9e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#ff4d9e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  caption: {
    color: "#fff",
    padding: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
});