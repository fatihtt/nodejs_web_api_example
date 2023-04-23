"use strict";

const express = require("express");
const mysql = require("./mysqlCon");
const requireAuth = require("./requireAuth");

const router = express.Router();

router.post("/yeni_talep", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta", "birimsef", "yonetim"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        const gelen = req.body;
        const { ytBirimID, ytTalepBasligi, ytTalepAciklama } = gelen;

        // #ID   #Zaman   BirimID     #KaydedenID       Talep	Aciklama	
        const yt_zaman = new Date().toJSON();
        const yt_birimID = ytBirimID;
        const yt_kaydedenID = req.user.ID;
        const yt_talep = ytTalepBasligi;
        const yt_aciklama = ytTalepAciklama;

        if (!yt_birimID || !yt_talep) return res.status(422).send({ error: "eksik bilgi" });

        const mySorgu = `INSERT INTO TeknikTalepler VALUES (DEFAULT, "${yt_zaman}", ${yt_birimID}, ${yt_kaydedenID}, "${yt_talep}", "${yt_aciklama}")`;
        let sonuc = await mysql.sor(mySorgu);

        if (!sonuc) return res.status(422).send({ error: "kayıt esnasında hata oluştu" });

        res.send(sonuc);
    } catch (err) {
        return res.status(422).send({ error: "yetkisiz işlem" });
    }
});

router.post("/talep_kapama", requireAuth, async (req, res) => {
    try {
        const gelen = req.body;
        const { talepID } = gelen;
        const mySorgu = `SELECT TeknikTalepSonlandirmalar.ID AS ID, TeknikTalepID, KullaniciID, TeknikOnay, BirimOnay, Aciklama, Zaman,MakineDurusSuresi, Degisen, Onarilan, Kullanicilar.KullaniciAdi AS Kullanici FROM TeknikTalepSonlandirmalar
        INNER JOIN Kullanicilar ON Kullanicilar.ID = TeknikTalepSonlandirmalar.KullaniciID
        WHERE TeknikTalepID = ${talepID}`;
        let sonuc = await mysql.sor(mySorgu);
        if (!sonuc) return res.status(422).send({ error: "Sonlandırma alınırken hata oluştu" });
        res.send(sonuc);
    } catch (err) {
        return res.status(423).send({ error: err.message });
    }
});

router.post("/talep_gelismeler", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta", "birimsef", "yonetim"];

        const userRole = req.user.RolAdi;
        if (!yetkililer.includes(userRole)) return res.status(421).send({ error: `yetkisiz işlem` });

        const gelen = req.body;
        const { ygTalepID } = gelen;

        const mySorgu = `SELECT TalepGelisme.ID, TalepID, Zaman, KullaniciID AS GonderenID, Aciklama, 
                            Kullanicilar.KullaniciAdi AS Gonderen
                            FROM TalepGelisme
                            INNER JOIN Kullanicilar ON Kullanicilar.ID = TalepGelisme.KullaniciID
                            WHERE TalepID = ${ygTalepID}`;

        let sonuc = await mysql.sor(mySorgu);

        if (!sonuc) return res.status(424).send({ error: "kayıt esnasında hata oluştu" });
        res.send(sonuc);

    } catch (err) {
        return res.status(423).send({ error: err.message });
    }
});

