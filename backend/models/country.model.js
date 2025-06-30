import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensures each country name is unique
  },
  states: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State', // Reference to State model
    }
  ],
}, { timestamps: true });

export const Country = mongoose.model('Country', countrySchema);




