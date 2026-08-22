import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

connectDb()
  .then(() => {
    app.listen(env.port, () => console.log(`Backend running on port ${env.port}`));
  })
  .catch((error) => {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });
