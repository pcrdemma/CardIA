import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CountryPicker, {
  Country,
  CountryCode,
} from "react-native-country-picker-modal";
import { supabase } from "../../lib/supabase";

type Profil = {
  full_name: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
};

export default function ProfilScreen() {
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  // Informations enregistrées et affichées sur l’écran
  const [nom, setNom] = useState("");
  const [indicatif, setIndicatif] = useState("+33");
  const [telephone, setTelephone] = useState("");

  // Valeurs temporaires du popup d’informations
  const [nomTemp, setNomTemp] = useState("");
  const [indicatifTemp, setIndicatifTemp] = useState("+33");
  const [telephoneTemp, setTelephoneTemp] = useState("");
  const [paysTemp, setPaysTemp] = useState<CountryCode>("FR");

  const [popupInfosVisible, setPopupInfosVisible] = useState(false);
  const [popupMotDePasseVisible, setPopupMotDePasseVisible] =
    useState(false);

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [modificationMotDePasse, setModificationMotDePasse] =
    useState(false);

  useEffect(() => {
    chargerProfil();
  }, []);

  const chargerProfil = async () => {
    setChargement(true);

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setChargement(false);
      Alert.alert("Session expirée", "Reconnecte-toi à ton compte.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone_country_code, phone_number")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (error) {
      setChargement(false);
      Alert.alert("Erreur", `Impossible de charger le profil : ${error.message}`);
      return;
    }

    const profil = data as Profil | null;

    setNom(profil?.full_name ?? "");
    setIndicatif(profil?.phone_country_code ?? "+33");
    setTelephone(profil?.phone_number ?? "");
    setChargement(false);
  };

  const ouvrirPopupInfos = () => {
    setNomTemp(nom);
    setIndicatifTemp(indicatif);
    setTelephoneTemp(telephone);

    // Le sélecteur s’ouvre par défaut sur la France.
    // L’indicatif enregistré est conservé jusqu’au choix d’un autre pays.
    setPaysTemp("FR");
    setPopupInfosVisible(true);
  };

  const choisirPays = (country: Country) => {
    setPaysTemp(country.cca2);
    setIndicatifTemp(`+${country.callingCode?.[0] ?? "33"}`);
  };

  const enregistrerInformations = async () => {
    setEnregistrement(true);

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setEnregistrement(false);
      Alert.alert("Session expirée", "Reconnecte-toi avant d’enregistrer.");
      return;
    }

    const informations = {
      id: authData.user.id,
      full_name: nomTemp.trim(),
      phone_country_code: indicatifTemp,
      phone_number: telephoneTemp.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(informations, { onConflict: "id" });

    setEnregistrement(false);

    if (error) {
      Alert.alert(
        "Erreur",
        `Impossible d’enregistrer les informations : ${error.message}`
      );
      return;
    }

    // Affiche les nouvelles valeurs seulement après confirmation de Supabase.
    setNom(informations.full_name);
    setIndicatif(informations.phone_country_code);
    setTelephone(informations.phone_number);
    setPopupInfosVisible(false);

    Alert.alert("Enregistré", "Tes informations ont été mises à jour.");
  };

  const modifierMotDePasse = async () => {
    if (nouveauMotDePasse.length < 8) {
      Alert.alert(
        "Mot de passe trop court",
        "Choisis un mot de passe d’au moins 8 caractères."
      );
      return;
    }

    if (nouveauMotDePasse !== confirmation) {
      Alert.alert("Erreur", "Les deux mots de passe ne correspondent pas.");
      return;
    }

    setModificationMotDePasse(true);

    const { error } = await supabase.auth.updateUser({
      password: nouveauMotDePasse,
    });

    setModificationMotDePasse(false);

    if (error) {
      Alert.alert("Erreur", `Le mot de passe n’a pas été modifié : ${error.message}`);
      return;
    }

    setNouveauMotDePasse("");
    setConfirmation("");
    setPopupMotDePasseVisible(false);
    Alert.alert("Succès", "Ton mot de passe a été modifié.");
  };

  if (chargement) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#1976A5" />
        <Text style={styles.loadingText}>Chargement du profil…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon profil</Text>
        <Text style={styles.subtitle}>
          Consulte et modifie les informations de ton compte.
        </Text>

        {/* Informations affichées en premier */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mes informations</Text>

          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>
            {nom || "Non renseigné"}
          </Text>

          <Text style={styles.infoLabel}>Téléphone</Text>
          <Text style={styles.infoValue}>
            {telephone
              ? `${indicatif} ${telephone}`
              : "Non renseigné"}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={ouvrirPopupInfos}
          >
            <Text style={styles.buttonText}>Modifier mes informations</Text>
          </TouchableOpacity>
        </View>

        {/* Changement de mot de passe en dessous */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mot de passe</Text>
          <Text style={styles.infoText}>
            Tu peux modifier le mot de passe de ton compte.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setPopupMotDePasseVisible(true)}
          >
            <Text style={styles.buttonText}>Changer le mot de passe</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Popup des informations */}
      <Modal
        visible={popupInfosVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupInfosVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.popupTitle}>Mes informations</Text>

              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={nomTemp}
                onChangeText={setNomTemp}
                placeholder="Entre ton nom"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Indicatif et numéro</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryPicker}>
                  <CountryPicker
                    countryCode={paysTemp}
                    withFilter
                    withFlag
                    withCallingCode
                    withCallingCodeButton
                    onSelect={choisirPays}
                  />
                </View>

                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={telephoneTemp}
                  onChangeText={setTelephoneTemp}
                  placeholder="Numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  enregistrement && styles.buttonDisabled,
                ]}
                onPress={enregistrerInformations}
                disabled={enregistrement}
              >
                <Text style={styles.buttonText}>
                  {enregistrement ? "Enregistrement…" : "Enregistrer"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPopupInfosVisible(false)}
                disabled={enregistrement}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Popup du mot de passe */}
      <Modal
        visible={popupMotDePasseVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupMotDePasseVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>Changer le mot de passe</Text>

            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={nouveauMotDePasse}
              onChangeText={setNouveauMotDePasse}
              placeholder="8 caractères minimum"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Répète le nouveau mot de passe"
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[
                styles.button,
                modificationMotDePasse && styles.buttonDisabled,
              ]}
              onPress={modifierMotDePasse}
              disabled={modificationMotDePasse}
            >
              <Text style={styles.buttonText}>
                {modificationMotDePasse ? "Modification…" : "Enregistrer"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPopupMotDePasseVisible(false)}
              disabled={modificationMotDePasse}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7FA",
  },
  loadingText: {
    marginTop: 12,
    color: "#607386",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#17324D",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 15,
    lineHeight: 22,
    color: "#607386",
  },
  card: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  cardTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#17324D",
  },
  infoLabel: {
    marginBottom: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#607386",
  },
  infoValue: {
    marginBottom: 14,
    fontSize: 16,
    color: "#17324D",
  },
  infoText: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 21,
    color: "#607386",
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1976A5",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  popup: {
    maxHeight: "85%",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  popupTitle: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: "700",
    color: "#17324D",
  },
  label: {
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "600",
    color: "#334B60",
  },
  input: {
    minHeight: 48,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#D7E1E9",
    borderRadius: 10,
    color: "#17324D",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  countryPicker: {
    minHeight: 48,
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#D7E1E9",
    borderRadius: 10,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#607386",
    fontSize: 15,
    fontWeight: "600",
  },
});