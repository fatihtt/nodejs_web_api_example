"use strict";

const express = require("express");
const mysql = require("./mysqlCon");
const requireAuth = require("./requireAuth");

const router = express.Router();

router.get("/sayac_listesi", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta", "deposatinalma"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        const sqlSorgu = `SELECT Sayaclar.ID AS ID, Sayaclar.SayacIsmi, SayacTurleri.Tur AS SayacTuru, SayacTurleri.TurMiktarBirimi FROM Sayaclar
        INNER JOIN SayacTurleri ON SayacTurleri.ID = Sayaclar.SayacTurID`;
        const sonuc = await mysql.sor(sqlSorgu);

        if (!sonuc) return res.status(422).send({ error: `veritabanı hatası` });

        res.send(sonuc);
    } catch (err) {
        return res.status(422).send({ error: "yetkisiz işlem" });
    }
});

router.post("/yeni_sayac_okuma", requireAuth, async (req, res) => {
    try {
        const yetkililer = ["makenmudur", "makensef", "makenusta", "deposatinalma"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });
        
        // #ID	#KaydedenKullaniciID	SayacID	    #KayitZamani	OkumaZamani	DegerINTEGER	DegerDECIMAL	Aciklama	

        const gelen = req.body;
        const { sayacID, okumaZamani, degerInt, degerDec, aciklama } = gelen;

        const yso_kayitZamani = new Date().toJSON();
        const yso_kullaniciID = req.user.ID;
        const yso_sayacID = sayacID;
        let yso_okumaZamani = okumaZamani;
        const yso_degerInt = degerInt;
        const yso_degerDec = degerDec;
        const yso_aciklama = aciklama;

        if (!yso_okumaZamani) yso_okumaZamani = new Date().toJSON();

        if (!yso_sayacID || !yso_degerInt) return res.status(422).send({error: "eksik bilgi"});

        const yso_sorgu = `INSERT INTO SayacOkumalar
                           VALUES (DEFAULT, "${yso_kullaniciID}", "${yso_sayacID}", "${yso_kayitZamani}", "${yso_okumaZamani}",
                           "${yso_degerInt}", "${yso_degerDec}", "${yso_aciklama}")`;
        const sql_sonuc = await mysql.sor(yso_sorgu);

        if(!sql_sonuc) return res.status(422).send({error: "veri tabanı işlem hatası"});

        res.send(sql_sonuc);


    } catch (err) {
        return res.status(422).send({error: err.toString()});
    }
});

router.get("/son_deger", requireAuth, async (req, res)=>{

    try {
        const yetkililer = ["makenmudur", "makensef", "deposatinalma"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        const sayacID = req.query.s;
        if(!sayacID) return res.status(422).send({ error: `sayac no yok` });

        const mysqlCSorgu = `SELECT ID FROM Sayaclar WHERE ID = ${sayacID}`;
        const mysqlCSor = await mysql.sor(mysqlCSorgu);
        if(!mysqlCSor || mysqlCSor.length != 1) return res.status(422).send({ error: `sayac bulunamadi` });

        const mysqlSorgu = `SELECT * FROM SayacOkumalar WHERE SayacID = ${sayacID} ORDER BY ID DESC LIMIT 1`;
        const mysqlSor = await mysql.sor(mysqlSorgu);
        
        if(!mysqlSor) return res.status(422).send({ error: `veritabanı işlem hatası` });

        /*
        {
            "ID": 5,
            "KaydedenKullaniciID": 1,
            "SayacID": 2,
            "KayitZamani": "2022-07-28T11:06:21.000Z",
            "OkumaZamani": "2022-07-28T11:06:21.000Z",
            "DegerINTEGER": 34321400,
            "DegerDECIMAL": 34,
            "Aciklama": "aldım verdim"
        }
        */
        res.send(mysqlSor);

    } catch (err) {
        return res.status(422).send({ error: err.message });
    }

});

const sayacAl = async function (sayacID) {
    try {
        const mysqlTukSorgu = `SELECT 
                                    al.ID AS OkumaID,
                                    al.SayacID AS SayacID,
                                    al.KayitZamani AS OkumaKayitZamani,
                                    al.OkumaZamani AS OkumaOkumaZamani,
                                    al.DegerINTEGER,
                                    al.DegerDECIMAL,
                                    al.Aciklama AS OkumaAciklama,
                                    Sayaclar.SayacIsmi AS SayacIsmi,
                                    Sayaclar.Artimli AS ArtimliMi,
                                    SayacTurleri.Tur AS SayacTuru,
                                    SayacTurleri.TurMiktarBirimi AS SayacBirimi
                                FROM ((SELECT * FROM SayacOkumalar WHERE SayacOkumalar.SayacID = ${sayacID} ORDER BY ID DESC LIMIT 2) al)
                                INNER JOIN Sayaclar ON Sayaclar.ID = al.SayacID
                                INNER JOIN SayacTurleri ON SayacTurleri.ID = Sayaclar.SayacTurID
                                `;
                const mysqlTukSor = await mysql.sor(mysqlTukSorgu);

                if(!mysqlTukSor || mysqlTukSor.length < 1 || (mysqlTukSor[0].ArtimliMi && mysqlTukSor.length < 2)) return -1;
                else {
                    console.log(mysqlTukSor[0].ArtimliMi);
                    if(mysqlTukSor[0].ArtimliMi) return mysqlTukSor[0].DegerINTEGER - mysqlTukSor[1].DegerINTEGER;
                    else return mysqlTukSor[0].DegerINTEGER;
                }
    } catch (err) {
        return -1;
    }
}

router.get("/gunluk_tuketimler", requireAuth, async (req, res)=>{
    try {
        const yetkililer = ["makenmudur", "makensef", "yonetim"];
        const userRole = req.user.RolAdi;

        if (!yetkililer.includes(userRole)) return res.status(422).send({ error: `yetkisiz işlem` });

        // veritabanından alınacak sayaçlar:
        // Toplam elektrik              ID=1
        // Atıksu Arıtma elektrik       ID=2
        // doğalgaz toplam              ID=7 + ID=8
        // doğalgaz brox                ID=20
        // buhar brox                   ID=4
        // buhar yıldız                 ID=3
        // kömür                        ID=21
        // toplam su                    ID=5
        // sıcak su                     ID=6
        // sıvı tuz                     ID=22
        // toplam üretim                ID=23 + ID=24 + ID=25

        let sayacIDler = [ 1, 2, [ 7,8 ], 20, 4, 3, 21, 5, 6, 22, [ 23,24,25 ] ];
        let tuketimler = [];

        for(let i = 0; i < sayacIDler.length; i++) {
            console.log(`i = ${i}`);
            if(!Array.isArray(sayacIDler[i])) {
                
                let sayacDeger = await sayacAl(sayacIDler[i]);
                tuketimler[i] = sayacDeger;

                console.log(`tuketimler: ${tuketimler}`);

                await new Promise(r => setTimeout(r, 50));
            }
            else {
                console.log("array");
                let arraySayacToplam = 0;
                for(let k = 0; k < sayacIDler[i].length; k++) {
                    let sayac = await sayacAl((sayacIDler[i])[k]);
                    arraySayacToplam += sayac;
                }
                tuketimler[i] = arraySayacToplam;
            }
        };

        res.send(tuketimler);
    } catch (err) {
        
    }
});

module.exports = router;