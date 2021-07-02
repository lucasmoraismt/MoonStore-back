import app from "../src/app.js";
import supertest from 'supertest';
import connection from "../src/database.js";
import bcrypt from "bcrypt";

let passwordTest=''

afterAll(async() => {
    connection.end();
});

describe("POST /sign-up", () => {
    beforeEach(async ()=>{
        await connection.query(`DELETE FROM users`);
    });


    it("returns status 400 for empty params",async()=>{
        const body={}
        const result=await supertest(app).post("/sign-up").send(body);
        expect(result.status).toEqual(400);
    });


    it("returns status 201 for valid params",async ()=>{
        const body={name:"test",email:"test@test.com",password:"123456"}
        const result=await supertest(app).post("/sign-up").send(body);
        expect(result.status).toEqual(201);
    });


    it("returns status 409 for conflicted email",async ()=>{
        const body={name:"test",email:"test@test.com",password:"123456"}
        await connection.query(`INSERT INTO users (name,email,password) 
        VALUES ($1,$2,$3)`,[body.name,body.email,body.password]);

        const result=await supertest(app).post("/sign-up").send(body);
        expect(result.status).toEqual(409);
    });
}); 


describe("POST /login", () => {

  beforeEach(async()=>{
    await connection.query(`DELETE FROM sessions`);
    await connection.query(`DELETE FROM users`);
  })


  it("returns status 400 for empty params",async()=>{
    const body={};
    const result=await supertest(app).post("/login").send(body);
    expect(result.status).toEqual(400);
  });


  it("returns a valid session token with status 200 for valid email and password",async ()=>{
    const hash=bcrypt.hashSync('123456',10);

    await connection.query(`INSERT INTO users (name,email,password)
    VALUES ($1,$2,$3)`,['testtestando','testee@test.com',hash]);

    const body={email:"testee@test.com",password:"123456"};

    const beforeSessions=await connection.query(`Select * FROM sessions`);
    expect(beforeSessions.rows.length).toEqual(0);

    const result=await supertest(app).post("/login").send(body);

    const afterSessions=await connection.query(`Select * FROM sessions`);
    expect(afterSessions.rows.length).toEqual(1);
    const session=afterSessions.rows[0];

    expect(result.body.token).toEqual(session.token);
    expect(result.status).toEqual(200)
  });


  it("returns status 401 for inexistent email",async ()=>{
    const body={email:"testee@test.com",password:"123456"};
    const result=await supertest(app).post("/login").send(body);
    expect(result.status).toEqual(401)
  });


  it("returns status 401 for wrong password",async ()=>{
    const hash=bcrypt.hashSync('123456',10);
    await connection.query(`INSERT INTO users (name,email,password)
    VALUES ($1,$2,$3)`,['testtestando','testee@test.com',hash]);

    const body={email:"testee@test.com",password:"12345689"};

    const result=await supertest(app).post("/login").send(body);
    expect(result.status).toEqual(401)
  });
}); 

describe("DELETE /logout",()=>{
    beforeEach(async()=>{
        await connection.query(`DELETE FROM sessions`);
        await connection.query(`DELETE FROM users`);
    })

    it("returns status 400 for no token sent",async ()=>{
        const result=await supertest(app).delete("/logout");
        expect(result.status).toEqual(400)
    });

    it("returns status 404 for invalid token",async ()=>{
        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
    `, [1, 'abc']);
        const result=await supertest(app).delete("/logout").set("Authorization",'teste');
        expect(result.status).toEqual(404)
    });

    it("returns status 200 for valid token",async ()=>{
        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
    `, [1, 'abc']);
        const result=await supertest(app).delete("/logout").set("Authorization",'abc');
        expect(result.status).toEqual(200)
    });
});

describe("POST /checkout",()=>{
    beforeEach(async()=>{
        await connection.query(`DELETE FROM sessions`);
        await connection.query(`DELETE FROM users`);
    });

    beforeAll(async()=>{
        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
        `, [1, 'abc']);
    });

    it("returns status 400 for no token sent",async ()=>{
        const result=await supertest(app).post("/checkout");
        expect(result.status).toEqual(400)
    });

    it("returns status 404 for invalid token",async ()=>{
        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
    `, [1, 'abc']);
        const result=await supertest(app).post("/checkout").set("Authorization",'teste');
        expect(result.status).toEqual(404)
    });


    it("returns status 404 for invalid userid",async()=>{
        const gameTest=await connection.query(`insert into games (title) 
        VALUES ('testing') returning id`);
        const body={
            userid:5,
            gamesidlist:gameTest.rows
        };
        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
    `, [1, 'abc']);
        const result=await supertest(app).post("/checkout").send(body).set("Authorization",'abc');
        expect(result.status).toEqual(404)
    });


    it("returns status 409 for invalid gameid",async()=>{
        await connection.query(`DELETE FROM games`);
        const useridtest=await connection.query(`INSERT INTO users (name) VALUES ('teste') returning id`);
        const body={
            userid:useridtest.rows[0].id,
            gamesidlist:[0]
        };
        
        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
    `, [1, 'abc']);
        const result=await supertest(app).post("/checkout").send(body).set("Authorization",'abc');
        expect(result.status).toEqual(409)
    });


    it("returns status 201 for valid params",async()=>{
        await connection.query(`DELETE FROM games`);
        const useridtest=await connection.query(`INSERT INTO users (name) VALUES ('teste') returning id`);
        const gameidtest=await connection.query(`INSERT INTO games (title) VALUES ('teste') returning id`)
        const body={
            userid:useridtest.rows[0].id,
            gamesidlist:[gameidtest.rows[0].id]
        };

        await connection.query(`INSERT INTO sessions ("userId", token)
        VALUES ($1, $2)
    `, [1, 'abc']);
        const result=await supertest(app).post("/checkout").send(body).set("Authorization",'abc');
        expect(result.status).toEqual(201)
    });
});