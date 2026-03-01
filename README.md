# Fanta Formula 1 🏎️

Un'applicazione Full-Stack per gestire i pronostici della stagione di Formula 1 tra amici. L'app sincronizza automaticamente i piloti e il calendario ufficiale e permette di inserire pronostici, calcolare punteggi e visualizzare classifiche live.

## ✨ Caratteristiche
- **Sincronizzazione Automatica:** Dati piloti e calendari aggiornati in tempo reale dalle fonti ufficiali F1.
- **Cloud Storage:** Migrata da file JSON locali a **MongoDB Atlas** per persistenza dei dati garantita.
- **Mobile Ready:** Interfaccia ottimizzata per smartphone (aggiungibile alla Home).
- **Classifica Live:** Calcolo automatico dei punti basato sui risultati reali.

## 🛠️ Stack Tecnologico
- **Frontend:** React + TypeScript + Vite.
- **Backend:** Node.js + Express 5 + Mongoose.
- **Database:** MongoDB Atlas (Piano gratuito M0).
- **Hosting consigliato:** Render.com (Web Service gratuito).

## 🚀 Guida al Deploy (Render.com)

1. **Database:**
   - Crea un cluster gratuito su [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - In **Network Access**, consenti l'accesso da ovunque (`0.0.0.0/0`).
   - In **Database Access**, crea un utente e copia la stringa di connessione.

2. **Render.com:**
   - Crea un nuovo **Web Service** collegando il tuo repository GitHub.
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `MONGODB_URI`: la tua stringa di connessione MongoDB Atlas (es. `mongodb+srv://...`).
     - `PORT`: 3001 (Render la imposta automaticamente, ma l'app la rileva).

## 💻 Sviluppo Locale

1. Crea un file `.env` nella root:
   ```env
   MONGODB_URI=mongodb+srv://...
   PORT=3001
   ```
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Avvia in modalità sviluppo:
   ```bash
   # Backend e Frontend insieme
   npm run start:local
   ```

## 👥 Partecipanti Configurati
- **Matteo** (Admin)
- **Fabio**
- **Adriano**

---
Creato da Matteo Bernardini