router.post("/yeni_talep_gelisme", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta"];

        const userRole = req.user.RolAdi;
        if (!yetkililer.includes(userRole)) return res.status(421).send({ error: `yetkisiz işlem` });

        const gelen = req.body;
        const { ygTalepID, ygGelismeAciklama } = gelen;
        const ygZaman = new Date().toJSON();
        const ygKaydedenID = req.user.ID;

        const mySorgu = `INSERT INTO TalepGelisme VALUES (DEFAULT, ${ygKaydedenID}, ${ygTalepID}, ${ygGelismeAciklama}, "${ygZaman}")`;
        let sonuc = await mysql.sor(mySorgu);

        if (!sonuc) return res.status(424).send({ error: "kayıt esnasında hata oluştu" });

        const mySorguAfterAdd = `SELECT TalepGelisme.ID, TalepID, Zaman, KullaniciID AS GonderenID, Aciklama, Kullanicilar.KullaniciAdi AS Gonderen
                                    FROM TalepGelisme
                                    INNER JOIN Kullanicilar ON Kullanicilar.ID = TalepGelisme.KullaniciID
                                    WHERE TalepID = ${ygTalepID}`;
        let sonucAfterAdd = await mysql.sor(mySorguAfterAdd);

        if (!sonucAfterAdd) res.status(425).send({ error: "listeleme sırasında hata oluştu" });

        res.send(sonucAfterAdd);
        //res.send(sonuc);

    } catch (err) {
        return res.status(423).send({ error: err.message });
    }
});
router.get("/talep_listele", requireAuth, async (req, res) => {
    // birimsef kendi birimindekileri görüyor, geri kalan roller tüm birimlerdeki talepleri görüyor
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta", "birimsef", "yonetim"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        /*
        SELECT TeknikTalepler.ID, TeknikTalepler.Zaman, TeknikTalepler.BirimID, TeknikTalepler.KaydedenID, TeknikTalepler.Talep, TeknikTalepler.Aciklama, Kullanicilar.KullaniciAdi AS KaydedenKullanici, Birimler.BirimAdi FROM TeknikTalepler
        INNER JOIN Kullanicilar ON Kullanicilar.ID = TeknikTalepler.KaydedenID
        INNER JOIN Birimler ON Birimler.ID = TeknikTalepler.BirimID
        */

        let mysqlSorgu = "SELECT * FROM TeknikTalepler";
        mysqlSorgu = `
        SELECT TeknikTalepler.ID, TeknikTalepler.Zaman, TeknikTalepler.BirimID, TeknikTalepler.KaydedenID, TeknikTalepler.Talep, TeknikTalepler.Aciklama, Kullanicilar.KullaniciAdi AS KaydedenKullanici, Birimler.BirimAdi FROM TeknikTalepler
        INNER JOIN Kullanicilar ON Kullanicilar.ID = TeknikTalepler.KaydedenID
        INNER JOIN Birimler ON Birimler.ID = TeknikTalepler.BirimID
        `;
        mysqlSorgu = `
        SELECT TeknikTalepler.ID, TeknikTalepler.Zaman, TeknikTalepler.BirimID, TeknikTalepler.KaydedenID, TeknikTalepler.Talep, TeknikTalepler.Aciklama, Kullanicilar.KullaniciAdi AS KaydedenKullanici, Birimler.BirimAdi, COUNT(DISTINCT TeknikTalepSonlandirmalar.ID) AS SonlandirmaSayisi, TeknikTalepSonlandirmalar.Zaman AS SonlandirmaZamani FROM TeknikTalepler
        INNER JOIN Kullanicilar ON Kullanicilar.ID = TeknikTalepler.KaydedenID
        INNER JOIN Birimler ON Birimler.ID = TeknikTalepler.BirimID
        LEFT JOIN TeknikTalepSonlandirmalar ON TeknikTalepler.ID = TeknikTalepSonlandirmalar.TeknikTalepID
        `;

        //onlanmamisTalep if ?li=0
        const sonVarMi = req.query.li;
        if (sonVarMi && sonVarMi === 0) {
            mysqlSorgu = `
            SELECT
                t.*,
                s.sonlanmis
            FROM TeknikTalepler t
            LEFT JOIN (SELECT COUNT(ID) AS sonlanmis, TeknikTalepSonlandirmalar.TeknikTalepID AS TID FROM TeknikTalepSonlandirmalar) s ON s.TID = t.ID
            WHERE (s.sonlanmis = 0 OR s.sonlanmis IS NULL)
            `;
        }

        if (req.user.RolAdi === "birimsef") {
            const x = `BirimID = ${req.user.BirimID}`
            if (sonVarMi && sonVarMi === 0) mysqlSorgu += ` AND ${x}`;
            else mysqlSorgu += ` WHERE ${x}`;
        }
        mysqlSorgu += `
        GROUP BY TeknikTalepler.ID`;
        //console.log(mysqlSorgu);
        const mysqlSonuc = await mysql.sor(mysqlSorgu);
        res.send(mysqlSonuc);

    } catch (err) {
        return res.status(422).send({ error: "yetkisiz işlem" });
    }
});
router.get("kapali_talepler", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "birimsef", "yonetim"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        mysqlSorgu = `
        SELECT TeknikTalepler.ID, TeknikTalepler.Zaman, TeknikTalepler.BirimID, TeknikTalepler.KaydedenID, TeknikTalepler.Talep, TeknikTalepler.Aciklama, Kullanicilar.KullaniciAdi AS KaydedenKullanici, Birimler.BirimAdi, COUNT(DISTINCT TeknikTalepSonlandirmalar.ID) AS SonlandirmaSayisi FROM TeknikTalepler
        INNER JOIN Kullanicilar ON Kullanicilar.ID = TeknikTalepler.KaydedenID
        INNER JOIN Birimler ON Birimler.ID = TeknikTalepler.BirimID
        LEFT JOIN TeknikTalepSonlandirmalar ON TeknikTalepler.ID = TeknikTalepSonlandirmalar.TeknikTalepID
        `;

    } catch (err) {
        return res.status(422).send({ error: "program hatasi" });
    }
});
router.post("/yeni_talep_sonlandirma", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        const gelen = req.body;
        const { ysTeknikTalepID, ysAciklama, ysMakineDurusSuresi, ysDegisen, ysOnarilan } = gelen;

        if (!ysTeknikTalepID) return res.status(422).send({ error: "talep no yok" });

        // #ID TeknikTalepID KullaniciID #TeknikOnay #BirimOnay Aciklama #Zaman MakineDurusSuresi
        const ysZaman = new Date().toJSON();
        const ysKullaniciID = req.user.ID;

        const mysqlYsSorguC1 = `SELECT ID FROM TeknikTalepler WHERE ID = ${ysTeknikTalepID}`;
        const mysqlSonucC1 = await mysql.sor(mysqlYsSorguC1);
        if (mysqlSonucC1.length != 1) return res.status(426).send({ error: "teknik talep bulunamadı" });

        const mysqlYsSoorguC2 = `SELECT ID FROM TeknikTalepSonlandirmalar WHERE TeknikTalepID = ${ysTeknikTalepID}`;
        const mysqlSonucC2 = await mysql.sor(mysqlYsSoorguC2);
        console.log(mysqlSonucC2)
        if (mysqlSonucC2 && mysqlSonucC2.length > 0) return res.status(422).send({ error: "talep zaten sonlandırılmış" });

        const mysqlYsSorgu = `INSERT INTO TeknikTalepSonlandirmalar VALUES (DEFAULT, ${ysTeknikTalepID}, 
                                ${ysKullaniciID}, ${0}, ${0}, "${ysAciklama}", "${ysZaman}", ${ysMakineDurusSuresi}, "${ysDegisen}", "${ysOnarilan}")`;
        const mysqlSonuc = await mysql.sor(mysqlYsSorgu);

        if (!mysqlSonuc) return res.status(425).send({ error: "veritabanı işlem hatası" });

        res.send("kayıt başarılı");

    } catch (err) {
        return res.status(422).send({ error: err.message });
    }
});
router.get("/talep_sonlandirma_onay", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "birimsef"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        const talepSonlandirmaID = req.query.t;

        if (!talepSonlandirmaID) return res.status(422).send({ error: `talep sonlandirma no yok` });

        const mysqlCSorgu = `SELECT ID FROM TeknikTalepSonlandirmalar WHERE ID = ${talepSonlandirmaID}`;
        const mysqlCSor = await mysql.sor(mysqlCSorgu)
        if (!mysqlCSor || mysqlCSor.length != 1) return res.status(422).send({ error: `sonlandirma bulunamadi` });

        let mysqlSorguEk = "";
        if (userRole == "makenmudur" || userRole == "makensef") mysqlSorguEk = "TeknikOnay = "
        else mysqlSorguEk = "BirimOnay = "

        const mysqlSorgu = `UPDATE TeknikTalepSonlandirmalar SET ${mysqlSorguEk}1 WHERE ID = ${talepSonlandirmaID} AND ${mysqlSorguEk}0`;
        const mysqlSor = await mysql.sor(mysqlSorgu);
        if (!mysqlSor) return res.status(422).send({ error: `veritabanı işlem hatası` });

        res.send(mysqlSor.info);
        // Rows matched: 1 Changed: 1 Warnings: 0
    } catch (err) {
        return res.status(422).send({ error: err.message });
    }
});

router.get("/birimler", requireAuth, async (req, res) => {
    try {
        const mySorgu = "SELECT * FROM Birimler";
        const sorgu = await mysql.sor(mySorgu);

        if (!sorgu) return res.status(422).send({ error: `hiç birim yok` });

        res.send(sorgu);
    } catch (err) {
        return res.status(422).send({ error: err.message });
    }
});

router.get("/talepBildirim", requireAuth, async (req, res) => {

})

module.exports = router;