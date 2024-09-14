const createError = require('http-errors');

const express = require('express');

const path = require('path');

const cookieParser = require('cookie-parser');

const bodyParser = require("body-parser");

const atpl = require('atpl');

const Datastore = require('nedb');

const app = express();

const db = {

    Configs: new Datastore({filename : 'database/configs.db'}),
    Users: new Datastore({filename : 'database/users.db'}),
    Categories: new Datastore({filename : 'database/categories.db'}),
    Affilnets: new Datastore({filename : 'database/affilnets.db'}),
    Stores: new Datastore({filename : 'database/stores.db'}),
    Orders: new Datastore({filename : 'database/orders.db'}),
    StateDays: new Datastore({filename : 'database/statedays.db'}),
    StateTotals: new Datastore({filename : 'database/statetotals.db'}),
    Payouts: new Datastore({filename : 'database/payouts.db'}),
    Products: new Datastore({filename : 'database/products.db'})

}

db.Configs.loadDatabase();

db.Users.loadDatabase();

db.Categories.loadDatabase();

db.Affilnets.loadDatabase();

db.Stores.loadDatabase();

db.Orders.loadDatabase();

db.StateDays.loadDatabase();

db.StateTotals.loadDatabase();

db.Payouts.loadDatabase();

db.Products.loadDatabase();

db.Users.persistence.setAutocompactionInterval(2*3600*1000);

db.Stores.persistence.setAutocompactionInterval(3*3600*1000);

db.Orders.persistence.setAutocompactionInterval(4*3600*1000);

db.StateDays.persistence.setAutocompactionInterval(4*3600*1000);

db.StateTotals.persistence.setAutocompactionInterval(4*3600*1000);

/*db.Configs.update({_id: "CONFIGS"}, { $set: {

    discounts: [
        {
            id: 1,
            endDate: Date.now()+72*3600000,
            procent: 50,
            status: 1
        },
        {
            id: 2,
            endDate: 0,
            procent: 50,
            status: 0
        }
    ]

} }, {});*/

const indexRouter = require('./routes/index');

const profileRouter = require('./routes/profile');

const apiRouter = require('./routes/api');

const adminRouter = require('./routes/admin');

const utils = require('./models/utils.js');

// view engine setup

app.engine('html', atpl.__express);

app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'html');

