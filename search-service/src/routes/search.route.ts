import express from "express";
import { searchTrainsController, autocompleteStationController } from "../controllers/search.controller";

const router = express.Router();

router.get("/trains", searchTrainsController);
router.get("/stations/autocomplete", autocompleteStationController);

export default router;
