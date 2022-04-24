var express = require('express');
var router = express.Router();
const { Pool, Client } = require('pg');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const {token} = require("morgan");
const fileUpload = require('express-fileupload');
const multer  = require('multer');
const nodemailer = require("nodemailer");
const uuid = require('uuid').v4;
const app = express();
app.use(express.static('public'));
var slika = 'putanja';
const storage = multer.diskStorage( {
    destination: (req, file, cb) => {
        cb(null, 'public/images/');
    },
    filename: (req, file, cb) => {
        console.log("uso");
        const { originalname} = file;
        //cb(null, `${uuid()}-${originalname}`);
        //const novo_ime = `${uuid()}-${originalname}`;
        //console.log('Novo ime: ' + novo_ime);
        //req.slika = novo_ime;
        //console.log(req.slika);
        slika = `${uuid()}-${originalname}`;
        cb(null, slika);
        //novo_ime;
        console.log('trgovac slika: ' + slika);
    }

});
const upload = multer({ storage });
const pool = new Pool({
    user: 'ugefbsot',
    host: 'tyke.db.elephantsql.com',
    database: 'ugefbsot',
    password: 'lTU90RX--HLL7zRxWjvtfkcjPQt8IMXY',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
});

var db2 = {
    dajKategorije: function (req, res, next) {
        /*var artikal = {
            naziv: req.body.naziv,
            cijena: req.body.cijena,
            opis: req.body.cijena,
            kategorija: req.body.kategorija
        }*/
        pool.query(`select * from test_kategorije`,
            (err, result) => {
                req.novi = result.rows;
                next();
        });
    },
    objavaArtikla: function (req, res, next) {
        var artikal = {
            naziv: req.body.naziv,
            cijena: req.body.cijena,
            opis: req.body.cijena,
            kategorija: req.body.selekt,
            trgovina: 2
        };
        pool.query(`select * from test_kategorije`,
            (err, result) => {
                req.novi = result.rows;
                next();
            });
    },
    ubaciArtikal: function (req, res, next) {
        var artikal = {
            naziv: req.body.naziv,
            cijena: req.body.cijena,
            opis: req.body.opis,
            kolicina: req.body.kolicina,
            slika: slika,
            trgovina: res.locals.idkorisnika,
            kategorija: req.body.selekt
        }

        pool.query(`insert into artikli(naziv, cijena, opis, trgovina_id, kolicina, slika, kategorija)
        values($1, $2, $3, $4, $5, $6, $7)`,
            [artikal.naziv, artikal.cijena, artikal.opis, artikal.trgovina,artikal.kolicina, artikal.slika, artikal.kategorija],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.info(result);

                next();
            });
    },
    dajKorpu: function (req, res, next) {
        pool.query(`select n.id, n.kupac_id, k.username, n.status from narudzbe n inner join kupci k on n.kupac_id = k.id
            where trgovac_id = $1 and status = $2`,
            [res.locals.idkorisnika, 0],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log('E da vidimo koje narudzbe ja imam kao trgovac:');
                console.log(result.rows);
                req.obj = result.rows;

                next();
            });
    },
    prihvatiNarudzbu: async function (req, res, next) {
        //prvo update "narudzbe" staviti status da je 1, onda update narudzbe_artikli_kupci staviti status 1
        await pool.query(`update narudzbe set status = $1 where id = $2`,
            [1, req.params.nar_id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log('Update prvo narudzbe set status = 1:');
                next();
            });
    },
    updateNarudzbu: async function (req, res, next) {
        //prvo update "narudzbe" staviti status da je 1, onda update narudzbe_artikli_kupci staviti status 1
        await pool.query(`update narudzbe_artikli_kupci set status = $1 where narudzba_id = $2`,
            [1, req.params.nar_id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log('kraj narudzbe');
                next();
            });
    },
    saljiMail: async function (req, res, next) {
        var mejl = "";
        await pool.query(`select k.email from narudzbe_artikli_kupci nak
        inner join kupci k on k.id = nak.kupac_id
        where nak.narudzba_id = $1`,
            [req.params.nar_id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log('Evo email kupca: ');
                console.log(result.rows);
                mejl = result.rows[0].email;
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    service: "hotmail",
                    auth: {
                        user: "hadrashop@hotmail.com",
                        pass: "shop12345"
                    }
                });
                const options = {
                    from: "hadrashop@hotmail.com",
                    to: result.rows[0].email,
                    subject: "Potvrda narudzbe",
                    text: "Vasa narudzba je potvrđena!"
                };
                transporter.sendMail(options, function(err, info) {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    console.log("mail poslan" + info.response);
                });
                next();
            });
    },
    dajDetaljeNarudzbe: function (req, res, next) {
         pool.query(`select a.naziv, a.cijena from narudzbe_artikli_kupci nak
            inner join artikli a on nak.artikal_id = a.id
            where nak.narudzba_id = $1`,
            [req.params.nar_id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log('Evo detalja narudzbe: ');
                console.log(result.rows);
                req.obj = result.rows;
                next();
            });
    },
    odbijNarudzbu: async function (req, res, next) {
        //prvo update "narudzbe" staviti status da je 1, onda update narudzbe_artikli_kupci staviti status 1
        await pool.query(`update narudzbe set status = $1 where id = $2`,
            [2, req.params.nar_id],//za odbijenu status nek bude 2
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                next();
            });
    },
    updateOdbijenu: async function (req, res, next) {
        //prvo update "narudzbe" staviti status da je 1, onda update narudzbe_artikli_kupci staviti status 1
        await pool.query(`update narudzbe_artikli_kupci set status = $1 where narudzba_id = $2`,
            [2, req.params.nar_id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                next();
            });
    },

}
router.get('/objaviArtikal',
    db2.dajKategorije,
    function (req, res, next) {
   res.render('objaviArtikal', { objekat: req.novi });
});
router.post('/objaviArtikal',
    upload.single('slika'),
    db2.ubaciArtikal,
    function (req, res, next) {
        res.sendStatus(200);
});
router.get('/korpa',
    db2.dajKorpu,
    function (req, res, next) {
        res.render('trgovacKorpa', { title: 'Narudžbe', obj: req.obj });
        //res.sendStatus(200);
});
router.post('/prihvatinarudzbu/:nar_id',
    db2.prihvatiNarudzbu, db2.updateNarudzbu,
    function (req, res, next) {
        res.sendStatus(200);
});
router.post('/odbij_narudzbu/:nar_id',
    db2.odbijNarudzbu, db2.updateOdbijenu,
    function (req, res, next) {
        res.sendStatus(200);
    });
router.get('/detalji/:nar_id',
    db2.dajDetaljeNarudzbe,
    function (req, res, next) {
        //res.sendStatus(200);
        res.render('trgovacdetaljinarudzbe', { obj: req.obj });
});


module.exports = router;
