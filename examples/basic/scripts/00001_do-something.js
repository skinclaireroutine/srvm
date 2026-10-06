import { defineScript } from "@srvm/core";

export default defineScript({
  meta: {
    name: "Do Something",
    description: "Does something",
  },
  async up() {
    console.log('up');
  },
  async down() {
    console.log('down');
  },
});
