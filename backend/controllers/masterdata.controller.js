import { City } from "../models/city.model.js";
import { Country } from "../models/country.model.js";
import { State } from "../models/state.model.js";

export const addCountry = async (req, res) => {
  const { country } = req.body;

  try {
    const existingCountry = await Country.findOne({ country });
    if (existingCountry) {
      return res.status(400).json({ message: "Country already exists." });
    }

    const newCountry = await Country.create({ country });
    return res.status(201).json({ message: "Country added", data: newCountry });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const addState = async (req, res) => {
  const { state, countryId } = req.body;

  try {
    const foundCountry = await Country.findById(countryId);
    if (!foundCountry) {
      return res.status(404).json({ message: "Country not found." });
    }

    // Create the new state
    const newState = await State.create({ name: state, country: countryId });

    // Add the state to the country's states list
    foundCountry.states.push(newState._id);
    await foundCountry.save();

    return res.status(201).json({ message: "State added", data: newState });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const addCity = async (req, res) => {
  const { city, stateId } = req.body;

  try {
    const foundState = await State.findById(stateId);
    if (!foundState) {
      return res.status(404).json({ message: "State not found." });
    }

    // Create the new city
    const newCity = await City.create({ name: city, state: stateId });

    // Add the city to the state's cities list
    foundState.cities.push(newCity._id);
    await foundState.save();

    return res.status(201).json({ message: "City added", data: newCity });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const addMasterData = async (req, res) => {
  const { country, state, city, countryId, stateId } = req.body;

  try {
    if (country) {
      // Add Country
      const existingCountry = await Country.findOne({ name: country });
      if (existingCountry) {
        return res.status(400).json({ message: "Country already exists." });
      }
      const newCountry = await Country.create({ name: country });
      return res
        .status(201)
        .json({ message: "Country added", data: newCountry });
    }

    if (state && countryId) {
      // Add State
      const foundCountry = await Country.findById(countryId);
      if (!foundCountry) {
        return res.status(404).json({ message: "Country not found." });
      }

      // Create the new state
      const newState = await State.create({ name: state, country: countryId });

      // Update the country to include this new state
      foundCountry.states.push(newState._id);
      await foundCountry.save();

      return res.status(201).json({ message: "State added", data: newState });
    }

    if (city && stateId) {
      // Add City
      const foundState = await State.findById(stateId);
      if (!foundState) {
        return res.status(404).json({ message: "State not found." });
      }

      // Create the new city
      const newCity = await City.create({ name: city, state: stateId });

      // Update the state to include this new city
      foundState.cities.push(newCity._id);
      await foundState.save();

      return res.status(201).json({ message: "City added", data: newCity });
    }

    return res.status(400).json({ message: "Invalid data provided" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getMasterData = async (req, res) => {
  try {
    const countries = await Country.find();
    const states = await State.find()
      .select("name")
      .populate("country", "name");
    const cities = await City.find().select("name").populate("state", "name");

    return res.status(200).json({
      message: "Data retrieved successfully",
      data: {
        countries,
        states,
        cities,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
