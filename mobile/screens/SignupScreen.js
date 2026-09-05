import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onSignup = async () => {
    if (!form.username || !form.email || !form.password) {
      return Alert.alert("Error", "Username, email, password required");
    }
    setLoading(true);
    try {
      await register(form);
    } catch (e) {
      Alert.alert("Signup failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#1a0a14", "#000"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.logo}>Join Gacuriro Fam</Text>

        {["fullName", "username", "email", "password", "location"].map((key) => (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={key === "fullName" ? "Full name" : key.charAt(0).toUpperCase() + key.slice(1)}
            placeholderTextColor="#888"
            autoCapitalize={key === "email" || key === "username" ? "none" : "sentences"}
            secureTextEntry={key === "password"}
            keyboardType={key === "email" ? "email-address" : "default"}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
          />
        ))}

        <TouchableOpacity style={styles.btn} onPress={onSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 24, paddingTop: 80 },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ff4d9e",
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#ff4d9e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#aaa", textAlign: "center", marginTop: 24 },
  linkBold: { color: "#ff4d9e", fontWeight: "700" },
});