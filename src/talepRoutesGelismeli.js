const express = require("express");
const mysql = require("./mysqlCon");
const requireAuth = require("./requireAuth");

const router = express.Router();

router.post("/yeni_talep_g", requireAuth, async (req, res) => {
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

        // tüm kullanıcılar (alttaki formatta)
        /*
        SELECT k.ID, k.KullaniciAdi, g.BirimID, b.BirimAdi, rk.KullaniciRoleID AS RolID, kr.RolAdi FROM Kullanicilar k
            LEFT JOIN (SELECT KullaniciID, BirimID FROM KullaniciBirimGorevleri WHERE KullaniciBirimGorevleri.Bitis IS NULL) g ON g.KullaniciID = k.ID
            LEFT JOIN (SELECT ID, BirimAdi FROM Birimler) b ON g.BirimID = b.ID
            LEFT JOIN (SELECT KullaniciID, KullaniciRoleID FROM KullaniciRolKayitlari WHERE KullaniciRolKayitlari.Bitis IS NULL) rk ON rk.KullaniciID = k.ID
            LEFT JOIN (SELECT ID, RolAdi FROM KullaniciRolleri) kr ON rk.KullaniciRoleID = kr.ID

            ->
            ID KullaniciAdi BirimID BirimAdi        RolID RolAdi
            1  fatih        2       Makine Enerji   2       makenmudur
        */
        const sorgu2 = `SELECT k.ID, k.KullaniciAdi, g.BirimID, b.BirimAdi, rk.KullaniciRoleID AS RolID, kr.RolAdi FROM Kullanicilar k
        LEFT JOIN (SELECT KullaniciID, BirimID FROM KullaniciBirimGorevleri WHERE KullaniciBirimGorevleri.Bitis IS NULL) g ON g.KullaniciID = k.ID
        LEFT JOIN (SELECT ID, BirimAdi FROM Birimler) b ON g.BirimID = b.ID
        LEFT JOIN (SELECT KullaniciID, KullaniciRoleID FROM KullaniciRolKayitlari WHERE KullaniciRolKayitlari.Bitis IS NULL) rk ON rk.KullaniciID = k.ID
        LEFT JOIN (SELECT ID, RolAdi FROM KullaniciRolleri) kr ON rk.KullaniciRoleID = kr.ID`;
        let sonuc2 = await mysql.sor(sorgu2);

        let ilgililer = [];
        let gonderenKullaniciAdi = req.user.KullaniciAdi;
        for (let i = 0; i < sonuc2.length; i++) {
            const kullanici = sonuc2[i];
            let bildirimeEklenecek = false;
            const talepDirektYetkililer = ["makenmudur", "makensef", "makenusta"];

            if (talepDirektYetkililer.includes(kullanici.RolAdi)) bildirimeEklenecek = true;
            if (kullanici.RolAdi === "birimsef" && kullanici.BirimID === ytBirimID) bildirimeEklenecek = true;
            if (kullanici.ID === yt_kaydedenID) { bildirimeEklenecek = false; };

            if (bildirimeEklenecek) {
                ilgililer.push(kullanici.ID);
            }
        }
        const text = `${gonderenKullaniciAdi} yeni bir talep ekledi. (${yt_talep})`;
        // ID	Text	Ilgililer	BirimID 	Zaman	Gorenler    TalepID    GelismeID
        const sorgu3 = `INSERT INTO Bildirimler VALUES (DEFAULT, '${text}', '[${ilgililer}]', ${yt_birimID}, '${yt_zaman}', NULL , ${sonuc.insertId}, NULL)`;

        const sonuc3 = await mysql.sor(sorgu3);

        console.log("sonuc3", sonuc3);
        res.send(sonuc);
    } catch (err) {
        return res.status(422).send({ error: "yetkisiz işlem" });
    }
});

