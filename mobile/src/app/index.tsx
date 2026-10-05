import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function connect(role: "patient" | "medecin") {
    const emailSaisi = email.trim().toLowerCase();
    const motDePasseSaisi = password.trim();

    const comptes = {
      patient: {
        email: "patient1@cardia.test",
        password: "Patient123",
      },
      medecin: {
        email: "medecin1@cardia.test",
        password: "Medecin123",
      },
    };

    const compte = comptes[role];

    if (
      emailSaisi !== compte.email ||
      motDePasseSaisi !== compte.password
    ) {
      Alert.alert(
        "Connexion refusée",
        "Vérifie l’adresse e-mail et le mot de passe."
      );
      return;
    }
    if (role === "patient") {
      router.replace("/patient");
    } else {
      router.replace("/medecin");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.brand}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>+</Text>
              </View>
              <Text style={styles.logo}>Card<Text style={styles.logoAccent}>IA</Text></Text>
            </View>

            <View style={styles.heading}>
              <Text style={styles.eyebrow}>VOTRE SANTÉ, EN UN SEUL ESPACE</Text>
              <Text style={styles.title}>Bienvenue</Text>
              <Text style={styles.subtitle}>
                Connectez-vous pour accéder à votre espace santé.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="exemple@courriel.com"
                placeholderTextColor="#9AA8B5"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
              />

              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez votre mot de passe"
                placeholderTextColor="#9AA8B5"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
              />

              <Text style={styles.roleTitle}>Choisissez votre espace</Text>

              <TouchableOpacity
                style={styles.patientButton}
                onPress={() => connect("patient")}
                activeOpacity={0.85}
              >
                <Text style={styles.patientButtonText}>
                  Continuer comme patient
                </Text>
                <Text style={styles.buttonArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doctorButton}
                onPress={() => connect("medecin")}
                activeOpacity={0.85}
              >
                <Text style={styles.doctorButtonText}>
                  Continuer comme médecin
                </Text>
                <Text style={styles.doctorButtonArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.note}>
                Connexion de démonstration · Les identifiants sont préconfigurés.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F8FB",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 42,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#176B87",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoIconText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 32,
  },
  logo: {
    color: "#17324D",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: "#176B87",
  },
  heading: {
    marginBottom: 28,
  },
  eyebrow: {
    color: "#258A91",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    color: "#17324D",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: "#718096",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    width: "100%",
  },
  label: {
    color: "#34495A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#17324D",
    borderWidth: 1,
    borderColor: "#E3EAF0",
    marginBottom: 18,
  },
  roleTitle: {
    color: "#17324D",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 12,
  },
  patientButton: {
    minHeight: 54,
    backgroundColor: "#176B87",
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  patientButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonArrow: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 29,
  },
  doctorButton: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#C9DCE4",
  },
  doctorButtonText: {
    color: "#176B87",
    fontSize: 15,
    fontWeight: "700",
  },
  doctorButtonArrow: {
    color: "#176B87",
    fontSize: 27,
    lineHeight: 29,
  },
  footer: {
    marginTop: 25,
  },
  note: {
    color: "#82909D",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});