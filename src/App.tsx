import React, { useState, useEffect, useCallback } from 'react';
import { PARTICIPANTS, DRIVERS_2026, Driver } from './data';
import { Trophy, User, ListChecks, RotateCw, Trash2 } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:3001/api/data';

interface Prediction {
  first: string;
  second: string;
  third: string;
  pole: string;
}

interface RaceRecord {
  gpName: string;
  date: string;
  results: Prediction;
  userPredictions: {
    [userName: string]: {
      prediction: Prediction;
      pointsEarned: number;
    }
  };
}

interface UserData {
  name: string;
  predictions: Prediction;
  points: number;
}

const App: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [history, setHistory] = useState<RaceRecord[]>([]);
  const [gpName, setGpName] = useState('');
  const [raceResults, setRaceResults] = useState<Prediction>({
    first: '', second: '', third: '', pole: ''
  });
  const [loading, setLoading] = useState(true);

  // Load data from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dataRes = await fetch(API_URL);
        const data = await dataRes.json();
        
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        } else {
          setUsers(PARTICIPANTS.map(name => ({
            name,
            predictions: { first: '', second: '', third: '', pole: '' },
            points: 0
          })));
        }
        setHistory(data.history || []);
        setGpName(data.gpName || '');
        setRaceResults(data.raceResults || { first: '', second: '', third: '', pole: '' });
      } catch (err) {
        console.error('Error loading data:', err);
        // Fallback initialization
        setUsers(PARTICIPANTS.map(name => ({
          name,
          predictions: { first: '', second: '', third: '', pole: '' },
          points: 0
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Global Save Function
  const syncWithBackend = useCallback((data: any) => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error('Error saving data:', err));
  }, []);

  // Save when users, history, gpName, or raceResults change
  useEffect(() => {
    if (!loading) {
      syncWithBackend({ users, history, gpName, raceResults });
    }
  }, [users, history, gpName, raceResults, loading, syncWithBackend]);

  const calculatePotentialPoints = (userPred: Prediction) => {
    let pts = 0;
    if (userPred.first === raceResults.first && raceResults.first !== '') pts += 5;
    if (userPred.second === raceResults.second && raceResults.second !== '') pts += 3;
    if (userPred.third === raceResults.third && raceResults.third !== '') pts += 2;
    if (userPred.pole === raceResults.pole && raceResults.pole !== '') pts += 1;
    return pts;
  };

  const updatePrediction = (userName: string, field: keyof Prediction, value: string) => {
    setUsers(prev => prev.map(u => 
      u.name === userName ? { ...u, predictions: { ...u.predictions, [field]: value } } : u
    ));
  };

  const clearAllPredictions = () => {
    if (window.confirm('Vuoi pulire tutti i pronostici attuali?')) {
      setUsers(prev => prev.map(u => ({
        ...u,
        predictions: { first: '', second: '', third: '', pole: '' }
      })));
      setRaceResults({ first: '', second: '', third: '', pole: '' });
      setGpName('');
    }
  };

  const calculatePoints = () => {
    if (!gpName) return alert('Inserisci il nome del Gran Premio!');
    if (!raceResults.first || !raceResults.second || !raceResults.third || !raceResults.pole) {
      return alert('Inserisci tutti i risultati reali!');
    }

    const newRaceRecord: RaceRecord = {
      gpName,
      date: new Date().toLocaleDateString(),
      results: { ...raceResults },
      userPredictions: {}
    };

    const updatedUsers = users.map(user => {
      let pts = 0;
      if (user.predictions.first === raceResults.first) pts += 5;
      if (user.predictions.second === raceResults.second) pts += 3;
      if (user.predictions.third === raceResults.third) pts += 2;
      if (user.predictions.pole === raceResults.pole) pts += 1;

      newRaceRecord.userPredictions[user.name] = {
        prediction: { ...user.predictions },
        pointsEarned: pts
      };

      return { ...user, points: user.points + pts };
    });

    setUsers(updatedUsers);
    setHistory(prev => [newRaceRecord, ...prev]);
    alert(`Gara ${gpName} salvata! Punti assegnati: Fabio, Adriano e Matteo aggiornati.`);
    
    // Auto-clear for next GP
    setGpName('');
    setRaceResults({ first: '', second: '', third: '', pole: '' });
  };

  const getDriverName = (id: string) => DRIVERS_2026.find(d => d.id === id)?.name || '-';
  const sortedDrivers = [...DRIVERS_2026].sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return <div className="loading"><RotateCw className="spin" size={48} /> <span>Caricamento Fanta F1...</span></div>;

  return (
    <div className="container">
      <header>
        <h1><Trophy className="icon-gold" /> FANTA F1 2026</h1>
        <div className="leaderboard">
          {[...users].sort((a, b) => b.points - a.points).map(u => (
            <div key={u.name} className="leader-card">
              <span className="name">{u.name}</span>
              <span className="points">{u.points} pts</span>
            </div>
          ))}
        </div>
      </header>

      <div className="layout-grid">
        <main className="content-area">
          <section className="admin-header">
            <h2><User size={28} /> INSERIMENTO PRONOSTICI (Admin: Matteo)</h2>
            <button className="btn-secondary" onClick={clearAllPredictions}>
              <Trash2 size={18} /> PULISCI TUTTO PER NUOVO GP
            </button>
          </section>

          <section className="predictions-grid">
            {users.map(user => (
              <div key={user.name} className="user-section">
                <h3>{user.name}</h3>
                <div className="input-group">
                  <label>Vincitore (1°) - 5pt</label>
                  <select value={user.predictions.first} onChange={(e) => updatePrediction(user.name, 'first', e.target.value)}>
                    <option value="">Seleziona Pilota...</option>
                    {sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.team})</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Secondo Posto (2°) - 3pt</label>
                  <select value={user.predictions.second} onChange={(e) => updatePrediction(user.name, 'second', e.target.value)}>
                    <option value="">Seleziona Pilota...</option>
                    {sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.team})</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Terzo Posto (3°) - 2pt</label>
                  <select value={user.predictions.third} onChange={(e) => updatePrediction(user.name, 'third', e.target.value)}>
                    <option value="">Seleziona Pilota...</option>
                    {sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.team})</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Pole Position / Sprint - 1pt</label>
                  <select value={user.predictions.pole} onChange={(e) => updatePrediction(user.name, 'pole', e.target.value)}>
                    <option value="">Seleziona Pilota...</option>
                    {sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.team})</option>)}
                  </select>
                </div>
              </div>
            ))}
          </section>

          <section className="results-admin">
            <h2><ListChecks size={28} /> RISULTATI REALI GARA</h2>
            <div className="gp-input">
              <label>Nome Gran Premio</label>
              <input type="text" value={gpName} onChange={(e) => setGpName(e.target.value)} placeholder="es. Monza, Silverstone..." />
            </div>
            <div className="admin-grid">
              <div className="input-group"><label>1° Classificato</label><select value={raceResults.first} onChange={(e) => setRaceResults({...raceResults, first: e.target.value})}><option value="">-</option>{sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div className="input-group"><label>2° Classificato</label><select value={raceResults.second} onChange={(e) => setRaceResults({...raceResults, second: e.target.value})}><option value="">-</option>{sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div className="input-group"><label>3° Classificato</label><select value={raceResults.third} onChange={(e) => setRaceResults({...raceResults, third: e.target.value})}><option value="">-</option>{sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div className="input-group"><label>Pole / Vincitore Sprint</label><select value={raceResults.pole} onChange={(e) => setRaceResults({...raceResults, pole: e.target.value})}><option value="">-</option>{sortedDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            </div>
            <button className="btn-primary" onClick={calculatePoints}>CONFERMA RISULTATI E ASSEGNA PUNTI</button>
          </section>

          {history.length > 0 && (
            <section className="history-section">
              <h2><Trophy size={28} /> STORICO CAMPIONATO</h2>
              {history.map((record, i) => (
                <div key={i} className="history-card">
                  <div className="history-header">
                    <strong>{record.gpName}</strong> <span>{record.date}</span>
                  </div>
                  <div className="history-results">
                    Reale: 1° {getDriverName(record.results.first)} | 2° {getDriverName(record.results.second)} | 3° {getDriverName(record.results.third)} | Pole/Sprint: {getDriverName(record.results.pole)}
                  </div>
                  <div className="history-users">
                    {Object.entries(record.userPredictions).map(([name, data]) => (
                      <div key={name} className="user-history-row">
                        <strong>{name}:</strong> {data.pointsEarned} pt 
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>

        <aside className="rules-sidebar">
          <h3>📜 REGOLE F1 2026</h3>
          <div className="rules-content">
            <div className="rule-item">
              <span className="rule-points">+5</span>
              <p>Chi indovina la <strong>1ª posizione</strong></p>
            </div>
            <div className="rule-item">
              <span className="rule-points">+3</span>
              <p>Chi indovina la <strong>2ª posizione</strong></p>
            </div>
            <div className="rule-item">
              <span className="rule-points">+2</span>
              <p>Chi indovina la <strong>3ª posizione</strong></p>
            </div>
            <div className="rule-item">
              <span className="rule-points">+1</span>
              <p>Chi indovina la <strong>Pole Position</strong> (o vincitore Sprint se presente)</p>
            </div>
          </div>

          <div className="live-leaderboard">
            <h3>🏁 CLASSIFICA LIVE GARA</h3>
            {[...users].sort((a, b) => (b.points + calculatePotentialPoints(b.predictions)) - (a.points + calculatePotentialPoints(a.predictions))).map(u => (
              <div key={u.name} className="live-row">
                <span>{u.name}</span>
                <strong>{u.points + calculatePotentialPoints(u.predictions)} pt</strong>
              </div>
            ))}
            <small className="live-hint">(Punteggio totale inclusa proiezione gara)</small>
          </div>
        </aside>
      </div>

      <footer>
        <p>© 2026 FantaF1 - Admin: Matteo | Partecipanti: Adriano, Fabio, Matteo</p>
      </footer>
    </div>
  );
};

export default App;
