var express = require('express');

var router = express.Router();

const utils = require('../models/utils.js');

router.get('/', function(req, res) {

	//req.db.Stores.update({cashback_from: { $exists: true }}, {$unset: {cashback_from: true}}, {multi: true});
	//req.db.Stores.update({cashback_from_2: { $exists: true }}, {$unset: {cashback_from_2: true}}, {multi: true});
	//req.db.Stores.update({cashback_to_2: { $exists: true }}, {$unset: {cashback_to_2: true}}, {multi: true});
	//req.db.Stores.update({cashback_to: { $exists: true }}, {$unset: {cashback_to: true}}, {multi: true});
	//req.db.Stores.update({}, {$set: {cashback: "2-6%"}}, {multi: true});

	/*************************************************************/

	var configs = req.data.configs, user = req.data.user;

	req.data.title = req.data.langs.titles.index;

	req.db.Stores.find({$not: {status: 2}}).sort({purchases: -1, cashback: -1}).limit(12).exec(function(err, stores) {

		if (stores && stores.length) {

			for (var i = 0; i < stores.length; i++) {

				stores[i].discount_cashback = utils.getDiscountCaskbackOutput(stores[i].cashback, req.data);

				stores[i].cashback = utils.getCaskbackOutput(stores[i].cashback, req.data);

			}

			req.data.stores = stores;

		} else req.data.empty = true;

		res.render('index', req.data);

	});

});

router.get('/shops', function(req, res) {

	var configs = req.data.configs, user = req.data.user;

	req.data.title = req.data.langs.titles.index_shops;

	req.data.navLinks = [{url: '/shops', title: req.data.title}];

	var perPage = 12, page = req.query.p || 1; page *= 1;

	var sortArray = ["name", "date", "cashback", "purchases"];

	var sort = utils.sorting(sortArray, 1, req.query);

	var category = req.query.category || false;

	req.db.Categories.find({}).sort({name3: 1}).exec(function(err, categories) {

		if (!err && categories.length) {

			var createCategories = utils.createCategories(categories, req.data.lang, category);

			if (createCategories.data) {

				req.data.categoryId = category;

				req.data.categoryParentId = createCategories.data.parentId;

	            req.data.catgoryDesc = createCategories.data["desc_" + req.data.lang];

	            if (createCategories.data.metadesc) req.data.metaDesc = createCategories.data.metadesc + '. ' + configs.metaDescDefault;

	            if (createCategories.data.metakeys) req.data.metaKeys = createCategories.data.metakeys + ', ' + configs.metaKeysDefault;

	            req.data.title = createCategories.data.name + " - " + req.data.title;

	        }

			req.data.categories = createCategories.list;

			req.data.categoryPath = 'shops';

			if (createCategories.data) {

				if (createCategories.parentData) {

					req.data.navLinks.push({url: req.url.replace(category, createCategories.parentData._id), title: createCategories.parentData.name});

				}

	            req.data.navLinks.push({url: req.url, title: createCategories.data.name});

			}

		}

		var findQuery = {$not: {status: 2}};

		if (category) findQuery.categories = category;

		if (createCategories.data) {

			if (createCategories.data.childs && createCategories.data.childs.length) {

				var childCategories = createCategories.data.childs;

				var findCategoriesIds = [{categories: category}];

				for (var c = 0; c < childCategories.length; c++) {

					findCategoriesIds.push({categories: childCategories[c]._id});

				}

				findQuery = {$not: {status: 2}, $or: findCategoriesIds};

			} else if (createCategories.data.parentId) {

				findQuery = {$not: {status: 2}, $or: [{categories: category}, {categories: createCategories.data.parentId}]};

			}

		}

		req.db.Stores.find(findQuery).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, stores) {

			req.db.Stores.count(findQuery).exec(function(err, count) {

				utils.pagination(page, perPage, count, req, res);

				if (stores && stores.length) {

					for (var i = 0; i < stores.length; i++) {

						stores[i].discount_cashback = utils.getDiscountCaskbackOutput(stores[i].cashback, req.data);

						stores[i].cashback = utils.getCaskbackOutput(stores[i].cashback, req.data);

					}

					req.data.stores = stores;

				} else req.data.empty = true;

				req.db.Products.find({$not: {status: 2}}).sort({purchases: -1, date: -1}).limit(4).exec(function(err, right_products) {

					if (right_products && right_products.length) {

						for (var i = 0; i < right_products.length; i++) {

							right_products[i].isActivated = (user.activeProducts && user.activeProducts.indexOf(right_products[i]._id) !== -1) ? true : false;

							if (!right_products[i].cashback) right_products[i].cashback = right_products[i].store.cashback;

							right_products[i].discount_cashback = utils.getDiscountCaskbackOutput(right_products[i].cashback, req.data);

							right_products[i].cashback = utils.getCaskbackOutput(right_products[i].cashback, req.data);

							right_products[i].currency = (right_products[i].currency === "RUB") ? req.data.langs.currency_r : req.data.langs.currency_d;

							if (right_products[i].picture.substr(0, 4) !== "http") right_products[i].picture = "/img/products/" + right_products[i].picture;

						}

						req.data.right_products = right_products;

					}

					res.render('shops', req.data);

				});

			});

		});

	});

});

