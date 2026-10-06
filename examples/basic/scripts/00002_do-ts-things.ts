import { defineScript } from "@srvm/core";

export default defineScript({
  meta: {
    name: "Do TS Things",
    description: "Does TS things",
  },
  async up() {
    console.log("do-ts-things-up");
  },
  async down() {
    console.log("do-ts-things-down");
  },
});
