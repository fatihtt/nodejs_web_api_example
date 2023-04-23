"use strict";

const express = require("express");
const mysql = require("./mysqlCon");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const requireAuth = require("./requireAuth");

const router = express.Router();

router.post("/makehash", async (req, res) => {
  const { password } = req.body;
  console.log(password);

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) {
        return next(err);
      }
      res.send(hash);
    });
  });
});

router.get("/ben_neyim", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    return res.status(422).send({ error: "ne olduğunu bulamadım" });
  }
})

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send({ error: "Must provide email and password" });
  }
  const userSorgu = `SELECT * FROM Kullanicilar WHERE Kullanicilar.KullaniciEMail = "${email}"`;
  const user = await mysql.sor(userSorgu);
  if (user.length < 1) {
    return res.status(422).send({ error: "Invalid password or email.1" });
  }

  try {
    bcrypt.compare(password, user[0].Sifre, (err, isMatch) => {
      if (err) {
        return res.status(422).send({ error: `Invalid password or email.` });
      }
      if (!isMatch) {
        return res.status(422).send({ error: `Invalid password or email.` });
      }
      const token = jwt.sign({ ID: user[0].ID }, "secret_key");
      res.send(token);
    });
  } catch (err) {
    return res.status(422).send({ error: "Invalid password or email." });
  }
});

/* take active roles with token
// requireAuth'daki sorgu düzenlendi, buna gerek kalmadı req.body.RolAdi'ndan erişilebiliyor
router.get("/active_role", requireAuth,  async (req, res) => {
  try {
    const { token } = req.body;
    console.log(req.user.ID);
    const userID = req.user.ID;
    // determine userID
    // will tipo returning user role
    // return active role name from userid
    const userSorgu = `SELECT KullaniciRolKayitlari.ID, KullaniciRolKayitlari.Baslangic, KullaniciRolleri.RolAdi,
                        KullaniciRolleri.RolEtiketi FROM KullaniciRolKayitlari 
                        INNER JOIN KullaniciRolleri ON KullaniciRolKayitlari.KullaniciRoleID = KullaniciRolleri.ID 
                        WHERE KullaniciRolKayitlari.KullaniciID = ${ userID } AND ISNULL(KullaniciRolKayitlari.Bitis)`;
    const userActiveRole = await mysql.sor(userSorgu);
    if (userActiveRole.length != 1) return next(err);
    res.send(req.user);
    
  } catch (err) {
    return res.status(422).send({ error: "yetkisiz kullanıcı" });
  }
});
*/
module.exports = router;