router.get('/shop', function(req, res) {

	var configs = req.data.configs, user = req.data.user;

	var storeId = req.query.id || false;

	if (!storeId) {

		req.data.title = 'Error 404';

		return res.status(404).render('error', req.data);

	}

	req.db.Stores.findOne({_id: storeId, $not: {status: 2}}, function(err, store) {

		if (!store) {

			req.data.title = 'Error 404';

			return res.status(404).render('error', req.data);

		}

		store.discount_cashback = utils.getDiscountCaskbackOutput(store.cashback, req.data);

		store.cashback = utils.getCaskbackOutput(store.cashback, req.data);

		// -------------------------------

		store.desc = store["desc_" + req.data.lang] || "";

		store.desc = store.desc.replace(/\[/g, "<").replace(/\]/g, ">");

		store.countries = utils.getCustomCountriesNames(store.countries, req.data.lang).join(", ");

		req.data.store = store;

		req.data.isActivated = (user.activeStores && user.activeStores.indexOf(store._id) !== -1) ? true : false;

		req.data.title = req.data.langs.shop_title_1 + ' ' + store.name + ' ' + req.data.langs.shop_title_2;

		req.data.metaDesc = req.data.title + '. ' + configs.metaDescDefault;

		req.data.metaKeys = store.name + ', ' + configs.metaKeysDefault;

		req.data.navLinks = [{url: '/shops', title: req.data.langs.titles.index_shops}, {url: req.url, title: store.name}];

		req.db.Stores.find({$not: {status: 2}, $not: {_id: store._id}, categories: store.categories[0]}).sort({purchases: -1}).limit(3).exec(function(err, relStores) {

			if (relStores && relStores.length) {

				for (var i = 0; i < relStores.length; i++) {

					relStores[i].discount_cashback = utils.getDiscountCaskbackOutput(relStores[i].cashback, req.data);

					relStores[i].cashback = utils.getCaskbackOutput(relStores[i].cashback, req.data);
				
				}

				req.data.relatedStores = relStores;

			}

			res.render('shop', req.data);

		});

	});

});

router.get('/howitworks', function(req, res) {

	req.data.title = req.data.langs.how_works_cashback;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	res.render('howitworks', req.data);

});

router.get('/faq', function(req, res) {

	req.data.title = req.data.langs.ques_and_answrs;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	res.render('faq', req.data);

});

router.get('/contact', function(req, res) {

	req.data.title = req.data.langs.to_support;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	res.render('contact', req.data);

});

router.get('/about', function(req, res) {

	req.data.title = req.data.langs.about_us;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	res.render('about', req.data);

});

router.get('/agreement', function(req, res) {

	req.data.title = req.data.langs.agreement;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	res.render('agreement', req.data);

});

router.get('/privacy_policy', function(req, res) {

	req.data.title = req.data.langs.privacy_policy;

	req.data.navLinks = [{url: req.url, title: req.data.title}];

	res.render('privacy_policy', req.data);

});

router.get('/logout', function(req, res) {

	if (!req.data.user) return res.redirect('/');

	res.clearCookie("authkey");

	res.redirect('/');

});

router.get('/search', function(req, res) {

	var configs = req.data.configs, user = req.data.user;

	var perPage = 12, page = req.query.p || 1; page *= 1;

	var findQuery, searchQuery = req.query.search;

	if (searchQuery && searchQuery.length > 2) {

	    searchQuery = searchQuery.replace(/[^0-9A-Za-z_.\s\-\u0410-\u044F\u0531-\u0587]/g,'').trim();

	    searchQuery = searchQuery.replace(/(?=(\s))\1{2,}/g, "$1");

	    searchQuery = searchQuery.replace(/(?=(.))\1{3,}/g, "$1");

	    var regEx = new RegExp(searchQuery, "gi");

		findQuery = {$not: {status: 2}, $or: [{name: {$regex: regEx}}, {desc_1: {$regex: regEx}}, {desc_2: {$regex: regEx}}, {desc_3: {$regex: regEx}}]};

	} else {

		req.data.searchError = true;

		findQuery = {emty: "error"};

	}

    req.data.title = req.data.langs.titles.index_search + ' - ' + searchQuery;

	req.data.navLinks = [{url: '/search', title:  req.data.langs.search}, {url: req.url, title: searchQuery}];

	req.db.Stores.find(findQuery).skip((perPage * page) - perPage).limit(perPage).exec(function(err, stores) {

		req.db.Stores.count(findQuery).exec(function(err, count) {

			utils.pagination(page, perPage, count, req, res);

			if (stores && stores.length) {

				for (var i = 0; i < stores.length; i++) {

					stores[i].discount_cashback = utils.getDiscountCaskbackOutput(stores[i].cashback, req.data);

					stores[i].cashback = utils.getCaskbackOutput(stores[i].cashback, req.data);

				}

				req.data.stores = stores;

			} else req.data.searchEmpty = true;

			req.db.Categories.find({}).sort({name3: 1}).exec(function(err, categories) {

				if (!err && categories.length) {

					var createCategories = utils.createCategories(categories, req.data.lang);

					req.data.categories = createCategories.list;

					req.data.categoryPath = 'shops';

				}

				res.render('shops', req.data);

			});

		});

	});

});

