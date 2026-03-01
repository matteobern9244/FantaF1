import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema({
  first: { type: String, default: '' },
  second: { type: String, default: '' },
  third: { type: String, default: '' },
  pole: { type: String, default: '' },
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  predictions: { type: PredictionSchema, default: () => ({}) },
  points: { type: Number, default: 0 },
});

const RaceResultSchema = new mongoose.Schema({
  gpName: { type: String, required: true },
  meetingKey: { type: String },
  date: { type: String },
  results: { type: PredictionSchema, default: () => ({}) },
  userPredictions: {
    type: Map,
    of: new mongoose.Schema({
      prediction: PredictionSchema,
      pointsEarned: { type: Number, default: 0 },
    }, { _id: false }),
    default: () => ({}),
  },
});

const DriverSchema = new mongoose.Schema({
  id: String,
  name: String,
  team: String,
  color: String,
  countryCode: String,
  imageUrl: String,
});

const WeekendSchema = new mongoose.Schema({
  roundNumber: Number,
  countryName: String,
  location: String,
  grandPrixTitle: String,
  meetingName: String,
  meetingKey: String,
  startDate: String,
  endDate: String,
  isSprint: Boolean,
});

const AppDataSchema = new mongoose.Schema({
  users: [UserSchema],
  history: [RaceResultSchema],
  gpName: String,
  raceResults: PredictionSchema,
  selectedMeetingKey: String,
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// Modelli
export const AppData = mongoose.model('AppData', AppDataSchema);
export const Driver = mongoose.model('Driver', DriverSchema);
export const Weekend = mongoose.model('Weekend', WeekendSchema);
