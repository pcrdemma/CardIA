import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Calendar } from "react-native-calendars";
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

type Periode = "Matin" | "Après-midi";

type Creneau = {
  heure: string;
  periode: Periode;
};

type RendezVous = {
  id?: string;
  type: string;
  date: string;
  heure: string;
  medecin?: string;
  lieu?: string;
  plageHoraire?: string;
  presenceConfirmee?: boolean;
  reminderNotificationId?: string;
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function melanger<T>(liste: T[]): T[] {
  const resultat = [...liste];

  for (let i = resultat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
  }

  return resultat;
}

function choisirHeuresAleatoires(heures: string[]): string[] {
  const nombreDisponibles = Math.floor(Math.random() * 4) + 2;

  return melanger(heures)
    .slice(0, nombreDisponibles)
    .sort((a, b) => a.localeCompare(b));
}

function genererCreneauxDisponibles(): Creneau[] {
  const matin = choisirHeuresAleatoires(HEURES_MATIN).map(
    (heure): Creneau => ({
      heure,
      periode: "Matin",
    })
  );

  const apresMidi = choisirHeuresAleatoires(HEURES_APRES_MIDI).map(
    (heure): Creneau => ({
      heure,
      periode: "Après-midi",
    })
  );

  return [...matin, ...apresMidi];
}

function trierRendezVous(liste: RendezVous[]) {
  return [...liste].sort((a, b) =>
    `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`)
  );
}

function afficherDate(date: string) {
  const [annee, mois, jour] = date.split("-").map(Number);

  if (!annee || !mois || !jour) return date;

  return new Date(annee, mois - 1, jour).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dateAujourdhui() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
  const jour = String(maintenant.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function dateHeureRendezVous(rdv: RendezVous) {
  const [annee, mois, jour] = rdv.date.split("-").map(Number);
  const [heure, minute] = rdv.heure.split(":").map(Number);

  return new Date(annee, mois - 1, jour, heure, minute);
}

function creerId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function demanderPermissionNotifications() {
  const permission = await Notifications.getPermissionsAsync();

  if (permission.granted) return true;

  const nouvellePermission = await Notifications.requestPermissionsAsync();
  return nouvellePermission.granted;
}

async function programmerRappel(
  rdv: RendezVous,
  idRdv: string
): Promise<string | undefined> {
  const dateRdv = dateHeureRendezVous(rdv);
  const dateRappel = new Date(dateRdv.getTime() - 24 * 60 * 60 * 1000);

  // Aucun rappel si le délai de 24 heures est déjà passé.
  if (dateRappel.getTime() <= Date.now()) return undefined;

  const autorise = await demanderPermissionNotifications();
  if (!autorise) return undefined;

  const heureAffichee = rdv.plageHoraire ?? rdv.heure;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Rappel de rendez-vous",
      body: `Votre rendez-vous avec ${rdv.medecin ?? "votre médecin"} est prévu demain à ${heureAffichee}. Confirmez votre présence.`,
      data: { rendezVousId: idRdv },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dateRappel,
    },
  });
}