router.get('/verify', function(req, res) {

	var configs = req.data.configs, user = req.data.user;

	var code = req.query.code || false;

	if (!code) return res.redirect('/');

	req.db.Users.findOne({noverified: code*1}, function(err, foundUser) {

		if (err || !foundUser) return res.redirect('/');

		req.db.Users.update({_id: foundUser._id}, {$unset: {noverified: true}}, function(err) {

			if (err) return res.redirect('/');

			var mailOptions = {

	            to: foundUser.email,
	            html: 'registration',
              	lang: foundUser.notiflang || req.data.lang

	          }

	          var mailData = {

	            siteUrl: req.protocol + '://' + req.hostname,
	            siteName: req.data.configs.siteName,
	            userName: foundUser.name,
	            supportMail: req.data.configs.supportMail


	          }
	          
	          utils.sendMail(mailOptions, mailData, function(resp) {

	            if (resp && !resp.success) console.log(resp);

	            if (user) return res.redirect('/profile?verifing=1');

				return res.redirect('/?verifing=1');
	            
	          });

		});

	});

});

var endProductsDisablingLastDay = false;

router.get('/hot_deals', function(req, res) {

	var configs = req.data.configs, user = req.data.user;

	req.data.title = req.data.langs.hot_deals;

	req.data.navLinks = [{url: '/hot_deals', title: req.data.title}];

	var perPage = 12, page = req.query.p || 1; page *= 1;

	var sortArray = ["name", "price", "date", "cashback", "purchases"];

	var sort = utils.sorting(sortArray, 3, req.query);

	var category = req.query.category || false;

	req.db.Categories.find({}).sort({name3: 1}).exec(function(err, categories) {

		if (!err && categories.length) {

			var createCategories = utils.createCategories(categories, req.data.lang, category);

			if (createCategories.data) {

				req.data.categoryId = category;

				req.data.categoryParentId = createCategories.data.parentId;

	            req.data.catgoryDesc = createCategories.data["desc_" + req.data.lang];

	            if (createCategories.data.metadesc) req.data.metaDesc = createCategories.data.metadesc + '. ' + configs.metaDescDefault;

	            if (createCategories.data.metakeys) req.data.metaKeys = createCategories.data.metakeys + ', ' + configs.metaKeysDefault;

	            req.data.title = createCategories.data.name + " - " + req.data.title;

	        }

			req.data.categories = createCategories.list;

			req.data.categoryPath = 'hot_deals';

			if (createCategories.data) {

				if (createCategories.parentData) {

					req.data.navLinks.push({url: req.url.replace(category, createCategories.parentData._id), title: createCategories.parentData.name});

				}

	            req.data.navLinks.push({url: req.url, title: createCategories.data.name});

			}

		}

		var findQuery = {$not: {status: 2}};

		if (category) findQuery.categories = category;

		if (createCategories.data) {

			if (createCategories.data.childs && createCategories.data.childs.length) {

				var childCategories = createCategories.data.childs;

				var findCategoriesIds = [{categories: category}];

				for (var c = 0; c < childCategories.length; c++) {

					findCategoriesIds.push({categories: childCategories[c]._id});

				}

				findQuery = {$not: {status: 2}, $or: findCategoriesIds};

			} else if (createCategories.data.parentId) {

				findQuery = {$not: {status: 2}, $or: [{categories: category}, {categories: createCategories.data.parentId}]};

			}

		}

		req.db.Products.find(findQuery).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, products) {

			req.db.Products.count(findQuery).exec(function(err, count) {

				utils.pagination(page, perPage, count, req, res);

				if (products && products.length) {

					var date = new Date();

					var nowTime = date.getTime(), today = date.getDate();

					if (today !== endProductsDisablingLastDay) {

						req.db.Products.update({endDate: {$lt: nowTime}}, { $set: {status: 2} }, {multi: true});

						endProductsDisablingLastDay = today;

					}

					for (var i = 0; i < products.length; i++) {

						/*if (products[i].endDate && products[i].endDate < nowTime) {

							req.db.Products.remove({_id: products[i]._id});

							products.splice(i, 1); i--;

							continue;

						}*/

						products[i].isActivated = (user.activeProducts && user.activeProducts.indexOf(products[i]._id) !== -1) ? true : false;

						if (!products[i].cashback) products[i].cashback = products[i].store.cashback;

						products[i].discount_cashback = utils.getDiscountCaskbackOutput(products[i].cashback, req.data);

						products[i].cashback = utils.getCaskbackOutput(products[i].cashback, req.data);

						products[i].currency = (products[i].currency === "RUB") ? req.data.langs.currency_r : req.data.langs.currency_d;

						if (products[i].picture.substr(0, 4) !== "http") products[i].picture = "/img/products/" + products[i].picture;

					}

					req.data.products = products;

				} else req.data.empty = true;

				req.db.Products.find({$not: {status: 2}}).sort({purchases: -1, date: -1}).limit(4).exec(function(err, right_products) {

					if (right_products && right_products.length) {

						for (var i = 0; i < right_products.length; i++) {

							right_products[i].isActivated = (user.activeProducts && user.activeProducts.indexOf(right_products[i]._id) !== -1) ? true : false;

							if (!right_products[i].cashback) right_products[i].cashback = right_products[i].store.cashback;

							right_products[i].discount_cashback = utils.getDiscountCaskbackOutput(right_products[i].cashback, req.data);

							right_products[i].cashback = utils.getCaskbackOutput(right_products[i].cashback, req.data);

							right_products[i].currency = (right_products[i].currency === "RUB") ? req.data.langs.currency_r : req.data.langs.currency_d;

							if (right_products[i].picture.substr(0, 4) !== "http") right_products[i].picture = "/img/products/" + right_products[i].picture;

						}

						req.data.right_products = right_products;

					}

					res.render('hot_deals', req.data);

				});

			});

		});

	});

});

