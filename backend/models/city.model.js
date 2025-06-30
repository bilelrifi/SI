import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State', // Reference to State model
    required: true,
  },
}, { timestamps: true });

export const City = mongoose.model('City', citySchema);
