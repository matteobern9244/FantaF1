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

const WeekendPredictionStateSchema = new mongoose.Schema(
  {
    userPredictions: {
      type: Map,
      of: PredictionSchema,
      default: () => ({}),
    },
    raceResults: { type: PredictionSchema, default: () => ({}) },
  },
  { _id: false },
);

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
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  team: { type: String },
  color: { type: String },
  avatarUrl: { type: String },
  teamSlug: { type: String },
});

const SessionSchema = new mongoose.Schema({
  name: { type: String },
  startTime: { type: String },
}, { _id: false });

const WeekendSchema = new mongoose.Schema({
  meetingKey: { type: String, required: true, unique: true },
  meetingName: { type: String },
  grandPrixTitle: { type: String },
  roundNumber: { type: Number },
  dateRangeLabel: { type: String },
  detailUrl: { type: String },
  heroImageUrl: { type: String },
  trackOutlineUrl: { type: String },
  isSprintWeekend: { type: Boolean, default: false },
  startDate: { type: String },
  endDate: { type: String },
  raceStartTime: { type: String },
  sessions: [SessionSchema],
});

const AppDataSchema = new mongoose.Schema({
  users: [UserSchema],
  history: [RaceResultSchema],
  gpName: String,
  raceResults: PredictionSchema,
  selectedMeetingKey: String,
  weekendStateByMeetingKey: {
    type: Map,
    of: WeekendPredictionStateSchema,
    default: () => ({}),
  },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// Modelli
export const AppData = mongoose.model('AppData', AppDataSchema);
export const Driver = mongoose.model('Driver', DriverSchema);
export const Weekend = mongoose.model('Weekend', WeekendSchema);
export const AdminCredential =
  mongoose.models.AdminCredential ||
  mongoose.model(
    'AdminCredential',
    new mongoose.Schema(
      {
        role: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        passwordSalt: { type: String, required: true },
        lastLoginAt: { type: Date },
      },
      { timestamps: true },
    ),
  );
