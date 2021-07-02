import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import connection from "./database.js";
import joi from "joi";
import { SignUpSchema, signInSchema } from "./schemas/usersSchemas.js";

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

app.post("/checkout",async(req,res)=>{
    const authorization = req.headers["authorization"];
    const token = authorization?.replace("Bearer ", "");
    if (!token) return res.sendStatus(400);
    try{
    const resulttoken = await connection.query(
        `SELECT * FROM 
        sessions WHERE token=$1`,
        [token]
    );
    if (resulttoken.rows.length === 0) {
        return res.sendStatus(404);
    }
    const userid=req.body.userid;
    const result=await connection.query(`SELECT * FROM users WHERE id=$1`,[userid]);
    if(result.rowCount===0){
        res.sendStatus(404);return
    };

    let queryGamesCheck=`SELECT * FROM games WHERE`;
    req.body.gamesidlist.map((e,i)=>{
        if(i==req.body.gamesidlist.length-1){
            queryGamesCheck += ` id=$${i + 1}`;
        }else{
            queryGamesCheck += ` id=$${i + 1} OR`;
        }
    })

    const resultgamesid=await connection.query(queryGamesCheck,[...req.body.gamesidlist])
    if(resultgamesid.rows.length!==req.body.gamesidlist.length){
        res.sendStatus(409);return
    }

    let query = `INSERT INTO sales ("userId", "gameId") VALUES`;
    req.body.gamesidlist.map((g, i) => {
    if(i==req.body.gamesidlist.length-1){
    query += `($1, $${i + 2})`;
    }else{
    query += `($1, $${i + 2}),`;}
  });

 
    const request = await connection.query(query, [
    req.body.userid,
    ...req.body.gamesidlist,
  ]);
  res.sendStatus(201)
  }catch(e){
    console.log(e)
    res.sendStatus(500)
  }
})
export default app;
