import assert from "node:assert";
import { describe, it } from "mocha";
import mongoose from "mongoose";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import { Announcement } from "../../../src/server/models/Announcement";

describe("/", () => {
  let databaseConnection: mongoose.Mongoose;

  before(async () => {
    databaseConnection = await mongoose.connect(process.env.DATABASE_URI ?? "");
  });

  afterEach(async () => {
    await databaseConnection.connection.db!.dropDatabase();
  });

  after(async () => {
    await databaseConnection.connection.close();
  });

  it("renders the empty announcement state", async () => {
    const response = await request(createWebServer()).get("/").expect(200);

    assert.match(response.text, /There are no announcements at the moment/);
  });

  it("shows only the five newest announcements in newest-first order", async () => {
    for (let number = 1; number <= 6; number++) {
      await Announcement.create({
        title: `Announcement ${number}`,
        body: `Body ${number}`,
        author: "Test Author",
        creationDateAndTime: new Date(2025, 0, number)
      });
    }

    const response = await request(createWebServer()).get("/").expect(200);

    assert.doesNotMatch(response.text, /Announcement 1/);
    for (let number = 2; number <= 6; number++) {
      assert.match(response.text, new RegExp(`Announcement ${number}`));
    }
    assert.ok(
      response.text.indexOf("Announcement 6") <
        response.text.indexOf("Announcement 5")
    );
    assert.ok(
      response.text.indexOf("Announcement 5") <
        response.text.indexOf("Announcement 2")
    );
  });

  it("renders Markdown without executing raw HTML", async () => {
    await Announcement.create({
      title: "Safe announcement",
      body: "**Important** <script>alert('unsafe')</script>",
      author: "Test Author",
      creationDateAndTime: new Date()
    });

    const response = await request(createWebServer()).get("/").expect(200);

    assert.match(response.text, /<strong>Important<\/strong>/);
    assert.doesNotMatch(response.text, /<script>alert\('unsafe'\)<\/script>/);
    assert.match(response.text, /&lt;script&gt;/);
  });
});
