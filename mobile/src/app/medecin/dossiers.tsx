import { View, Text, StyleSheet } from "react-native";

export default function DossierScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dossiers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F4F8FB",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#17324D",
  },
});