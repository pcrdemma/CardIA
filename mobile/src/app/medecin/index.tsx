import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexMedecinScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>ESPACE MÉDECIN</Text>
            <Text style={styles.title}>Bonjour, Docteur 👋</Text>
          </View>

          <TouchableOpacity onPress={() => router.replace("/")}>
            <Text style={styles.logout}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>🔔 Alertes</Text>
          <Text style={styles.alertText}>Aucune nouvelle alerte pour le moment.</Text>
        </View>

        <Text style={styles.sectionTitle}>Tableau de bord</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Patients suivis</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Rendez-vous aujourd’hui</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Planning</Text>
          <Text style={styles.cardText}>Vos prochains rendez-vous apparaîtront ici.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧑‍⚕️ Dossiers patients</Text>
          <Text style={styles.cardText}>Consultez les patients et leur historique de santé.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Messagerie</Text>
          <Text style={styles.cardText}>Répondez aux messages de vos patients.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Mon profil</Text>
          <Text style={styles.cardText}>Gérez vos informations professionnelles.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1,backgroundColor: "#F4F8FB"},
  container: { flexGrow: 1, padding: 22, backgroundColor: "#F4F8FB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  label: { color: "#188B8B", fontSize: 12, fontWeight: "700" },
  title: { color: "#17324D", fontSize: 23, fontWeight: "700", marginTop: 5 },
  logout: { color: "#D9534F", fontWeight: "600" },
  alertCard: { backgroundColor: "#FFF3E5", borderRadius: 14, padding: 18, marginBottom: 24 },
  alertTitle: { color: "#8A4B08", fontSize: 16, fontWeight: "700", marginBottom: 7 },
  alertText: { color: "#795B3A" },
  sectionTitle: { color: "#17324D", fontSize: 19, fontWeight: "700", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 13 },
  statCard: { flex: 1, backgroundColor: "white", borderRadius: 14, padding: 17 },
  statNumber: { color: "#188B8B", fontSize: 27, fontWeight: "700" },
  statLabel: { color: "#687786", marginTop: 5 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 18, marginBottom: 13 },
  cardTitle: { color: "#17324D", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  cardText: { color: "#687786", lineHeight: 21 },
});