router.post("/yeni_talep_gelisme_g", requireAuth, async (req, res) => {
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

        const mySorguAfterAdd = `SELECT TalepGelisme.ID, TalepID, TalepGelisme.Zaman, KullaniciID AS GonderenID, TalepGelisme.Aciklama, Kullanicilar.KullaniciAdi AS Gonderen, TeknikTalepler.BirimID AS BirimID, TeknikTalepler.Talep AS Talep FROM TalepGelisme INNER JOIN Kullanicilar ON Kullanicilar.ID = TalepGelisme.KullaniciID INNER JOIN TeknikTalepler ON TalepGelisme.TalepID = TeknikTalepler.ID WHERE TalepID = ${ygTalepID}`;
        let sonucAfterAdd = await mysql.sor(mySorguAfterAdd);

        if (!sonucAfterAdd) res.status(425).send({ error: "listeleme sırasında hata oluştu" });

        const sorgu2 = `SELECT k.ID, k.KullaniciAdi, g.BirimID, b.BirimAdi, rk.KullaniciRoleID AS RolID, kr.RolAdi FROM Kullanicilar k
        LEFT JOIN (SELECT KullaniciID, BirimID FROM KullaniciBirimGorevleri WHERE KullaniciBirimGorevleri.Bitis IS NULL) g ON g.KullaniciID = k.ID
        LEFT JOIN (SELECT ID, BirimAdi FROM Birimler) b ON g.BirimID = b.ID
        LEFT JOIN (SELECT KullaniciID, KullaniciRoleID FROM KullaniciRolKayitlari WHERE KullaniciRolKayitlari.Bitis IS NULL) rk ON rk.KullaniciID = k.ID
        LEFT JOIN (SELECT ID, RolAdi FROM KullaniciRolleri) kr ON rk.KullaniciRoleID = kr.ID`;
        let sonuc2 = await mysql.sor(sorgu2);

        let ilgililer = [];
        let gonderenKullaniciAdi = req.user.KullaniciAdi;
        for (let i = 0; i < sonuc2.length; i++) {
            const kullanici = sonuc2[i];
            let bildirimeEklenecek = false;
            const talepDirektYetkililer = ["makenmudur", "makensef"];


            if (talepDirektYetkililer.includes(kullanici.RolAdi)) bildirimeEklenecek = true;
            if (kullanici.RolAdi === "birimsef" && kullanici.BirimID === sonucAfterAdd[0].BirimID) bildirimeEklenecek = true;
            if (kullanici.ID === ygKaydedenID) { bildirimeEklenecek = false; };

            if (bildirimeEklenecek) {
                ilgililer.push(kullanici.ID);
            }
        }
        console.log("sonucAfterAdd", sonucAfterAdd[0]);
        const text = `${gonderenKullaniciAdi} yeni bir gelişme ekledi. ${sonucAfterAdd[0].Talep} => (${ygGelismeAciklama})`;
        // ID	Text	Ilgililer	BirimID 	Zaman	Gorenler    TalepID    GelismeID
        // !!!! sonuc u test et, büyük ihtimalle tüm yeni talebi gönderiyor!!!!
        const sorgu3 = `INSERT INTO Bildirimler VALUES (DEFAULT, '${text}', '[${ilgililer}]', ${sonucAfterAdd[0].BirimID}, '${ygZaman}', NULL , ${ygTalepID}, ${sonuc.insertId})`;

        const sonuc3 = await mysql.sor(sorgu3);

        // !!! burda sonuç kullanılıyor, yeni sonucu da
        //bildirim için göndermek gerekebilir????
        res.send(sonucAfterAdd);
        //res.send(sonuc);

    } catch (err) {
        return res.status(423).send({ error: err.message });
    }
});