/*router.get('/goto', function(req, res) {

	req.data.title = req.data.langs.cashback_is_activated_short;

	var type = req.query.type, id = req.query.id;

	var db = req.db, user = req.data.user;

	if (!type || !id || !user) res.status(404).render("error", req.data);

	var nowTime = Date.now();

	if (type == 1) {

		req.db.Stores.findOne({_id: id}, function(err, store) {

			if (err || !store) return res.status(404).render("error", req.data);

			req.db.Orders.findOne({"user._id": user._id, "shop._id": store._id, status: 1}, function(err, existOrder) {

				if (existOrder) {

					req.data.goto = store.url+'?subid='+existOrder._id;

					if (existOrder.date > (nowTime-120000)) return res.render('goto', req.data);

					db.Orders.update({_id: existOrder._id}, {$set: {date: nowTime}}, function (err) {

						if (err) return res.status(404).render("error", req.data);

						res.render('goto', req.data);

					});

				} else {

					var insertData = {

						user: {
							_id: user._id,
							name: user.name
						},

						shop: {
							_id: store._id,
							name: store.name,
							picture: store.picture,
							cashback: store.cashback
						},

						date: nowTime,

						status: 1

					};

					db.Orders.insert(insertData, function (err, newOrder) {

						if (err || !newOrder) return res.status(404).render("error", req.data);

						req.data.goto = store.url+'?subid='+newOrder._id;

						res.render('goto', req.data);

					});

				}

			});

		});

	} else if (type == 2) {

		req.db.Products.findOne({_id: id}, function(err, product) {

			if (err || !product) return res.status(404).render("error", req.data);

			req.db.Orders.findOne({"user._id": user._id, "product._id": product._id, status: 1}, function(err, existOrder) {

				if (existOrder) {

					req.data.goto = product.url+'&subid='+existOrder._id;

					if (existOrder.date > (nowTime-120000)) return res.render('goto', req.data);

					db.Orders.update({_id: existOrder._id}, {$set: {date: nowTime}}, function (err) {

						if (err) return res.status(404).render("error", req.data);

						res.render('goto', req.data);

					});

				} else {

					var insertData = {

						user: {
							_id: user._id,
							name: user.name
						},

						product: {
							_id: product._id,
							name: product.name,
							picture: product.picture,
							cashback: product.cashback || product.store.cashback
						},

						amount: product.price,

						date: nowTime,

						status: 1

					};

					if (product.store) insertData.shop = {_id: product.store._id};

					db.Orders.insert(insertData, function (err, newOrder) {

						if (err || !newOrder) return res.status(404).render("error", req.data);

						req.data.goto = product.url+'&subid='+newOrder._id;

						res.render('goto', req.data);

					});

				}

			});

		});

	}

});*/


module.exports = router;
