const spicedPg  = require('spiced-pg'),
    express     = require('express'),
    app         = express(),
    hb          = require('express-handlebars'),
    db          = require('./db'),
    cookieSession = require('cookie-session'),
    csurf       = require('csurf');
    

app.engine('handlebars', hb());
app.set('view engine', 'handlebars');
app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);
app.use(express.static('public'));

app.use(cookieSession({
    secret: `I'm always handsome.`,
    maxAge: 1000 * 60 * 60 * 24 * 14
}));

app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    res.setHeader('X-Frame', 'DENY');
    next();
});

app.get("/", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/thanks");
    }
    if (!req.session.userId) {
        res.redirect("/petition");
    } else {
        res.redirect("/register");
    }
});

//==========================================================

app.get('/register', requireLoggedOut, (req, res) => {
    res.render('register', {
        layout: 'main'
    });
});

app.post('/register', (req, res) => {
    db.hashPassword(req.body.password)
        .then(function(hashedPassword) {
            return db.toRegister(req.body.first, req.body.last, req.body.email, hashedPassword);
        })
        .then(function(result) {
            req.session.first = result.rows[0].first;
            req.session.last = result.rows[0].last;
            req.session.userId = result.rows[0].id;
        })
        .then(function() {
            return res.redirect('/profile');
        }).catch(function(err) {
            res.render('register', {
                layout: 'main',
                error: 'error'
            });
        });
});

//==========================================================

app.get('/login', (req, res) => {
    res.render('login', {
        layout: 'main'
    });
});

app.post('/login', (req, res) => {
    let first, last, id, signature;
    db.getUserByEmail2(req.body.email)
        .then(function(result){
            if(result.rows[0].sig_id) {
                signature = result.rows[0].sig_id;
            }
            first = result.rows[0].first;
            last = result.rows[0].last;
            id = result.rows[0].user_id;
            db.checkPassword(req.body.password, result.rows[0].password);
        }).then(function(result) {
            if(result == false) {
                throw new Error();
            } else {
                console.log('correct');
                req.session.first = first;
                req.session.last = last;
                req.session.userId = id;
                req.session.sigId = signature;
            }
        }).then(function() {
            if (!req.session.sigId) {
                res.redirect("/petition");
            } else {
                res.redirect("/thanks");
            }
        }).catch(function(err) {
            console.log(err);
            res.render('login', {
                layout: 'main',
                error: 'error'
            });
        });
});

//==========================================================

app.get('/profile', (req, res) => {
    res.render('profile', {
        layout: 'main'
    });
});

app.post('/profile', (req, res) => {
    return db.toAddInfo(req.body.age, req.body.city, req.body.homepage, req.session.userId)
        .then(function(result) {
            res.redirect('/petition');
        }).catch(function(err) {
            console.log('profile error  ', err);
        });
});

app.get('/profile/edit', (req, res) => {
    return db.getProfile(req.session.userId).then(function(result) {

        res.render('edit', {
            layout: 'main',
            signer: result.rows[0],
            facts: quotes[lotto()]
        });
    }).catch(function(err) {
        console.log('profile edit error  ', err);
    });
});

app.post('/profile/edit', (req, res) => {
    const {first, last, email, age, city, homepage, password} = req.body;
    const {userId} = req.session;
    if (password) {
        req.session.first = first;
        req.session.last = last;
        db.hashPassword(password)
            .then(function(hashedPassword) {
                console.log(age, city, homepage);
                Promise.all([
                    db.updateUser(first, last,email, hashedPassword, userId),
                    db.updateUserProfile(age, city, homepage, userId)
                ]);
            })
            .then(function() {
                return res.redirect("/thanks");
            })
            .catch(function(err) {
                console.log(err);
            });
    } else {
        req.session.first = first;
        req.session.last = last;
        Promise.all([
            db.updateUserOutPassword(first, last, email, userId),
            db.updateUserProfile(age, city, homepage, userId)
        ])
            .then(function() {
                return res.redirect("/thanks");
            })
            .catch(function(err) {
                console.log(err);
            });
    }
});

//==========================================================

app.get('/petition', requireUserId, requireNoSignature, (req, res) => {
    res.render('home', {
        layout: 'main',
        name: `${req.session.first} ${req.session.last}`,
    });
});

app.post('/petition', requireNoSignature, (req, res) => {
    db.signPetition(req.body.sig, req.session.userId)
        .then(function(result) {
            req.session.sigId = result.rows[0].id;
            res.redirect('/thanks');
        }).catch(function(err) {
            console.log('error', err);
            res.render('home', {
                layout: 'main',
                error: 'error'
            });
        });
});

//==========================================================

app.get('/thanks', requireUserId, requireSignature, (req, res) => {
    Promise.all([db.sigCount(), db.getSignatureById(req.session.userId)])
        .then(function([count, result]) {
            res.render('thanks', {
                layout: 'cert',
                name: `${req.session.first} ${req.session.last}`,
                sig: result.rows[0].signature,
                count: count.rows[0].count
            });
        }).catch(function(err) {
            console.log('error thanks get', err);
        });
});

//==========================================================

app.get('/signers', requireUserId, requireSignature, (req, res) => {
    db.getSigners2()
        .then(function(result) {
            res.render('signers', {
                layout: "main",
                signers: result.rows
            });
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.get('/signers/:city', (req, res)=> {
    db.getSignersByCity(req.params.city).then(function(result){
        res.render('signers', {
            layout: "main",
            signers: result.rows,
            city: req.params.city.toUpperCase()
        });
    });
});

app.post("/delete", function(req, res) {
    db.deleteSig(req.session.userId).then(function() {
        req.session.sigId = null;
        res.redirect("/petition");
    });
});

//==========================================================

app.get('/logout', requireUserId, function(req, res) {
    req.session = null;
    res.redirect('/register');
});

app.get("*", function(req, res) {
    res.redirect("/register");
});


app.listen(process.env.PORT || 8080, () => {
    console.log('Listening port 8080');
});

function requireNoSignature(req, res, next) {
    if (req.session.sigId) {
        return res.redirect("/thanks");
    } else {
        next();
    }
}

function requireSignature(req, res, next) {
    if (!req.session.sigId) {
        return res.redirect("/petition");
    } else {
        next();
    }
}

function requireUserId(req, res, next) {
    if (!req.session.userId) {
        res.redirect("/register");
    } else {
        next();
    }
}

function requireLoggedOut(req, res, next) {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
}

function lotto() {
    return Math.floor(Math.random() *10);
}

var quotes = [`50 percent of the plastic we use,
    we use just once and throw away.`,

`Enough plastic is thrown away each
year to circle the earth four times.`,

`It takes 500 years before plastic decomposes`,

`There Will Be More Plastic Than
Fish in the Ocean by 2050`,

`8 MILLION METRIC TONS of plastic winds
up in our oceans each year. That’s enough
trash to cover every foot of coastline around
the world with five full trash bags of
plastic…compounding every year.`,

`There is more microplastic in the ocean
than there are stars in the Milky Way.`,

`About 500 billion plastic bags
are used worldwide every year.`,

`322 million tons of plastic were produced
in 2015 — the same weight as 900 Empire
State Buildings (which is made of granite
and steel).`,

`About 97% of plastics ever made still exist.
Apart from the small amount of plastic that
is incinerated, every other piece of plastic
ever made continues to exist in some form or shape.`,

`Around 24 million gallons of oil is required
to produce one billion plastic bottles.`
];