router.post("/yeni_talep_sonlandirma_g", requireAuth, async (req, res) => {
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

        const mysqlYsSorguC1 = `SELECT ID, BirimID, Talep, Aciklama FROM TeknikTalepler WHERE ID = ${ysTeknikTalepID}`;
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


        //bildirim kısmı

        const sorgu2 = `SELECT k.ID, k.KullaniciAdi, g.BirimID, b.BirimAdi, rk.KullaniciRoleID AS RolID, kr.RolAdi FROM Kullanicilar k
        LEFT JOIN (SELECT KullaniciID, BirimID FROM KullaniciBirimGorevleri WHERE KullaniciBirimGorevleri.Bitis IS NULL) g ON g.KullaniciID = k.ID
        LEFT JOIN (SELECT ID, BirimAdi FROM Birimler) b ON g.BirimID = b.ID
        LEFT JOIN (SELECT KullaniciID, KullaniciRoleID FROM KullaniciRolKayitlari WHERE KullaniciRolKayitlari.Bitis IS NULL) rk ON rk.KullaniciID = k.ID
        LEFT JOIN (SELECT ID, RolAdi FROM KullaniciRolleri) kr ON rk.KullaniciRoleID = kr.ID`;
        let sonuc2 = await mysql.sor(sorgu2);

        console.log("sonuc 2", sonuc2);
        let ilgililer = [];
        let gonderenKullaniciAdi = req.user.KullaniciAdi;
        for (let i = 0; i < sonuc2.length; i++) {
            const kullanici = sonuc2[i];
            let bildirimeEklenecek = false;
            const talepDirektYetkililer = ["makenmudur", "makensef"];


            if (talepDirektYetkililer.includes(kullanici.RolAdi)) bildirimeEklenecek = true;
            if (kullanici.RolAdi === "birimsef" && kullanici.BirimID === mysqlSonucC1[0].BirimID) bildirimeEklenecek = true;
            if (kullanici.ID === ysKullaniciID) { bildirimeEklenecek = false; };

            if (bildirimeEklenecek) {
                ilgililer.push(kullanici.ID);
            }
        }

        const text = `${gonderenKullaniciAdi} talebi kapattı. (${mysqlSonucC1[0].Talep} => ${mysqlSonucC1[0].Aciklama})`;
        // ID	Text	Ilgililer	BirimID 	Zaman	Gorenler    TalepID    GelismeID
        // !!!! sonuc u test et, büyük ihtimalle tüm yeni talebi gönderiyor!!!!
        const sorgu3 = `INSERT INTO Bildirimler VALUES (DEFAULT, '${text}', '[${ilgililer}]', ${mysqlSonucC1[0].BirimID}, '${ysZaman}', NULL , ${ysTeknikTalepID}, NULL)`;

        const sonuc3 = await mysql.sor(sorgu3);

        res.send("kayıt başarılı");

    } catch (err) {
        return res.status(422).send({ error: err.message });
    }
});

router.get("/bildirimleri_al", requireAuth, async (req, res) => {
    try {
        //const gelen = req.body;
        //const { kullaniciID, ygGelismeAciklama } = gelen;

        const userID = req.user.ID;
        // worked query: SELECT * FROM Bildirimler WHERE JSON_CONTAINS(Bildirimler.Ilgililer, '3' , '$')
        // also worked: (with a column as Goruldu returns 1 or null)
        /*
        SELECT Bildirimler.*, asd.Goruldu FROM Bildirimler 
        LEFT JOIN ( SELECT ID, JSON_CONTAINS(Bildirimler.Gorenler, '2' , '$') AS Goruldu FROM Bildirimler ) asd ON asd.ID = Bildirimler.ID
        WHERE JSON_CONTAINS(Bildirimler.Ilgililer, '2' , '$')
        */
        // ID	Text	Ilgililer	BirimID	Zaman	Gorenler	TalepID	GelismeID Goruldu (0 or 1)
        const sorgu = `SELECT Bildirimler.*, asd.Goruldu FROM Bildirimler 
                        LEFT JOIN ( SELECT ID, JSON_CONTAINS(Bildirimler.Gorenler, '${userID}' , '$') AS Goruldu FROM Bildirimler ) asd ON asd.ID = Bildirimler.ID
                        WHERE JSON_CONTAINS(Bildirimler.Ilgililer, '${userID}' , '$')`;
        const sonuc = await mysql.sor(sorgu);

        res.send(sonuc);
    } catch (err) {
        return res.status(422).send({ error: "program hatasi" });
    }
});

router.post('/bildirim_goruldu_ekle', requireAuth, async (req, res) => {
    try {
        const userID = req.user.ID;

        const gelen = req.body;
        const { bildirimID } = gelen;

        if (!bildirimID) throw "Bildirim bulunamadi";

        const sorgu = `SELECT Gorenler FROM Bildirimler WHERE Bildirimler.ID = ${bildirimID}`;
        const gorenler = await mysql.sor(sorgu);

        console.log(gorenler[0]);
        let ygorenler = gorenler[0].Gorenler;

        if (!ygorenler || ygorenler === null) ygorenler = [];
        if (!ygorenler.includes(userID)) ygorenler.push(userID);

        console.log(JSON.stringify(ygorenler));
        const sorgu2 = `UPDATE Bildirimler SET Gorenler = '${JSON.stringify(ygorenler)}' WHERE Bildirimler.ID = ${bildirimID}`;
        const sonuc2 = await mysql.sor(sorgu2);

        res.send(sonuc2);
        /* sonuc2:
        {
            "fieldCount": 0,
            "affectedRows": 1,
            "insertId": 0,
            "info": "Rows matched: 1  Changed: 1  Warnings: 0",
            "serverStatus": 2,
            "warningStatus": 0,
            "changedRows": 1
        }
         */

    } catch (err) {
        return res.status(422).send({ error: `Program hatası. ${err}` });
    }
});

module.exports = router;