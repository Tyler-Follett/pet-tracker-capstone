import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useState } from "react";

import ScreenContainer from "../../components/ScreenContainer";
import AppTextInput from "../../components/AppTextInput";
import PrimaryButton from "../../components/PrimaryButton";
import AuthHeader from "../../components/AuthHeader";

import { useAuth } from "../../context/AuthContext";
import { login } from "../../services/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();

  async function handleLogin() {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      const user = await login(email, password);

      signIn(user);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed.");
      }
    }
  }

  return (
    <ScreenContainer>
      <AuthHeader
        title="Welcome Back"
        subtitle="Log in to track your pets."
      />

      <AppTextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <AppTextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        title="Log In"
        onPress={handleLogin}
      />

      <Pressable onPress={() => router.push("/(auth)/register")}>
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontWeight: "600",
  },
  link: {
    color: "#2563eb",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },
});