import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import connection from "./database.js";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/games", async (req, res) => {
  try {
    const request = await connection.query(
      `SELECT * FROM games ORDER BY "soldUnits" DESC`
    );

    res.send(request.rows);
  } catch {
    res.sendStatus(500);
  }
});

app.get("/spotlight", async (req, res) => {
  try {
    const request = await connection.query(`SELECT * FROM spotlight`);
    const reqArray = request.rows;

    const result = await connection.query(
      `SELECT * from games WHERE games.id = $1 OR games.id = $2 OR games.id = $3`,
      [reqArray[0].gameId, reqArray[1].gameId, reqArray[2].gameId]
    );

    res.send(result.rows);
  } catch {
    res.sendStatus(500);
  }
});

export default app;
