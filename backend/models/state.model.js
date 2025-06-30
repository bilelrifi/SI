import mongoose from "mongoose";

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country', // Reference to Country model
    required: true,
  },
  cities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City', // Reference to City model
    }
  ],
}, { timestamps: true });

export const State = mongoose.model('State', stateSchema);
