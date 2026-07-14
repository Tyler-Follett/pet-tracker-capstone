import { useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import AppTextInput from "../../components/AppTextInput";
import PrimaryButton from "../../components/PrimaryButton";
import AuthHeader from "../../components/AuthHeader";
import { register } from "../../services/api";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  async function handleRegister() {
    setError("");

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register(
        firstName,
        lastName,
        email,
        password
      );

      router.replace("/(auth)/login");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed.");
      }
    }
  }

  return (
    <ScreenContainer>
      <AuthHeader
        title="Create Account"
        subtitle="Register to start tracking your pets."
      />

      <AppTextInput placeholder="First name" value={firstName} onChangeText={setFirstName} />
      <AppTextInput placeholder="Last name" value={lastName} onChangeText={setLastName} />
      <AppTextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <AppTextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <AppTextInput placeholder="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Register" onPress={handleRegister} />

      <Pressable onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  link: {
    color: "#2563eb",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontWeight: "600",
  },
});