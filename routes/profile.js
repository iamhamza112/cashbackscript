var express = require('express');

var router = express.Router();

const utils = require('../models/utils.js');


router.use(function(req, res, next) {

	if (!req.data.user) {

		req.data.title = 'Error 403';

		return res.status(403).render('not_signed', req.data);

	}

	next();

});

router.get('/', function(req, res) {

	var user = req.data.user;

	req.data.title = req.data.langs.titles.profile;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	req.db.Orders.find({"user._id": user._id}).exec(function(err, orders) {

		var count = orders.length || 0;

		var todayProfit = 0, yesterdayProfit = 0;

		var todayProfit_r = 0, yesterdayProfit_r = 0;

		if (count > 0) {

			var todayTimeStamp = new Date();

			var todayDate = todayTimeStamp.getDate();

			var yesterdayTimeStamp = new Date();

			yesterdayTimeStamp.setDate(yesterdayTimeStamp.getDate() - 1);

			yesterdayDate = yesterdayTimeStamp.getDate();

			for (var i = 0; i < count; i++) {

				var orderDate = new Date(orders[i].date);

				orderDate = orderDate.getDate();

				if (orderDate === todayDate) {

					if (orders[i].currency === "USD") todayProfit += orders[i].cashback;

					else todayProfit_r += orders[i].cashback;

				} else if (orderDate === yesterdayDate) {

					if (orders[i].currency === "USD") yesterdayProfit += orders[i].cashback;

					else yesterdayProfit_r += orders[i].cashback;

				}

			}

		}

		req.data.purchasesCount = count;

		req.data.todayProfit = utils.toFixed(todayProfit, 2);

		req.data.todayProfit_r = utils.toFixed(todayProfit_r, 2);

		req.data.yesterdayProfit = utils.toFixed(yesterdayProfit, 2);

		req.data.yesterdayProfit_r = utils.toFixed(yesterdayProfit_r, 2);

		req.data.totalProfit = utils.toFixed((user.payout + user.hold + user.money), 2);

		req.data.totalProfit_r = utils.toFixed((user.payout_r + user.hold_r + user.money_r), 2);

		res.render('profile', req.data);

	});

});

router.get('/settings', function(req, res) {

	req.data.title = req.data.langs.profile_settings;

	req.data.navLinks = [{url: '/profile', title: req.data.langs.titles.profile}, {url: req.baseUrl+req.url, title: req.data.title}];

	res.render('profile_settings', req.data);

});

router.get('/payout', function(req, res) {

	req.data.title = req.data.langs.payout;

	req.data.navLinks = [{url: '/profile', title: req.data.langs.titles.profile}, {url: req.baseUrl+req.url, title: req.data.title}];

	res.render('profile_payout', req.data);

});

router.get('/requisites', function(req, res) {

	req.data.title = req.data.langs.my_requisites;

	req.data.navLinks = [{url: '/profile', title: req.data.langs.titles.profile}, {url: req.baseUrl+req.url, title: req.data.title}];

	res.render('profile_requisites', req.data);

});

router.get('/orders', function(req, res) {

	var db = req.db, user = req.data.user;

	var perPage = 12, page = req.query.p || 1; page *= 1;

	var sortArray = ["store.name", "amount", "cashback", "date", "status"];

	var sort = utils.sorting(sortArray, 4, req.query);

	req.data.title = req.data.langs.my_orders;

	req.data.navLinks = [{url: '/profile', title: req.data.langs.titles.profile}, {url: req.baseUrl+req.url, title: req.data.title}];

	db.Orders.find({"user._id": user._id}).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, orders) {

		db.Orders.count({"user._id": user._id}).exec(function(err, count) {

			utils.pagination(page, perPage, count, req, res);

			if (!err && orders && orders.length) {

				for (var i = 0; i < orders.length; i++) {

					var currencyOutput = " " + ((orders[i].currency === "USD") ? req.data.langs.currency_d : req.data.langs.currency_r);

					if (!orders[i].cashback) {

						var cashbackValue = (orders[i].shop && orders[i].shop.cashback) ? orders[i].shop.cashback : (orders[i].product && orders[i].product.cashback) ? orders[i].product.cashback : 0;
						
						orders[i].cashback = utils.getDiscountCaskbackOutput(cashbackValue, req.data) || utils.getCaskbackOutput(cashbackValue, req.data);

					} else {

						orders[i].cashback += currencyOutput;

					}

					if (orders[i].amount) orders[i].amount += currencyOutput;

					else orders[i].amount = "-";

					orders[i].date = utils.getDate(orders[i].date, 2);

				}

				req.data.orders = orders;

			} else req.data.empty = true;

			res.render('profile_orders', req.data);

		});

	});

});

router.get('/payouts', function(req, res) {

	req.data.title = req.data.langs.payout_history;

	req.data.navLinks = [{url: '/profile', title: req.data.langs.titles.profile}, {url: req.baseUrl+req.url, title: req.data.title}];

	var sortArray = ["method", "requisites", "amount", "date", "status"];

	var sort = utils.sorting(sortArray, 4, req.query);

	req.db.Payouts.find({"user._id": req.data.user._id}).sort(sort).exec(function(err, payouts) {

		if (!err && payouts.length) {

			for (var i = 0; i < payouts.length; i++) {

				var currencyOutput = " " + ((payouts[i].currency === "USD") ? req.data.langs.currency_d : req.data.langs.currency_r);

				payouts[i].amount += currencyOutput;

				payouts[i].date = utils.getDate(payouts[i].date, 2);

			}

			req.data.payouts = payouts;

		} else req.data.empty = true;

		res.render('profile_payouts', req.data);

	});

});

module.exports = router;
