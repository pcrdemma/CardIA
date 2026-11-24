import { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLE_CONVERSATIONS = "conversationsPatient";

type Message = {
  id: string;
  texte: string;
  heure: string;
  envoyeParMoi: boolean;
  dateCreation: number;
};

type Medecin = {
  id: string;
  nom: string;
  specialite: string;
  emoji: string;
};

type Conversation = Medecin & {
  messages: Message[];
  doitRepondre: boolean;
};

const MEDECINS: Medecin[] = [
  {
    id: "1",
    nom: "Dr. Sophie Martin",
    specialite: "Cardiologue",
    emoji: "❤️",
  },
  {
    id: "2",
    nom: "Dr. Alex Roy",
    specialite: "Médecine générale",
    emoji: "🩺",
  },
  {
    id: "3",
    nom: "Dr. Camille Bernard",
    specialite: "Dermatologue",
    emoji: "🧴",
  },
  {
    id: "4",
    nom: "Dr. Nadia Tremblay",
    specialite: "Pédiatre",
    emoji: "🧸",
  },
];

function creerConversationsInitiales(): Conversation[] {
  const maintenant = Date.now();

  return [
    {
      ...MEDECINS[0],
      messages: [
        {
          id: "initial-1",
          texte: "Bonjour, comment vous sentez-vous aujourd’hui ?",
          heure: "09:30",
          envoyeParMoi: false,
          dateCreation: maintenant - 3 * 60 * 60 * 1000,
        },
        {
          id: "initial-2",
          texte: "Bonjour Docteure, j’aimerais vous poser une question.",
          heure: "09:32",
          envoyeParMoi: true,
          dateCreation: maintenant - 2 * 60 * 60 * 1000,
        },
        {
          id: "initial-3",
          texte: "Bien sûr, je vous écoute.",
          heure: "09:33",
          envoyeParMoi: false,
          dateCreation: maintenant - 60 * 60 * 1000,
        },
      ],
      doitRepondre: true,
    },
    {
      ...MEDECINS[1],
      messages: [
        {
          id: "initial-4",
          texte: "N’oubliez pas votre rendez-vous de suivi.",
          heure: "Hier",
          envoyeParMoi: false,
          dateCreation: maintenant - 24 * 60 * 60 * 1000,
        },
      ],
      doitRepondre: false,
    },
  ];
}

export default function MessagerieScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [donneesChargees, setDonneesChargees] = useState(false);
  const [medecinSelectionneId, setMedecinSelectionneId] = useState<
    string | null
  >(null);
  const [recherche, setRecherche] = useState("");
  const [texte, setTexte] = useState("");

  useEffect(() => {
    const chargerConversations = async () => {
      try {
        const sauvegarde = await AsyncStorage.getItem(CLE_CONVERSATIONS);

        if (sauvegarde) {
          const donnees: unknown = JSON.parse(sauvegarde);

          if (Array.isArray(donnees)) {
            setConversations(donnees as Conversation[]);
          } else {
            setConversations(creerConversationsInitiales());
          }
        } else {
          setConversations(creerConversationsInitiales());
        }
      } catch (error) {
        console.error("Erreur de chargement des conversations :", error);
        setConversations(creerConversationsInitiales());
      } finally {
        setDonneesChargees(true);
      }
    };

    chargerConversations();
  }, []);

  useEffect(() => {
    if (!donneesChargees) return;

    AsyncStorage.setItem(
      CLE_CONVERSATIONS,
      JSON.stringify(conversations)
    ).catch((error) => {
      console.error("Erreur de sauvegarde des conversations :", error);
    });
  }, [conversations, donneesChargees]);

  const medecinSelectionne = conversations.find(
    (conversation) => conversation.id === medecinSelectionneId
  );

  const terme = recherche.trim().toLowerCase();

  const medecinsFiltres = MEDECINS.filter((medecin) =>
    `${medecin.nom} ${medecin.specialite}`.toLowerCase().includes(terme)
  );

  const ouvrirConversation = (medecin: Medecin) => {
    const conversationExiste = conversations.some(
      (conversation) => conversation.id === medecin.id
    );

    if (!conversationExiste) {
      setConversations((liste) => [
        ...liste,
        {
          ...medecin,
          messages: [],
          doitRepondre: false,
        },
      ]);
    }

    setMedecinSelectionneId(medecin.id);
    setRecherche("");
  };

  const supprimerConversation = (conversation: Conversation) => {
    Alert.alert(
      "Supprimer la conversation",
      `Voulez-vous supprimer la conversation avec ${conversation.nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            setConversations((liste) =>
              liste.filter((item) => item.id !== conversation.id)
            );

            if (medecinSelectionneId === conversation.id) {
              setMedecinSelectionneId(null);
            }
          },
        },
      ]
    );
  };

  const envoyerMessage = () => {
    const messageNettoye = texte.trim();

    if (!messageNettoye || !medecinSelectionne) return;

    const dateEnvoi = new Date();

    const nouveauMessage: Message = {
      id: `${dateEnvoi.getTime()}`,
      texte: messageNettoye,
      heure: dateEnvoi.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      envoyeParMoi: true,
      dateCreation: dateEnvoi.getTime(),
    };

    setConversations((liste) =>
      liste.map((conversation) =>
        conversation.id === medecinSelectionne.id
          ? {
              ...conversation,
              messages: [...conversation.messages, nouveauMessage],
              doitRepondre: false,
            }
          : conversation
      )
    );

    setTexte("");
  };

  if (!donneesChargees) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.emptyMessage}>
            Chargement des conversations…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {medecinSelectionne ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setMedecinSelectionneId(null)}
              style={styles.backButton}
            >
              <Text style={styles.backText}>‹ Messages</Text>
            </TouchableOpacity>

            <View style={styles.doctorInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {medecinSelectionne.emoji}
                </Text>
              </View>

              <View>
                <Text style={styles.doctorName}>
                  {medecinSelectionne.nom}
                </Text>
                <Text style={styles.specialty}>
                  {medecinSelectionne.specialite}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {medecinSelectionne.messages.length === 0 ? (
              <Text style={styles.emptyMessage}>
                Envoyez un premier message à ce médecin.
              </Text>
            ) : (
              medecinSelectionne.messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    message.envoyeParMoi
                      ? styles.myMessageRow
                      : styles.doctorMessageRow,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.envoyeParMoi
                        ? styles.myMessageBubble
                        : styles.doctorMessageBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.envoyeParMoi && styles.myMessageText,
                      ]}
                    >
                      {message.texte}
                    </Text>

                    <Text
                      style={[
                        styles.messageTime,
                        message.envoyeParMoi && styles.myMessageTime,
                      ]}
                    >
                      {message.heure}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Écrire un message..."
              placeholderTextColor="#8A9AA8"
              value={texte}
              onChangeText={setTexte}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                !texte.trim() && styles.sendButtonDisabled,
              ]}
              onPress={envoyerMessage}
              disabled={!texte.trim()}
              accessibilityLabel="Envoyer le message"
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>
          <View style={styles.listHeader}>
            <Text style={styles.eyebrow}>ESPACE PATIENT</Text>
            <Text style={styles.title}>Messagerie</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un médecin ou une spécialité"
              placeholderTextColor="#8A9AA8"
              value={recherche}
              onChangeText={setRecherche}
              autoCapitalize="none"
            />
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            {terme.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Médecins</Text>

                {medecinsFiltres.length === 0 ? (
                  <Text style={styles.emptyMessage}>
                    Aucun médecin trouvé.
                  </Text>
                ) : (
                  medecinsFiltres.map((medecin) => (
                    <TouchableOpacity
                      key={medecin.id}
                      style={styles.doctorCard}
                      onPress={() => ouvrirConversation(medecin)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{medecin.emoji}</Text>
                      </View>

                      <View style={styles.conversationInfo}>
                        <Text style={styles.doctorName}>{medecin.nom}</Text>
                        <Text style={styles.specialty}>
                          {medecin.specialite}
                        </Text>
                      </View>

                      <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            <Text style={styles.sectionTitle}>Mes conversations</Text>

            {conversations
              .filter((conversation) =>
                `${conversation.nom} ${conversation.specialite}`
                  .toLowerCase()
                  .includes(terme)
              )
              .map((conversation) => {
                const dernierMessage =
                  conversation.messages[conversation.messages.length - 1];

                return (
                  <View key={conversation.id} style={styles.doctorCard}>
                    <TouchableOpacity
                      style={styles.conversationTouchable}
                      onPress={() => ouvrirConversation(conversation)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {conversation.emoji}
                        </Text>
                      </View>

                      <View style={styles.conversationInfo}>
                        <Text style={styles.doctorName}>
                          {conversation.nom}
                        </Text>
                        <Text style={styles.specialty}>
                          {conversation.specialite}
                        </Text>
                        <Text style={styles.preview} numberOfLines={1}>
                          {dernierMessage
                            ? `${dernierMessage.envoyeParMoi ? "Vous : " : ""}${dernierMessage.texte}`
                            : "Aucun message"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {conversation.doitRepondre && (
                      <View
                        style={styles.unreadDot}
                        accessibilityLabel="Une réponse est attendue"
                      />
                    )}

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => supprimerConversation(conversation)}
                      accessibilityLabel={`Supprimer la conversation avec ${conversation.nom}`}
                    >
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F8FB" },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listHeader: {
    padding: 22,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EDF2",
  },
  eyebrow: {
    color: "#188B8B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  title: {
    color: "#17324D",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 16,
  },
  searchInput: {
    height: 46,
    backgroundColor: "#F4F8FB",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#17324D",
    fontSize: 14,
  },
  listContent: { padding: 16 },
  sectionTitle: {
    color: "#17324D",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 10,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EDF2",
  },
  conversationTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E7F4F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 22 },
  conversationInfo: { flex: 1 },
  doctorInfo: { flexDirection: "row", alignItems: "center" },
  doctorName: { color: "#17324D", fontSize: 14, fontWeight: "700" },
  specialty: { color: "#188B8B", fontSize: 13, marginTop: 3 },
  preview: { color: "#718391", fontSize: 12, marginTop: 5 },
  chevron: { color: "#8A9AA8", fontSize: 25, marginLeft: 8 },
  unreadDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#168BFF",
    marginHorizontal: 10,
  },
  deleteButton: { padding: 8, marginLeft: 2 },
  deleteText: { fontSize: 17 },
  header: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EDF2",
  },
  backButton: { alignSelf: "flex-start", marginBottom: 14 },
  backText: { color: "#188B8B", fontSize: 15, fontWeight: "600" },
  messagesContent: { padding: 18, flexGrow: 1 },
  messageRow: { width: "100%", marginBottom: 12 },
  myMessageRow: { alignItems: "flex-end" },
  doctorMessageRow: { alignItems: "flex-start" },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
    borderRadius: 17,
  },
  myMessageBubble: {
    backgroundColor: "#188B8B",
    borderBottomRightRadius: 5,
  },
  doctorMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#E6EDF2",
  },
  messageText: { color: "#17324D", fontSize: 15, lineHeight: 21 },
  myMessageText: { color: "#FFFFFF" },
  messageTime: {
    color: "#8796A2",
    fontSize: 10,
    marginTop: 5,
    alignSelf: "flex-end",
  },
  myMessageTime: { color: "#D5EEEE" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5EDF2",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F4F8FB",
    borderRadius: 22,
    color: "#17324D",
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    marginLeft: 9,
    borderRadius: 22,
    backgroundColor: "#188B8B",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#A9C9C9" },
  sendButtonText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  emptyMessage: {
    color: "#718391",
    fontSize: 14,
    paddingVertical: 12,
  },
});