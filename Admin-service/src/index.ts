import express from "express";
import { config } from "./config/index";


const app = express();

app.get("/health", (req, res) => {
    res.status(200).send("Admin Service is healthy");
});

const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`🚀 Admin Service running on port ${PORT}`);
});
