var express = require('express');
var router = express.Router();
const { Pool, Client } = require('pg');
const bcrypt = require('bcryptjs');
const {token} = require("morgan");
const fileUpload = require('express-fileupload');
const app = express();
const multer  = require('multer');
const uuid = require('uuid').v4;
app.use(express.static('public'));
var slika = 'putanja';
var jwt = require('jsonwebtoken');

const maxAge = 3 * 24 * 60 * 60;//3 dana u sekundama
const createToken = (id, korisnicko) => {
    return jwt.sign({id, korisnicko}, 'net ninja secret', {
        expiresIn: maxAge
    });
}

const storage = multer.diskStorage( {
    destination: (req, file, cb) => {
        cb(null, 'public/images/');
    },
    filename: (req, file, cb) => {
        console.log("uso");
        const { originalname} = file;
        slika = `${uuid()}-${originalname}`;
        cb(null, slika);
        console.log('slika: ' + slika);
    }

});
const upload = multer({ storage });
var niz_interesa = [];
var id_kupca = 1;
var ime = 'Ime';
var imme = 'smolooo';

const pool = new Pool({
  user: 'ugefbsot',
  host: 'tyke.db.elephantsql.com',
  database: 'ugefbsot',
  password: 'lTU90RX--HLL7zRxWjvtfkcjPQt8IMXY',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000,
});
var pomocne = {
    kriptujSifru: function (lozinka) {
        var ciphertext = bcrypt.hashSync(lozinka, 10);
        return ciphertext;
    }
}
var niz_proizvoda = [];
var broj_narudzbe = 0;
var niz_za_pocetnu = [];
var db = {
    ubaciSliku: async function (req, res, next) {
        try {
            upload.single('slika');
        } catch (e) {
            console.log(e);
        }
        next();
    },
    testUpita: function (req, res, next) {
        pool.query(`select * from test`,
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.info(result.rows[0]);
                //req.proba = result.rows;
                //console.info(result.rows);
                next();
            });
    },
    registrujTrgovca: function (req, res, next) {
        var trgovac = {
            username: req.body.username,
            naziv: req.body.nazivtrgovine,
            telefon: req.body.telefon,
            email: req.body.email,
            grad: req.body.grad,
            ulica: req.body.ulica,
            lozinka: pomocne.kriptujSifru(req.body.lozinka),
            slika: slika,
            kategorija: req.body.selekt
        }

        pool.query(`insert into trgovci(username, lozinka, naziv_trgovine, telefon, email, ulica, grad, slika, kategorija)
        values($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [trgovac.username, trgovac.lozinka, trgovac.naziv, trgovac.telefon,
                trgovac.email, trgovac.ulica, trgovac.grad, trgovac.slika, trgovac.kategorija],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.info(result);

                next();
            });
    },
    dajKategorije: function (req, res, next) {
        pool.query(`select * from test_kategorije`,
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                //console.info(result.rows[0]);
                req.kat = result.rows;
                //console.info(result.rows);
                next();
            });
    },//samo da se prikazu interesi koje ce izabrat na getruti
    registrujKupca: async function (req, res, next) {
        var kupac = {
            username: req.body.username,
            lozinka: pomocne.kriptujSifru(req.body.lozinka),
            ime: req.body.ime,
            prezime: req.body.prezime,
            email: req.body.email,
            telefon: req.body.telefon,
            slika: slika,
            interesi: 0
        }
        console.info(kupac);
        niz_interesa = req.body.dugme;
        ime = req.body.username;
        console.log('niz_interesa: ', niz_interesa);
        console.log('Imeee: ', ime);

        //sad for petljom interesi.length toliko upita da se doda u tabelu kupci_interesi kupac.id|dugme[i]
        //Nije dobra praksa zbog too many conections, treba samo napraviti na bazi proceduru koja ce proc n-puta i ubaciti interese
        await pool.query(`insert into kupci(username, lozinka, ime, prezime, email, telefon, slika)
        values($1, $2, $3, $4, $5, $6, $7)`,
            [kupac.username, kupac.lozinka, kupac.ime, kupac.prezime, kupac.email, kupac.telefon, kupac.slika],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                return next();
            });
        //return next();
    },
    dajId: async function (req, res, next) {
        console.log('ime sultan: ', ime);
        await pool.query(`select * from kupci` ,
             (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                req.imme = result.rows[result.rows.length-1].id;
                console.info('negdje: ', result.rows[result.rows.length-1].id);

                id_kupca = req.imme;
                 //console.log(result.rows);
                 return next();
            });
        //return next();
    },
    ubaciInterese: async function (req, res, next) {
        console.log('sultaaaaan: ', id_kupca);
        //treba samo napraviti na bazi proceduru koja ce proc n-puta i ubaciti interese
        for (let i = 0; i < niz_interesa.length; i++) {
            await pool.query(`insert into kupci_interesi(kupac_id, kategorija_id)
            values($1, $2)`, [id_kupca, niz_interesa[i]],
                (err, result) => {
                    if (err) {
                        console.info(err);
                        return next();
                    }
                     //next();
                });
        }
    next();
    },
    provjeraLogina: function (req, res, next) {
        var obj = {
            username: req.body.username,
            lozinka: pomocne.kriptujSifru(req.body.lozinka)
        }
        pool.query(`select * from trgovci where username = $1`,
            [obj.username],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.info(result);
                if(result.rows.length === 0) {
                    console.log('NEMA GAAAA U TRGOVCIMAAAAA');
                    //return res.render('login', { title: 'Login ovdje', poruka: 'Neispravna lozinka ili username!' });
                        console.log("usao u elseeee", obj.username)
                        pool.query(`select * from kupci where username = $1`,
                            [obj.username],
                            (err, result) => {
                                if (err) {
                                    console.info(err);
                                    return next();
                                }
                                console.info(result);
                                if(result.rows.length === 0) {
                                    res.render('login', { title: 'Login ovdje', poruka: 'Neispravna lozinka ili username!' });
                                }
                                else if(result.rows[0].username === obj.username) {
                                    console.info("Isti su username-ovi!!!");
                                    if(bcrypt.compareSync(req.body.lozinka, result.rows[0].lozinka)) {
                                        res.korisnik = {
                                            username: result.rows[0].username,
                                            ime: result.rows[0].ime,
                                            prezime: result.rows[0].prezime,
                                            id: result.rows[0].id
                                        }
                                        //const token = createToken(req.body.username);
                                        const token = createToken(res.korisnik.id, res.korisnik.username);
                                        console.log('haj tokene: ', token);
                                        res.cookie('jwt', token, {httpOnly: true, maxAge: maxAge * 1000});
                                        res.redirect('/pocetna');

                                    } else {
                                        return res.render('login', { title: 'Login ovdje', poruka: 'Neispravna lozinka ili username!' });
                                    }
                                }
                            });
                }
                else {
                    //sad ovdje provjerit sifre
                    if (bcrypt.compareSync(req.body.lozinka, result.rows[0].lozinka)) {
                        res.korisnik = {
                            username: result.rows[0].username,
                            id: result.rows[0].id
                        }
                        const token = createToken(res.korisnik.id, res.korisnik.username);
                        console.log('haj tokene: ', token);
                        res.cookie('jwt', token, {httpOnly: true, maxAge: maxAge * 1000});
                        res.redirect('/trgovac/korpa');
                    }
                    else {
                        return res.render('login', { title: 'Login ovdje', poruka: 'Neispravna lozinka ili username!' });
                    }
                }
            });
    },
    zaTrgovca: function (req, res, next) {
        pool.query(`select * from korisnici where id = $1`
            [req.params.id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.info(result.rows[0]);
                //req.proba = result.rows;
                //console.info(result.rows);
                req.obj = {
                    username: result.rows[0].username,
                    ime: result.rows[0].ime,
                    prezime: result.rows[0].prezime
                }
                next();
            });
    },
    dajSveTrgovine: function (req, res, next) {
        pool.query(`select * from trgovci`,
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                req.obj = result.rows;
                console.log('evo rezultat: ', result.rows);
                next();
            });
    },
    dajSveArtikleIzTrgovine: function (req, res, next) {
        pool.query(`select a.id, a.naziv, a.cijena, a.opis, a.kolicina, a.slika, a.ocjena, t.naziv_trgovine from artikli a
        inner join trgovci t on a.trgovina_id = t.id
        where t.id = $1`, [req.params.id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                req.obj = result.rows;
                console.log('evo svih artikala iz trgovine: ', result.rows);
                next();
            });
    },
    dajArtikal: function (req, res, next) {
        pool.query(`select a.id, a.naziv, a.cijena, a.opis, a.kolicina, a.slika, a.ocjena, a.trgovina_id, t.naziv_trgovine from artikli a
        inner join trgovci t on a.trgovina_id = t.id
        where a.id = $1`, [req.params.id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                req.obj = result.rows;
                console.log('evo artikla sa tim id-em: ', result.rows[0]);
                next();
            });
    },
    dajKomentareArtikla: function (req, res, next) {
        pool.query(`select k2.ime, k2.prezime, k2.slika, k.tekst, k.datum from komentari k
        inner join kupci k2 on k.kupac_id = k2.id
        where k.artikal_id = $1`, [req.params.id],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                req.obj2 = result.rows;
                console.log("samo proba duzina komentara: ", req.obj2.length);
                console.log('komentari za taj artikal evo ih: ', result.rows[0]);
                next();
            });
    },
    ubaciKomentar: function (req, res, next) {
        pool.query(`insert into komentari(kupac_id, artikal_id, tekst)
        values($1, $2, $3)`,[res.locals.idkorisnika, req.params.id, req.body.msg],
            (err, result) => {
                if (err) {
                    return next();
                }
                console.log('Hajde daj mi id kupca: ', res.locals.idkorisnika);
                next();
            });
    },
    dajIntereseZaPocetnu: async function (req, res, next) {
        await pool.query(`select * from kupci_interesi where kupac_id = $1`,[res.locals.idkorisnika],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log('Eh evo ovdje da vidimo interese od kupca ', result.rows);
                //req.interesikupca = result.rows;
                for(let i=0; i<result.rows.length; i++) {
                    niz_za_pocetnu.push(result.rows[i].kategorija_id);
                }
                next();
            });
    },
    dajArtikleZaPocetnu: async function (req, res, next) {
        await pool.query(`select * from artikli where kategorija = ANY ($1)`,[niz_za_pocetnu],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("EVO IH ZA POCETNE ARTIKLI: ");
                console.log(niz_za_pocetnu[0]);
                console.log(niz_za_pocetnu[1]);
                console.log(result.rows);
                req.obj = result.rows;
                next();
            });
    },
    dajNajprodavanijeZaPocetnu: async function (req, res, next) {
        await pool.query(`select * from artikli order by broj_prodatih desc limit 4`,
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("EVO NAJPRODAVANIJI: ");
                console.log(result.rows);
                req.obj2 = result.rows;
                next();
            });
    },
    dodajUKorpu: function (req, res, next) {
        pool.query(`insert into korpa(artikal_id, trgovina_id, status, kupac_id)
        VALUES($1, $2, $3, $4)`, [req.params.id, req.params.t_id, 0, res.locals.idkorisnika],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("Drugi upit korpa");
                next();
            });

    },
    dajKorpu: function (req, res, next) {
        req.ukupan_iznos = 0;
        pool.query(`select a.naziv, a.id, a.cijena, a.trgovina_id, t.naziv_trgovine from korpa k
        inner join artikli a on k.artikal_id = a.id
        inner join trgovci t on a.trgovina_id = t.id
        where k.kupac_id = $1 and k.status = $2`,
            [res.locals.idkorisnika, 0],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("EVO ARTIKLI iz korpe: ");
                req.obj = result.rows;
                console.log(result.rows);
                for(let i=0; i<result.rows.length; i++) {
                    req.ukupan_iznos += result.rows[i].cijena;
                }
                console.log(req.ukupan_iznos);
                next();
            });
    },
    potvrdiNarudzbu: async function (req, res, next) {
        await pool.query(`insert into narudzbe(trgovac_id, kupac_id, status) values($1, $2, $3) returning id`,
            [req.params.trgovina, res.locals.idkorisnika, 0],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("Narudzba poslanaaaa, evo id narudzbeee:");
                console.log(result.rows[0]);
                broj_narudzbe = result.rows[0].id;
                next();
            });
        //------------------------------------------------------------------------------------------
    },
    potvrdidrugiodio: async function (req, res, next) {
        await pool.query(`select *  from korpa where kupac_id = $1 and status = $2`,
            [res.locals.idkorisnika, 0],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("Treci upit: ", result.rows);
                niz_proizvoda = [];
                for(let i=0; i<result.rows.length; i++) {
                    niz_proizvoda.push(result.rows[i].artikal_id);
                }
                next();
            });
    },
    treci: async function (req, res, next) {
        pool.query(`call ubaci_narudzbe($1, $2, $3, $4, $5)`,
            [niz_proizvoda, niz_proizvoda.length, res.locals.idkorisnika, req.params.trgovina, broj_narudzbe],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("EVO procedure da vidimo radi li");
                next();
            });
    },
    cetvrti: async function (req, res, next) {
        await pool.query(`update korpa set status = $1 where kupac_id = $2 and trgovina_id = $3`,
            [1, res.locals.idkorisnika, req.params.trgovina],
            (err, result) => {
                if (err) {
                    console.info(err);
                    return next();
                }
                console.log("Promjena statusa artikalaaaa");
                next();
            });
    }

}
/* GET home page. */
router.get('/trgovina',
    function(req, res, next) {
  res.render('trgovina', { title: 'Trgovina' });
});

router.get('/registracijaTrgovca',
    db.dajKategorije,
    function(req, res, next) {
        res.render('registracijaTrgovca', { title: 'Registracija Trgovca', obj: req.kat });
});
router.post('/registracijaTrgovca',
    upload.single('slikaTrgovine'),
    db.registrujTrgovca,
    function(req, res, next) {
        console.log(req.file);
        res.sendStatus(200);
});
router.get('/registracijaKupca',
    db.dajKategorije,
    function(req, res, next) {
        console.log('malo proba: ', req.kat);
        res.render('registracijaKupca', { title: 'Registracija Kupca', obj: req.kat });
});
router.post('/registracijaKupca',
    upload.single('slika'),
    db.registrujKupca, db.dajId, db.ubaciInterese,
    function(req, res, next) {
        return res.sendStatus(200);
});
router.get('/login',
    function(req, res, next) {
    res.render('login', { title: 'Login ovdje', poruka: '' });
});

router.post('/login',
    db.provjeraLogina,
    function(req, res, next) {
        //res.render('pocetna');
        res.sendStatus(200);
});

router.get('/pocetna',
    db.dajIntereseZaPocetnu, db.dajArtikleZaPocetnu, db.dajNajprodavanijeZaPocetnu,
    function(req, res, next) {
        res.render('pocetna', { title: 'Pocetna', obj: req.obj, obj2: req.obj2 });
});
router.get('/trgovine',
    db.dajSveTrgovine,
    function(req, res, next) {
        console.log('ahj ovdje nesto');
        res.render('trgovine2', { title: 'Trgovine', obj: req.obj });
});
router.get('/trgovine/:id',
    db.dajSveArtikleIzTrgovine,
    function(req, res, next) {
        res.render('artikli', { title: 'Artikli', obj: req.obj });
});


//LOGOUT - cookie ne mozemo izbrisati nego ga mijenjamo za blank cookie i expire stavimo 1 milisekund
router.get('/logout', function (req, res, next) {
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/login');
});
router.get('/artikal/:id',
    db.dajArtikal, db.dajKomentareArtikla,
    function (req, res, next) {
    res.render('artikal', { obj: req.obj, obj2: req.obj2 });
});
router.post('/artikal/:id/objaviKomentar',
    db.ubaciKomentar,
    function (req, res, next) {
        res.sendStatus(200);
});
router.post('/artikal/:id/:t_id/dodajUKorpu',
    db.dodajUKorpu,
    function (req, res, next) {
        res.sendStatus(200);
});
router.get('/korpa',
    db.dajKorpu,
    function (req, res, next) {
        res.render('korpa', { title: 'Korpa', obj: req.obj, ukupno: req.ukupan_iznos });
});
router.post('/potvrdanarudzbe/:trgovina',
    db.potvrdiNarudzbu, db.potvrdidrugiodio,db.treci, db.cetvrti,
    function(req, res, next) {
        res.render('pocetna');
});










module.exports = router;
