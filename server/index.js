const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Le serveur CardIA fonctionne !");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Connexion réussie avec le serveur CardIA" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});