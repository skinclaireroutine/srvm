import pg from "pg";
import { defineScript } from "@srvm/core";

export default defineScript({
  meta: {
    name: "Seed notes",
    description: "Inserts the first note",
  },
  async up() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("INSERT INTO notes (body) VALUES ($1)", ["Hello from srvm"]);
      console.log("seeded notes");
    } finally {
      await client.end();
    }
  },
  async down() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("DELETE FROM notes WHERE body = $1", ["Hello from srvm"]);
      console.log("removed seeded note");
    } finally {
      await client.end();
    }
  },
});
