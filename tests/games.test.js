import app from "../src/app.js";
import supertest from "supertest";
import connection from "../src/database.js";

afterAll(() => {
  connection.end();
});

describe("GET /games", () => {
  it("returns games array", async () => {
    const request = await supertest(app).get("/games");
    expect.arrayContaining(Object);
  });
});

describe("GET /spotlight", () => {
  it("returns 3 spotlight games", async () => {
    const request = await supertest(app).get("/spotlight");
    expect.arrayContaining(Object);
  });
});
