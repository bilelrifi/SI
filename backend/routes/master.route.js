
import express from 'express';
import { addCity, addCountry, addMasterData, addState, getMasterData } from '../controllers/masterdata.controller.js';

const router = express.Router();

// Route to add country, state, or city
router.post('/add', addMasterData);
router.get('/get', getMasterData);
router.post('/country', addCountry);
router.post('/state',addState);
router.post('/city', addCity);

export default router;

