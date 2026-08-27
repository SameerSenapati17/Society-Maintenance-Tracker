import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { verifySmtpConnection } from "./services/emailService.js";

connectDb()
  .then(async () => {
    await verifySmtpConnection();
    app.listen(env.port, () => console.log(`Backend running on port ${env.port}`));
  })
  .catch((error) => {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });

