import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexPatientScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>ESPACE PATIENT</Text>
            <Text style={styles.title}>Bonjour, Patient 👋</Text>
          </View>

          <TouchableOpacity onPress={() => router.replace("/")}>
            <Text style={styles.logout}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heartCard}>
          <Text style={styles.cardLabel}>Rythme cardiaque</Text>
          <Text style={styles.heartRate}>72 <Text style={styles.bpm}>BPM</Text></Text>
          <Text style={styles.status}>● Fréquence normale</Text>
        </View>

        <Text style={styles.sectionTitle}>Mon espace santé</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Mes rendez-vous</Text>
          <Text style={styles.cardText}>Aucun rendez-vous à venir.</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Prendre rendez-vous</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Messagerie</Text>
          <Text style={styles.cardText}>Échangez avec votre médecin.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📄 Mes documents</Text>
          <Text style={styles.cardText}>Ordonnances et documents médicaux apparaîtront ici.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Mon profil</Text>
          <Text style={styles.cardText}>Consultez et modifiez vos informations personnelles.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F8FB" },
  container: { flexGrow: 1, padding: 22, backgroundColor: "#F4F8FB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  label: { color: "#188B8B", fontSize: 12, fontWeight: "700" },
  title: { color: "#17324D", fontSize: 23, fontWeight: "700", marginTop: 5 },
  logout: { color: "#D9534F", fontWeight: "600" },
  heartCard: { backgroundColor: "#188B8B", borderRadius: 18, padding: 22, marginBottom: 24 },
  cardLabel: { color: "white", fontSize: 15 },
  heartRate: { color: "white", fontSize: 42, fontWeight: "700", marginVertical: 8 },
  bpm: { fontSize: 17, fontWeight: "400" },
  status: { color: "#D9FFF1" },
  sectionTitle: { color: "#17324D", fontSize: 19, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 18, marginBottom: 13 },
  cardTitle: { color: "#17324D", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  cardText: { color: "#687786", lineHeight: 21 },
  button: { backgroundColor: "#188B8B", padding: 12, borderRadius: 9, marginTop: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});