app.enable('trust proxy');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {

    // www to non-www redirect -----------------

    if (req.headers.host.match(/^www/) !== null ) {

        return res.redirect(301, 'https://' + req.headers.host.replace(/^www\./, '') + req.url);

    }

    // get real ipv4 ip -----------------------------

    if (req.ip === '::1') req.realip = '127.0.0.1';

    else {

        var splitedIp = req.ip.split(':');

        req.realip = splitedIp[splitedIp.length-1];

        if (req.realip.length < 7) req.realip = false;

    }

    // check signing --------------------------------

    req.data = {user: false}; req.db = db;

    req.data.test = app.get('env') === 'production' ? false : true;

    // get user country -----------------------------

    req.data.country = utils.getCountryByIp(req.realip);

    //----------------------------

    var defaultLang = 1;

    switch (req.data.country.code) {

        case 'AM':
        case 'RU':
        case 'AZ':
        case 'UA':
        case 'KZ':
        case 'UZ':
        case 'BY':
        case 'KG':
        case 'MD':
        case 'TJ':
        case 'PL':

        defaultLang = 1; break;

        default: defaultLang = 2;

    }

    req.data.defaultLang = defaultLang;

    var langCookie = req.cookies.lang;

    var currLang = (langCookie) ? langCookie*1 : defaultLang;

    if (currLang !== 1 && currLang !== 2) currLang = defaultLang;

    var langFile = ["russian", "english"][currLang-1];

    var langs = require('./langs/' + langFile + ".json");

    req.data.lang = currLang;

    req.data.langs = langs;

    //----------------------------

    db.Configs.findOne({_id: "CONFIGS"}, function(err, dataConfigs) {

        if (err || !dataConfigs) return next();

        dataConfigs.defaultRateRurUsd = 70;

        dataConfigs.defaultRateUsdRur = 55;

        dataConfigs.minPayout_r = utils.toFixed((dataConfigs.minPayout * dataConfigs.defaultRateRurUsd), 2);

        req.data.configs = dataConfigs;

        var date = new Date();

        req.data.configs.thisYear = date.getFullYear();

        req.data.configs.userCashbackProcentGrowth = utils.toFixed(100 / dataConfigs.userProcent * dataConfigs.userProcentGrowth);

        // Initialize discounts -----------------------

        var discounts = [], updateDiscounts, now = Date.now();

        for (var i = 0; i < dataConfigs.discounts.length; i++) {

            // delete ended discount

            if (dataConfigs.discounts[i].status === 1 && dataConfigs.discounts[i].endDate < now) {

                dataConfigs.discounts[i].status = 0;

                dataConfigs.discounts[i].endDate = 0;

                updateDiscounts = true;

            }

            // set discounts

            var discount = dataConfigs.discounts[i];

            discounts[i] = (discount.status) ? discount.procent : 0;

        }

        // delete ended discount

        if (updateDiscounts) {

            db.Configs.update({_id: "CONFIGS"}, { $set: {discounts: dataConfigs.discounts} });

        }

        req.data.discounts = discounts;

        // ------------------------------------------------

        var authCookie = req.cookies.authkey;

        if (!authCookie) return next();

        db.Users.findOne({'authKey' : authCookie}, function(err, dataUser) {

            if (err || !dataUser) return next();

            dataUser.logDate = Date.now();

            if (!dataUser.avatar) dataUser.avatar = '/img/noavatar.png';

            else if (dataUser.avatar.substr(0, 4) !== "http") dataUser.avatar = "/img/avatars/" + dataUser.avatar;

            if (dataUser.group === 3) dataUser.admin = true;

            else if (dataUser.group === 2) dataUser.moder = true;

            var totalHoldUsd = utils.toFixed((dataUser.hold + (dataUser.hold_r / dataConfigs.defaultRateRurUsd)), 2);

            var totalMoneyUsd = utils.toFixed((dataUser.money + (dataUser.money_r / dataConfigs.defaultRateRurUsd)), 2);

            var totalPayoutUsd = utils.toFixed((dataUser.payout + (dataUser.payout_r / dataConfigs.defaultRateRurUsd)), 2);

            if (dataUser.status !== 4) {

                dataUser.typeChangeRemain = utils.toFixed((dataConfigs["getAccountType"+(dataUser.status+1)] - totalMoneyUsd - totalHoldUsd - totalPayoutUsd), 2);

                dataUser.typeChangeRemain_r = utils.toFixed((dataUser.typeChangeRemain * dataConfigs.defaultRateRurUsd), 2);

                if (dataUser.typeChangeRemain < 0) dataUser.typeChangeRemain = 0;

                if (dataUser.typeChangeRemain_r < 0) dataUser.typeChangeRemain_r = 0;

            }

            if (!dataUser.notiflang) dataUser.notiflang = currLang;
            
            db.Users.update({_id: dataUser._id}, { $set: { logDate: dataUser.logDate } }, {});

            req.data.user = dataUser;

            if (dataUser.purchases !== 0) req.data.discounts[0] = 0;
            
            if (!dataUser.noverified && req.query.verifing == 1) req.data.verifing = true;

            if (dataUser.blocked) {

                req.data.title = langs.account_blocked;

                return res.render('blocked', req.data);

            }

            return next();

        });

    });

});

/*app.get('/verify-admitad.txt', function(req, res) {

    res.sendFile(path.join(__dirname, 'verify-admitad.txt'));

});*/

app.use('/', indexRouter);

app.use('/profile', profileRouter);

app.use('/api', apiRouter);

app.use('/admin', adminRouter);

// catch 404 and forward to error handler

app.use(function(req, res, next) {

    next(createError(404));

});

// error handler

app.use(function(err, req, res, next) {

    // set locals, only providing error in development

    if (!req.data) req.data = {};

    res.locals.message = err.message;

    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page

    res.status(err.status || 500);

    req.data.title = 'Error ' + err.status;

    res.render('error', req.data);

});


module.exports = app;