export default function RendezVousPatient() {
  const router = useRouter();

  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);

  // États de la popup de prise de rendez-vous
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(1);

  const [typeRdv, setTypeRdv] = useState<string | null>(null);
  const [medecin, setMedecin] = useState<string | null>(null);
  const [lieu, setLieu] = useState<string | null>(null);
  const [dateRdv, setDateRdv] = useState<string | null>(null);
  const [heureRdv, setHeureRdv] = useState<string | null>(null);
  const [plageRdv, setPlageRdv] = useState<string | null>(null);
  const [creneauxDisponibles, setCreneauxDisponibles] = useState<Creneau[]>([]);

  const chargerRendezVous = useCallback(async () => {
    try {
      const sauvegarde = await AsyncStorage.getItem(CLE_RENDEZ_VOUS);

      if (!sauvegarde) {
        setRendezVous([]);
        return;
      }

      const donnees: unknown = JSON.parse(sauvegarde);

      // Compatibilité avec une ancienne sauvegarde contenant un seul rendez-vous.
      const listeInitiale: RendezVous[] = Array.isArray(donnees)
        ? donnees
        : donnees
          ? [donnees as RendezVous]
          : [];

      let liste = trierRendezVous(
        listeInitiale.map((rdv) => ({
          ...rdv,
          id: rdv.id ?? creerId(),
          presenceConfirmee: rdv.presenceConfirmee ?? false,
        }))
      );

      // Programme les rappels manquants pour les rendez-vous futurs.
      for (let i = 0; i < liste.length; i++) {
        const rdv = liste[i];
        const dateRdvObjet = dateHeureRendezVous(rdv);

        if (
          dateRdvObjet.getTime() > Date.now() &&
          !rdv.presenceConfirmee &&
          !rdv.reminderNotificationId
        ) {
          try {
            const notificationId = await programmerRappel(rdv, rdv.id!);

            if (notificationId) {
              liste[i] = {
                ...rdv,
                reminderNotificationId: notificationId,
              };
            }
          } catch (error) {
            console.error("Impossible de programmer le rappel :", error);
          }
        }
      }

      await AsyncStorage.setItem(CLE_RENDEZ_VOUS, JSON.stringify(liste));
      setRendezVous(liste);
    } catch (error) {
      console.error("Erreur de chargement des rendez-vous :", error);
      Alert.alert("Erreur", "Impossible de charger les rendez-vous.");
      setRendezVous([]);
    }
  }, []);

  // Recharge les rendez-vous à chaque ouverture de la page.
  useFocusEffect(
    useCallback(() => {
      chargerRendezVous();
    }, [chargerRendezVous])
  );

  const enregistrerListe = async (liste: RendezVous[]) => {
    const listeTriee = trierRendezVous(liste);

    await AsyncStorage.setItem(CLE_RENDEZ_VOUS, JSON.stringify(listeTriee));
    setRendezVous(listeTriee);
  };

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
    reinitialiserSelection();
    setStep(1);
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
      id: creerId(),
      type: typeRdv,
      medecin,
      lieu: typeRdv === "cabinet" ? lieu ?? "" : "Téléconsultation",
      date: dateRdv,
      heure: heureRdv,
      plageHoraire: plageRdv,
      presenceConfirmee: false,
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

      await AsyncStorage.setItem(CLE_RENDEZ_VOUS, JSON.stringify(listeTriee));
      setRendezVous(listeTriee);
      fermerPopup();

      Alert.alert(
        "Rendez-vous confirmé",
        "Votre rendez-vous a été ajouté à votre espace patient."
      );

      // Recharge la liste et tente de programmer un rappel.
      void chargerRendezVous();
    } catch (error) {
      console.error("Erreur d’enregistrement du rendez-vous :", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le rendez-vous.");
    }
  };

  const confirmerPresence = (rdv: RendezVous) => {
    Alert.alert(
      "Confirmer votre présence",
      "Confirmez-vous votre présence à ce rendez-vous ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              if (rdv.reminderNotificationId) {
                await Notifications.cancelScheduledNotificationAsync(
                  rdv.reminderNotificationId
                );
              }

              const listeModifiee = rendezVous.map((item) =>
                item.id === rdv.id
                  ? {
                      ...item,
                      presenceConfirmee: true,
                      reminderNotificationId: undefined,
                    }
                  : item
              );

              await enregistrerListe(listeModifiee);
            } catch (error) {
              console.error("Erreur de confirmation :", error);
              Alert.alert(
                "Erreur",
                "Impossible de confirmer votre présence."
              );
            }
          },
        },
      ]
    );
  };

  const supprimerRendezVous = (rdv: RendezVous) => {
    Alert.alert(
      "Supprimer le rendez-vous",
      "Voulez-vous vraiment supprimer ce rendez-vous ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              if (rdv.reminderNotificationId) {
                await Notifications.cancelScheduledNotificationAsync(
                  rdv.reminderNotificationId
                );
              }

              const listeModifiee = rendezVous.filter(
                (item) => item.id !== rdv.id
              );

              await enregistrerListe(listeModifiee);
            } catch (error) {
              console.error("Erreur de suppression :", error);
              Alert.alert("Erreur", "Impossible de supprimer le rendez-vous.");
            }
          },
        },
      ]
    );
  };

  const rendezVousAVenir = rendezVous.filter(
    (rdv) => dateHeureRendezVous(rdv).getTime() >= Date.now()
  );

  const afficherCreneaux = (periode: Periode) =>
    creneauxDisponibles.filter((creneau) => creneau.periode === periode);

  const boutonEtapeDesactive = (desactive: boolean) => [
    styles.stepButton,
    desactive && styles.stepButtonDisabled,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>

        <Text style={styles.title}>Mes rendez-vous</Text>
        <Text style={styles.subtitle}>
          Retrouvez vos rendez-vous médicaux et gérez votre présence.
        </Text>

        <Pressable style={styles.bookButton} onPress={ouvrirPopup}>
          <Text style={styles.bookButtonText}>Prendre rendez-vous</Text>
        </Pressable>

        {rendezVousAVenir.length > 0 ? (
          rendezVousAVenir.map((rdv, index) => (
            <View
              key={rdv.id ?? `${rdv.date}-${rdv.heure}-${index}`}
              style={styles.card}
            >
              <Text style={styles.badge}>
                {index === 0 ? "Prochain rendez-vous" : "À venir"}
              </Text>

              <Text style={styles.doctor}>{rdv.medecin ?? "Médecin"}</Text>

              <View style={styles.separator} />

              <Text style={styles.detail}>📅 {afficherDate(rdv.date)}</Text>

              <Text style={styles.detail}>
                🕐 {rdv.plageHoraire ?? rdv.heure}
              </Text>

              <Text style={styles.detail}>
                {rdv.type === "cabinet"
                  ? "📍 Consultation au cabinet"
                  : "📱 Téléconsultation"}
              </Text>

              {rdv.lieu && rdv.type === "cabinet" ? (
                <Text style={styles.detail}>Lieu : {rdv.lieu}</Text>
              ) : null}

              <Text
                style={[
                  styles.presenceStatus,
                  rdv.presenceConfirmee && styles.presenceConfirmed,
                ]}
              >
                {rdv.presenceConfirmee
                  ? "✓ Présence confirmée"
                  : "Présence non confirmée"}
              </Text>

              {!rdv.presenceConfirmee && (
                <Pressable
                  style={styles.confirmPresenceButton}
                  onPress={() => confirmerPresence(rdv)}
                >
                  <Text style={styles.confirmPresenceButtonText}>
                    Confirmer ma présence
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={styles.deleteButton}
                onPress={() => supprimerRendezVous(rdv)}
              >
                <Text style={styles.deleteButtonText}>
                  Supprimer le rendez-vous
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Aucun rendez-vous à venir</Text>
            <Text style={styles.emptyText}>
              Vos rendez-vous confirmés apparaîtront ici.
            </Text>
          </View>
        )}

        <Pressable
          style={styles.homeButton}
          onPress={() => router.push("/patient")}
        >
          <Text style={styles.homeButtonText}>
            Retour à l’accueil patient
          </Text>
        </Pressable>
      </ScrollView>

      {/* Popup de prise de rendez-vous */}
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
                    style={boutonEtapeDesactive(!typeRdv)}
                    onPress={() => setStep(2)}
                  >
                    <Text style={styles.stepButtonText}>Continuer</Text>
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
                      <Text style={styles.fieldTitle}>Lieu de consultation</Text>

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
                    style={boutonEtapeDesactive(
                      !medecin || (typeRdv === "cabinet" && !lieu)
                    )}
                    onPress={() => setStep(3)}
                  >
                    <Text style={styles.stepButtonText}>Continuer</Text>
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
                    style={boutonEtapeDesactive(!dateRdv)}
                    onPress={() => {
                      if (dateRdv) setStep(4);
                    }}
                  >
                    <Text style={styles.stepButtonText}>Continuer</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 4 && (
                <>
                  <Text style={styles.modalTitle}>Choisir un horaire</Text>

                  <Text style={styles.modalDescription}>
                    {dateRdv
                      ? `Créneaux disponibles le ${afficherDate(dateRdv)}`
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
                        <Text style={styles.optionText}>{creneau.heure}</Text>
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
                        <Text style={styles.optionText}>{creneau.heure}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {creneauxDisponibles.length === 0 && (
                    <Text style={styles.emptyText}>
                      Aucun créneau disponible pour cette date.
                    </Text>
                  )}

                  <TouchableOpacity
                    disabled={!heureRdv}
                    style={boutonEtapeDesactive(!heureRdv)}
                    onPress={() => {
                      if (heureRdv) setStep(5);
                    }}
                  >
                    <Text style={styles.stepButtonText}>
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

                    <Text style={styles.summaryText}>Médecin : {medecin}</Text>

                    {typeRdv === "cabinet" && (
                      <Text style={styles.summaryText}>Lieu : {lieu}</Text>
                    )}

                    <Text style={styles.summaryText}>
                      Date : {dateRdv ? afficherDate(dateRdv) : ""}
                    </Text>

                    <Text style={styles.summaryText}>
                      Horaire : {plageRdv}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={confirmerRendezVous}
                  >
                    <Text style={styles.stepButtonText}>
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
    backgroundColor: "#F5F8FC",
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  backText: {
    color: "#147D8C",
    fontSize: 17,
    fontWeight: "600",
  },
  title: {
    color: "#18324A",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#68798A",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  badge: {
    color: "#147D8C",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  doctor: {
    color: "#18324A",
    fontSize: 20,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#E7EDF2",
    marginVertical: 18,
  },
  detail: {
    color: "#364B5E",
    fontSize: 15,
    marginBottom: 12,
  },
  presenceStatus: {
    color: "#B7791F",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },
  presenceConfirmed: {
    color: "#21835A",
  },
  confirmPresenceButton: {
    backgroundColor: "#147D8C",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmPresenceButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#D9534F",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#D9534F",
    fontSize: 15,
    fontWeight: "600",
  },
  emptyTitle: {
    color: "#18324A",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#68798A",
    fontSize: 15,
    lineHeight: 22,
  },
  homeButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  homeButtonText: {
    color: "#147D8C",
    fontSize: 15,
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: "#176B87",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 35, 50, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
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
  stepButton: {
    backgroundColor: "#147D8C",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  stepButtonDisabled: {
    opacity: 0.45,
  },
  stepButtonText: {
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