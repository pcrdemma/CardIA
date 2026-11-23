import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar } from "react-native-calendars";

type Periode = "Matin" | "Après-midi";

type Creneau = {
  heure: string;
  periode: Periode;
};

type RendezVous = {
  type: string;
  medecin: string;
  lieu: string;
  date: string; // Format YYYY-MM-DD
  heure: string; // Format HH:mm
  plageHoraire?: string;
};

const CLE_RENDEZ_VOUS = "rendezVousPatient";

const MEDECINS = [
  "Dr. Sophie Martin — Cardiologue",
  "Dr. Alex Roy — Médecine générale",
];

const LIEUX = ["Cabinet principal", "Centre médical"];

const HEURES_MATIN = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
];

const HEURES_APRES_MIDI = [
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

function melanger<T>(liste: T[]): T[] {
  const resultat = [...liste];

  for (let i = resultat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
  }

  return resultat;
}

function choisirHeuresAleatoires(heures: string[]): string[] {
  // Entre 2 et 5 horaires aléatoires sont affichés.
  const nombreDisponibles = Math.floor(Math.random() * 4) + 2;

  return melanger(heures)
    .slice(0, nombreDisponibles)
    .sort((a, b) => a.localeCompare(b));
}

function genererCreneauxDisponibles(): Creneau[] {
  const creneauxMatin = choisirHeuresAleatoires(HEURES_MATIN).map(
    (heure): Creneau => ({
      heure,
      periode: "Matin",
    })
  );

  const creneauxApresMidi = choisirHeuresAleatoires(HEURES_APRES_MIDI).map(
    (heure): Creneau => ({
      heure,
      periode: "Après-midi",
    })
  );

  return [...creneauxMatin, ...creneauxApresMidi];
}

function dateLocale(date: string) {
  const [annee, mois, jour] = date.split("-").map(Number);

  if (!annee || !mois || !jour) return date;

  return new Date(annee, mois - 1, jour).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function dateAujourdhui() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
  const jour = String(maintenant.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function trierRendezVous(liste: RendezVous[]) {
  return [...liste].sort((a, b) => {
    return `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`);
  });
}

function dateHeureRendezVous(rdv: RendezVous) {
  const [annee, mois, jour] = rdv.date.split("-").map(Number);
  const [heure, minute] = rdv.heure.split(":").map(Number);

  return new Date(annee, mois - 1, jour, heure, minute);
}

export default function IndexPatientScreen() {
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(1);

  const [typeRdv, setTypeRdv] = useState<string | null>(null);
  const [medecin, setMedecin] = useState<string | null>(null);
  const [lieu, setLieu] = useState<string | null>(null);
  const [dateRdv, setDateRdv] = useState<string | null>(null);
  const [heureRdv, setHeureRdv] = useState<string | null>(null);
  const [plageRdv, setPlageRdv] = useState<string | null>(null);

  const [creneauxDisponibles, setCreneauxDisponibles] = useState<Creneau[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);

  useFocusEffect(
  useCallback(() => {
    const chargerRendezVous = async () => {
      try {
        const sauvegarde = await AsyncStorage.getItem(CLE_RENDEZ_VOUS);

        if (!sauvegarde) {
          setRendezVous([]);
          return;
        }

        const donnees: unknown = JSON.parse(sauvegarde);

        // Accepte l'ancien format avec un seul rendez-vous.
        const liste: RendezVous[] = Array.isArray(donnees)
          ? donnees
          : donnees
            ? [donnees as RendezVous]
            : [];

        const listeTriee = trierRendezVous(liste);
        setRendezVous(listeTriee);

        // Garantit le stockage sous forme de tableau.
        await AsyncStorage.setItem(
          CLE_RENDEZ_VOUS,
          JSON.stringify(listeTriee)
        );
      } catch (error) {
        console.error("Erreur de chargement des rendez-vous :", error);
        Alert.alert("Erreur", "Impossible de charger les rendez-vous.");
      }
    };

    chargerRendezVous();
  }, [])
);

  const rendezVousAVenir = rendezVous.filter(
    (rdv) => dateHeureRendezVous(rdv).getTime() >= Date.now()
  );

  const prochainRendezVous = rendezVousAVenir[0];

  const reinitialiserSelection = () => {
    setTypeRdv(null);
    setMedecin(null);
    setLieu(null);
    setDateRdv(null);
    setHeureRdv(null);
    setPlageRdv(null);
    setCreneauxDisponibles([]);
  };

  const ouvrirPopup = () => {
    setStep(1);
    reinitialiserSelection();
    setModalVisible(true);
  };

  const fermerPopup = () => {
    setModalVisible(false);
    setStep(1);
    reinitialiserSelection();
  };

  const confirmerRendezVous = async () => {
    if (!typeRdv || !medecin || !dateRdv || !heureRdv || !plageRdv) {
      Alert.alert(
        "Information manquante",
        "Vérifiez les détails du rendez-vous."
      );
      return;
    }

    const nouveauRendezVous: RendezVous = {
      type: typeRdv,
      medecin,
      lieu: typeRdv === "cabinet" ? lieu ?? "" : "Téléconsultation",
      date: dateRdv,
      heure: heureRdv,
      plageHoraire: plageRdv,
    };

    try {
      const sauvegarde = await AsyncStorage.getItem(CLE_RENDEZ_VOUS);
      const donnees: unknown = sauvegarde ? JSON.parse(sauvegarde) : [];

      const anciensRendezVous: RendezVous[] = Array.isArray(donnees)
        ? donnees
        : donnees
          ? [donnees as RendezVous]
          : [];

      const listeTriee = trierRendezVous([
        ...anciensRendezVous,
        nouveauRendezVous,
      ]);

      await AsyncStorage.setItem(
        CLE_RENDEZ_VOUS,
        JSON.stringify(listeTriee)
      );

      setRendezVous(listeTriee);
      fermerPopup();

      Alert.alert(
        "Rendez-vous confirmé",
        "Votre rendez-vous a été ajouté à votre espace patient."
      );
    } catch (error) {
      console.error("Erreur d’enregistrement du rendez-vous :", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le rendez-vous.");
    }
  };

  const boutonDesactive = (desactive: boolean) => [
    styles.confirmButton,
    desactive && styles.confirmButtonDisabled,
  ];

  const afficherCreneaux = (periode: Periode) =>
    creneauxDisponibles.filter((creneau) => creneau.periode === periode);

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
          <Text style={styles.heartRate}>
            72 <Text style={styles.bpm}>BPM</Text>
          </Text>
          <Text style={styles.status}>● Fréquence normale</Text>
        </View>

        <Text style={styles.sectionTitle}>Mon espace santé</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Mes rendez-vous</Text>

          {prochainRendezVous ? (
            <View style={styles.appointment}>
              <Text style={styles.appointmentTitle}>
                {prochainRendezVous.type === "cabinet"
                  ? "Consultation au cabinet"
                  : "Téléconsultation"}
              </Text>

              <Text style={styles.cardText}>
                📅 {dateLocale(prochainRendezVous.date)}
              </Text>

              <Text style={styles.cardText}>
                🕒{" "}
                {prochainRendezVous.plageHoraire ??
                  `À partir de ${prochainRendezVous.heure}`}
              </Text>

              <Text style={styles.cardText}>
                👨‍⚕️ {prochainRendezVous.medecin}
              </Text>

              {prochainRendezVous.type === "cabinet" &&
                !!prochainRendezVous.lieu && (
                  <Text style={styles.cardText}>
                    📍 {prochainRendezVous.lieu}
                  </Text>
                )}

              {rendezVousAVenir.length > 1 && (
                <Text style={styles.moreAppointments}>
                  Vous avez aussi d’autres rendez-vous à venir.
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.cardText}>Aucun rendez-vous à venir.</Text>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/patient/rendez-vous")}
          >
            <Text style={styles.secondaryButtonText}>
              Voir tous mes rendez-vous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={ouvrirPopup}>
            <Text style={styles.buttonText}>Prendre rendez-vous</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Messagerie</Text>
          <Text style={styles.cardText}>Échangez avec votre médecin.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📄 Mes documents</Text>
          <Text style={styles.cardText}>
            Ordonnances et documents médicaux apparaîtront ici.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Mon profil</Text>
          <Text style={styles.cardText}>
            Consultez et modifiez vos informations personnelles.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={fermerPopup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {step > 1 ? (
                <Pressable onPress={() => setStep(step - 1)}>
                  <Text style={styles.backText}>‹ Retour</Text>
                </Pressable>
              ) : (
                <View />
              )}

              <Pressable onPress={fermerPopup} accessibilityLabel="Fermer">
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.stepText}>Étape {step} sur 5</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 && (
                <>
                  <Text style={styles.modalTitle}>Type de consultation</Text>
                  <Text style={styles.modalDescription}>
                    Choisissez le type de rendez-vous souhaité.
                  </Text>

                  {[
                    { value: "cabinet", label: "🏥 Au cabinet" },
                    {
                      value: "teleconsultation",
                      label: "📱 En téléconsultation",
                    },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.optionButton,
                        typeRdv === option.value && styles.optionSelected,
                      ]}
                      onPress={() => {
                        setTypeRdv(option.value);
                        setLieu(null);
                      }}
                    >
                      <Text style={styles.optionText}>{option.label}</Text>
                    </Pressable>
                  ))}

                  <TouchableOpacity
                    disabled={!typeRdv}
                    style={boutonDesactive(!typeRdv)}
                    onPress={() => setStep(2)}
                  >
                    <Text style={styles.confirmButtonText}>Continuer</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.modalTitle}>Médecin et lieu</Text>
                  <Text style={styles.modalDescription}>
                    Choisissez le médecin et, pour une consultation au cabinet,
                    le lieu souhaité.
                  </Text>

                  <Text style={styles.fieldTitle}>Médecin</Text>

                  {MEDECINS.map((nom) => (
                    <Pressable
                      key={nom}
                      style={[
                        styles.optionButton,
                        medecin === nom && styles.optionSelected,
                      ]}
                      onPress={() => setMedecin(nom)}
                    >
                      <Text style={styles.optionText}>{nom}</Text>
                    </Pressable>
                  ))}

                  {typeRdv === "cabinet" && (
                    <>
                      <Text style={styles.fieldTitle}>
                        Lieu de consultation
                      </Text>

                      {LIEUX.map((nomLieu) => (
                        <Pressable
                          key={nomLieu}
                          style={[
                            styles.optionButton,
                            lieu === nomLieu && styles.optionSelected,
                          ]}
                          onPress={() => setLieu(nomLieu)}
                        >
                          <Text style={styles.optionText}>📍 {nomLieu}</Text>
                        </Pressable>
                      ))}
                    </>
                  )}

                  <TouchableOpacity
                    disabled={!medecin || (typeRdv === "cabinet" && !lieu)}
                    style={boutonDesactive(
                      !medecin || (typeRdv === "cabinet" && !lieu)
                    )}
                    onPress={() => setStep(3)}
                  >
                    <Text style={styles.confirmButtonText}>Continuer</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.modalTitle}>Choisir une date</Text>
                  <Text style={styles.modalDescription}>
                    Sélectionnez une date pour votre rendez-vous.
                  </Text>

                  <Calendar
                    minDate={dateAujourdhui()}
                    firstDay={1}
                    markedDates={
                      dateRdv
                        ? {
                            [dateRdv]: {
                              selected: true,
                              selectedColor: "#147D8C",
                            },
                          }
                        : {}
                    }
                    onDayPress={(day) => {
                      setDateRdv(day.dateString);
                      setHeureRdv(null);
                      setPlageRdv(null);
                      setCreneauxDisponibles(genererCreneauxDisponibles());
                    }}
                    theme={{
                      todayTextColor: "#147D8C",
                      arrowColor: "#147D8C",
                      textDayFontSize: 14,
                      textMonthFontWeight: "700",
                    }}
                  />

                  <TouchableOpacity
                    disabled={!dateRdv}
                    style={boutonDesactive(!dateRdv)}
                    onPress={() => {
                      if (dateRdv) setStep(4);
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Continuer</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 4 && (
                <>
                  <Text style={styles.modalTitle}>Choisir un horaire</Text>

                  <Text style={styles.modalDescription}>
                    {dateRdv
                      ? `Créneaux disponibles le ${dateLocale(dateRdv)}`
                      : "Choisissez un créneau."}
                  </Text>

                  <Text style={styles.fieldTitle}>Matin — 09:00 à 12:00</Text>

                  <View style={styles.slotsContainer}>
                    {afficherCreneaux("Matin").map((creneau) => (
                      <Pressable
                        key={creneau.heure}
                        style={[
                          styles.slotButton,
                          heureRdv === creneau.heure && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setHeureRdv(creneau.heure);
                          setPlageRdv(`Matin — ${creneau.heure}`);
                        }}
                      >
                        <Text style={styles.optionText}>
                          {creneau.heure}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldTitle}>
                    Après-midi — 14:00 à 17:00
                  </Text>

                  <View style={styles.slotsContainer}>
                    {afficherCreneaux("Après-midi").map((creneau) => (
                      <Pressable
                        key={creneau.heure}
                        style={[
                          styles.slotButton,
                          heureRdv === creneau.heure && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setHeureRdv(creneau.heure);
                          setPlageRdv(`Après-midi — ${creneau.heure}`);
                        }}
                      >
                        <Text style={styles.optionText}>
                          {creneau.heure}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {creneauxDisponibles.length === 0 && (
                    <Text style={styles.cardText}>
                      Aucun créneau disponible pour cette date.
                    </Text>
                  )}

                  <TouchableOpacity
                    disabled={!heureRdv}
                    style={boutonDesactive(!heureRdv)}
                    onPress={() => {
                      if (heureRdv) setStep(5);
                    }}
                  >
                    <Text style={styles.confirmButtonText}>
                      Voir le récapitulatif
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 5 && (
                <>
                  <Text style={styles.modalTitle}>Récapitulatif</Text>

                  <View style={styles.summary}>
                    <Text style={styles.summaryText}>
                      Consultation :{" "}
                      {typeRdv === "cabinet"
                        ? "Au cabinet"
                        : "Téléconsultation"}
                    </Text>

                    <Text style={styles.summaryText}>
                      Médecin : {medecin}
                    </Text>

                    {typeRdv === "cabinet" && (
                      <Text style={styles.summaryText}>Lieu : {lieu}</Text>
                    )}

                    <Text style={styles.summaryText}>
                      Date : {dateRdv ? dateLocale(dateRdv) : ""}
                    </Text>

                    <Text style={styles.summaryText}>
                      Horaire : {plageRdv}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmerRendezVous}
                  >
                    <Text style={styles.confirmButtonText}>
                      Confirmer le rendez-vous
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F8FB",
  },
  container: {
    flexGrow: 1,
    padding: 22,
    backgroundColor: "#F4F8FB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  label: {
    color: "#188B8B",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#17324D",
    fontSize: 23,
    fontWeight: "700",
    marginTop: 5,
  },
  logout: {
    color: "#D9534F",
    fontWeight: "600",
  },
  heartCard: {
    backgroundColor: "#188B8B",
    borderRadius: 18,
    padding: 22,
    marginBottom: 24,
  },
  cardLabel: {
    color: "white",
    fontSize: 15,
  },
  heartRate: {
    color: "white",
    fontSize: 42,
    fontWeight: "700",
    marginVertical: 8,
  },
  bpm: {
    fontSize: 17,
    fontWeight: "400",
  },
  status: {
    color: "#D9FFF1",
  },
  sectionTitle: {
    color: "#17324D",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 18,
    marginBottom: 13,
  },
  cardTitle: {
    color: "#17324D",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardText: {
    color: "#687786",
    lineHeight: 21,
  },
  appointment: {
    gap: 4,
    paddingVertical: 8,
  },
  appointmentTitle: {
    color: "#17324D",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  moreAppointments: {
    color: "#147D8C",
    fontSize: 13,
    marginTop: 8,
  },
  secondaryButton: {
    padding: 12,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryButtonText: {
    color: "#147D8C",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#188B8B",
    padding: 12,
    borderRadius: 9,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backText: {
    color: "#147D8C",
    fontSize: 16,
    fontWeight: "600",
  },
  closeText: {
    color: "#68798A",
    fontSize: 20,
  },
  stepText: {
    color: "#68798A",
    fontSize: 13,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#18324A",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: "#68798A",
    marginBottom: 20,
    lineHeight: 21,
  },
  fieldTitle: {
    color: "#18324A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
  },
  optionButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE5EA",
    borderRadius: 12,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: "#147D8C",
    backgroundColor: "#EAF6F7",
  },
  optionText: {
    fontSize: 16,
    color: "#18324A",
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  slotButton: {
    width: "47%",
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCE5EA",
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#147D8C",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  summary: {
    backgroundColor: "#F4F8FA",
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    gap: 10,
  },
  summaryText: {
    color: "#18324A",
    fontSize: 15,
  },
});