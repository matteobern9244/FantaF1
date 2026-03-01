export interface Driver {
  id: string;
  name: string;
  team: string;
  color: string;
}

export const PARTICIPANTS = ["Adriano", "Fabio", "Matteo"];

export const DRIVERS_2026: Driver[] = [
  { id: "ver", name: "Max Verstappen", team: "Oracle Red Bull Racing", color: "#0600EF" },
  { id: "had", name: "Isack Hadjar", team: "Oracle Red Bull Racing", color: "#0600EF" },
  { id: "rus", name: "George Russell", team: "Mercedes AMG Petronas F1 Team", color: "#00D2BE" },
  { id: "ant", name: "Kimi Antonelli", team: "Mercedes AMG Petronas F1 Team", color: "#00D2BE" },
  { id: "lec", name: "Charles Leclerc", team: "Scuderia Ferrari HP", color: "#EF1A2D" },
  { id: "ham", name: "Lewis Hamilton", team: "Scuderia Ferrari HP", color: "#EF1A2D" },
  { id: "nor", name: "Lando Norris", team: "McLaren Mastercard F1 Team", color: "#FF8700" },
  { id: "pia", name: "Oscar Piastri", team: "McLaren Mastercard F1 Team", color: "#FF8700" },
  { id: "alo", name: "Fernando Alonso", team: "Aston Martin Aramco F1 Team", color: "#006F62" },
  { id: "str", name: "Lance Stroll", team: "Aston Martin Aramco F1 Team", color: "#006F62" },
  { id: "gas", name: "Pierre Gasly", team: "BWT Alpine F1 Team", color: "#0090FF" },
  { id: "col", name: "Franco Colapinto", team: "BWT Alpine F1 Team", color: "#0090FF" },
  { id: "alb", name: "Alexander Albon", team: "Atlassian Williams F1 Team", color: "#005AFF" },
  { id: "sai", name: "Carlos Sainz", team: "Atlassian Williams F1 Team", color: "#005AFF" },
  { id: "law", name: "Liam Lawson", team: "Visa Cash App Racing Bulls F1 Team", color: "#6692FF" },
  { id: "lin", name: "Arvid Lindblad", team: "Visa Cash App Racing Bulls F1 Team", color: "#6692FF" },
  { id: "oco", name: "Esteban Ocon", team: "TGR Haas F1 Team", color: "#FFFFFF" },
  { id: "bea", name: "Oliver Bearman", team: "TGR Haas F1 Team", color: "#FFFFFF" },
  { id: "hul", name: "Nico Hulkenberg", team: "Audi Revolut F1 Team", color: "#000000" },
  { id: "bor", name: "Gabriel Bortoleto", team: "Audi Revolut F1 Team", color: "#000000" },
  { id: "per", name: "Sergio Perez", team: "Cadillac F1 Team", color: "#FFD700" },
  { id: "bot", name: "Valtteri Bottas", team: "Cadillac F1 Team", color: "#FFD700" }
];
