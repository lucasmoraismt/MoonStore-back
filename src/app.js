import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import connection from "./database.js";
import { SignUpSchema, signInSchema } from "./schemas/usersSchemas.js";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/sign-up", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const validation = SignUpSchema.validate({ name, email, password });

    if (validation.error) {
      console.log(validation.error);
      res.sendStatus(400);
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const request = await connection.query(
      `
        INSERT INTO users (name, email, password) 
        SELECT $1, $2, $3
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = $2)
        `,
      [name, email, passwordHash]
    );
    if (request.rowCount > 0) {
      res.sendStatus(201);
    } else {
      res.sendStatus(409);
    }
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const validation = signInSchema.validate(req.body);

  if (validation.error) {
    res.sendStatus(400);
    return;
  }

  try {
    const result = await connection.query(
      `SELECT * FROM users WHERE email=$1`,
      [email]
    );
    const user = result.rows[0];
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = uuid();
      delete user["password"];
      await connection.query(
        `
            INSERT INTO sessions ("userId", token)
            VALUES ($1, $2)
        `,
        [user.id, token]
      );
      res.send({ token, userid: user.id, username: user.name }).status(200);
    } else {
      res.sendStatus(401);
    }
  } catch {
    res.sendStatus(500);
  }
});

app.delete("/logout", async (req, res) => {
  const authorization = req.headers["authorization"];
  const token = authorization?.replace("Bearer ", "");
  if (!token) return res.sendStatus(400);
  try {
    const result = await connection.query(
      `SELECT * FROM 
      sessions WHERE token=$1`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.sendStatus(404);
    }
    await connection.query(
      `DELETE FROM sessions 
    WHERE token=$1`,
      [token]
    );
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});
export default app;
