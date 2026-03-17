const Database = require('better-sqlite3');
const db = new Database('./dev.db');

try { db.exec("ALTER TABLE [Order] ADD COLUMN paymentMethod TEXT DEFAULT 'cod'"); console.log("Added paymentMethod"); } catch(e) { console.log("paymentMethod exists"); }
try { db.exec("ALTER TABLE [Order] ADD COLUMN paymentStatus TEXT DEFAULT 'pending'"); console.log("Added paymentStatus"); } catch(e) { console.log("paymentStatus exists"); }
try { db.exec("ALTER TABLE [Order] ADD COLUMN upiRef TEXT DEFAULT ''"); console.log("Added upiRef"); } catch(e) { console.log("upiRef exists"); }

console.log("Migration complete");
db.close();
