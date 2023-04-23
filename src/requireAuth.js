"use strict";

const jwt = require("jsonwebtoken");
const mysq = require("./mysqlCon");

module.exports = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).send({ error: "You must be logged in" });
  }
  const token = authorization.replace("Bearer ", "");
  jwt.verify(token, "secret_key", async (err, payload) => {
    if (err) {
      return res.status(401).send({ error: "You must be logged in" });
    }
    const { ID } = payload;
    const userSorgu = `SELECT Kullanicilar.ID, Kullanicilar.KullaniciAdi, KullaniciRolleri.RolAdi, 
                        KullaniciBirimGorevleri.BirimID FROM Kullanicilar 
                        INNER JOIN KullaniciRolKayitlari ON KullaniciRolKayitlari.KullaniciID = Kullanicilar.ID AND ISNULL(KullaniciRolKayitlari.Bitis) 
                        INNER JOIN KullaniciRolleri ON KullaniciRolKayitlari.KullaniciRoleID = KullaniciRolleri.ID 
                        INNER JOIN KullaniciBirimGorevleri on KullaniciBirimGorevleri.KullaniciID = Kullanicilar.ID AND ISNULL(KullaniciBirimGorevleri.Bitis) 
                        WHERE Kullanicilar.ID = ${ID}`;
    const user = await mysq.sor(userSorgu);

    if (user.length < 1)
      return res.status(401).send({ error: "User not found!" });

    req.user = user[0];
    next();
  });
};