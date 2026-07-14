import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import AuthHeader from "../components/AuthHeader";
import AppTextInput from "../components/AppTextInput";
import PrimaryButton from "../components/PrimaryButton";

import { addPet } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AddPetScreen() {
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();

    async function handleAddPet() {
    setError("");

    if (!claimCode.trim()) {
        setError("Please enter a pairing code.");
        return;
    }

    if (!user) {
        setError("You must be logged in to add a pet.");
        return;
    }

    try {
        await addPet(user.userId, claimCode.trim());

        router.back();
    } catch (err) {
        if (err instanceof Error) {
        setError(err.message);
        } else {
        setError("Unable to add pet.");
        }
    }
    }

  return (
    <ScreenContainer>
      <AuthHeader
        title="Add Pet"
        subtitle="Enter the pairing code included with your tracker."
      />

      <AppTextInput
        placeholder="Pairing Code"
        autoCapitalize="characters"
        value={claimCode}
        onChangeText={setClaimCode}
      />

      {error ? (
        <Text
          style={{
            color: "#dc2626",
            marginBottom: 12,
            fontWeight: "600",
          }}
        >
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        title="Add Pet"
        onPress={handleAddPet}
      />
    </ScreenContainer>
  );
}