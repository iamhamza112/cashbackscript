var express = require('express');

var router = express.Router();

const utils = require('../models/utils.js');

const fs = require('fs');

const multer = require('multer');

router.use(function(req, res, next) {

	if (!req.data.user || !req.data.user.admin) {

		req.data.title = 'Error 404';

		return res.status(404).render('error', req.data);

	}

	//----------------------------

    var langCookie = req.cookies.admlang, defaultLang = 1;

    var currLang = (langCookie) ? langCookie*1 : defaultLang;

    if (currLang !== 1 && currLang !== 2) currLang = defaultLang;

    var langFile = ["russian", "english"][currLang-1];

    req.data.admlang = currLang;

    req.data.langs = require('../langs/' + langFile + ".json");

    req.data.admlangs = require('../langs/admin_' + langFile + ".json");

    //----------------------------

	req.data.path = req._parsedUrl.pathname.replace("/", "");

	next();

});

router.get('/auth', function(req, res, next) {

	req.data.title = 'Аутентификация';

	res.render('admin/auth', req.data);

});

router.post('/api/auth', function(req, res) {

	if (!req.body.password) return res.end();

	var password = utils.md5(req.body.password);

	var adminPassword = req.data.configs.adminKey;

	if (password === adminPassword) {

		return res.cookie('admkey', adminPassword, {maxAge: 0.2*86400000}).redirect('/admin');

	}

	return res.redirect('/admin/auth');

});

router.use(function(req, res, next) {

	var adminKey = req.cookies.admkey;

	if (adminKey !== req.data.configs.adminKey) return res.redirect('/admin/auth');

	next();

});

/***************************************************************/

router.get('/', function(req, res) {

	var db = req.db;

	req.data.title = 'Панель управления';

	db.StateTotals.findOne({_id: "STATETOTALS"}, function(err, states) {

    	if (err || !states) return res.end();

    	var today = utils.getDate(false, false, true, "");

    	db.StateDays.findOne({day: today}, function(err, todayStates) {

    		if (err) return res.end();

	    	var greatThenTime = Date.now() - utils.getMillisecondsToday();

	    	req.data.profit = states.profit;

	    	req.data.profit_r = states.profit_r;

	    	req.data.todayProfit = (todayStates) ? (todayStates.profit || 0) : 0;

	    	req.data.todayProfit_r = (todayStates) ? (todayStates.profit_r || 0) : 0;

	    	db.Orders.count({date: {$gte: greatThenTime}}).exec(function(err, ordersCount) {

	    		req.data.newOrders = ordersCount || 0;

	    		db.Users.count({regDate: {$gte: greatThenTime}}).exec(function(err, usersCount) {

		    		req.data.newUsers = usersCount || 0;

		    		res.render('admin/index', req.data);

		    	});

	    	});

	    });

    });

});

router.get('/affilnets', function(req, res) {

	req.data.title = 'Партнерские сети';

	var perPage = 12, page = req.query.p || 1; page *= 1;

	req.db.Affilnets.find({}).skip((perPage * page) - perPage).limit(perPage).exec(function(err, affilnets) {

		if (err) return next(err);

		req.db.Affilnets.count().exec(function(err, count) {

			if (err) return next(err);

            utils.pagination(page, perPage, count, req, res);

			if (count && affilnets && affilnets.length) {

				req.db.Stores.find({}, function(err, stores) {

					for (var i = 0; i < affilnets.length; i++) {

						affilnets[i].storesCount = utils.getCountOf(affilnets[i]._id, stores, "affilnet._id");

					}

					req.data.affilnets = affilnets;

					res.render('admin/affilnets', req.data);

				});

			} else {

				req.data.empty = true;

				res.render('admin/affilnets', req.data);

			}

		});

	});

});

router.get('/newaffilnet', function(req, res) {

	req.data.title = 'Добавить новую партнерскую сеть';

	res.render('admin/newaffilnet', req.data);

});

router.get('/editaffilnet', function(req, res) {

	var affnetId = req.query.id;

	req.data.title = 'Редактировать партнерскую сеть';

	req.db.Affilnets.findOne({_id: affnetId}, function(err, affnet) {

		if (affnet) req.data.affnet = affnet;

		else req.data.empty = true;

		res.render('admin/editaffilnet', req.data);

	});

});

router.get('/shops', function(req, res) {

	req.data.title = 'Магазины';

	var perPage = 20, page = req.query.p || 1; page *= 1;

	var sortArray = ["affilnet.name", "cashback", "purchases", "profit", "status"];

	var sort = utils.sorting(sortArray, false, req.query);

	req.db.Stores.find({}).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, stores) {

		if (err) return next(err);

		req.db.Stores.count().exec(function(err, count) {

			if (err) return next(err);

            utils.pagination(page, perPage, count, req, res);

            if (req.error) {

            	req.data.title = 'Error 404';

				return res.status(404).render('admin/error', req.data);

            }

			if (count && stores && stores.length) {

				for (var i = 0; i < stores.length; i++) {

					stores[i].cashback = utils.getCaskbackOutput(stores[i].cashback, req.data, 100);

				}

				req.data.stores = stores;

			} else req.data.empty = true;

			res.render('admin/shops', req.data);

		});

	});

});

router.get('/newshop', function(req, res) {

	req.data.title = 'Добавить магазин';

	req.db.Affilnets.find({}, function(err, affilnets) {

		if (affilnets && affilnets.length) {

			req.data.affilnets = affilnets;

		}

		req.db.Categories.find({}, function(err, categories) {

			if (categories && categories.length) {

				var createCategories = utils.createCategories(categories, req.data.lang);

				req.data.categories = createCategories.list;

			}

			req.data.countries = utils.getAllCountriesList(false, req.data.admlang, 1);

			res.render('admin/newshop', req.data);

		});

	});

});

router.get('/editshop', function(req, res) {

	var storeId = req.query.id;

	req.data.title = 'Редактировать магазин';

	req.db.Stores.findOne({_id: storeId}, function(err, store) {

		req.db.Affilnets.find({}, function(err, affilnets) {

			if (affilnets && affilnets.length) {

				req.data.affilnets = affilnets;

			}

			req.db.Categories.find({}, function(err, categories) {

				if (categories && categories.length) {

					var createCategories = utils.createCategories(categories, req.data.lang);

					req.data.categories = createCategories.list;

				}

				if (store) {

					store.cashback_k = store.cashback.substr(-1);

					store.cashback = store.cashback.slice(0, -1);

					req.data.store = store;

				} else req.data.empty = true;

				req.data.countries = utils.getAllCountriesList(store.countries, req.data.admlang, 1);

				res.render('admin/editshop', req.data);

			});

		});

	});

});

router.get('/categories', function(req, res) {

	req.data.title = 'Категории магазинов';

	req.db.Categories.find({}).sort({["name"+req.data.admlang]: 1}).exec(function(err, categories) {

		if (categories && categories.length) {

			req.db.Stores.find({}, function(err, stores) {

				var parents = [], childrens = [];

				for (var i = 0; i < categories.length; i++) {

					categories[i].name = categories[i]["name"+req.data.admlang];

					categories[i].storesCount = utils.getCountOf(categories[i]._id, stores, "categories");

					if (categories[i].parentId && categories[i].parentId != 0) {

						childrens.push(categories[i]);

					} else {

						categories[i].childs = [];

						parents.push(categories[i]);

					}

				}

				for (var i = 0; i < childrens.length; i++) {

					for (var j = 0; j < parents.length; j++) {

						if (parents[j]._id === childrens[i].parentId) {

							parents[j].childs.push(childrens[i]);

							parents[j].storesCount += childrens[i].storesCount;

							break;

						}

					}

				}

				req.data.categories = parents;

				res.render('admin/categories', req.data);

			});

		} else {

			req.data.empty = true;

			res.render('admin/categories', req.data);

		}

	});

});

router.get('/newcategory', function(req, res) {

	req.data.title = 'Добавить новую категорию';

	req.db.Categories.find({$or: [{parentId: false}, {parentId: {$exists: false}}]}, function(err, categories) {

		if (categories && categories.length) {

			for (var i = 0; i < categories.length; i++) {

				categories[i].name = categories[i]["name"+req.data.admlang];

			}

			req.data.categories = categories;

		}

		res.render('admin/newcategory', req.data);

	});

});

router.get('/editcategory', function(req, res) {

	var catId = req.query.id;

	req.data.title = 'Редактировать категорию';

	req.db.Categories.findOne({_id: catId}, function(err, ctgr) {

		if (ctgr) req.data.ctgr = ctgr;

		else req.data.empty = true;

		req.db.Categories.find({$or: [{parentId: false}, {parentId: {$exists: false}}]}, function(err, categories) {

			if (categories && categories.length) {

				for (var i = 0; i < categories.length; i++) {

					categories[i].name = categories[i]["name"+req.data.admlang];

				}

				req.data.parentCategories = categories;

			}

			res.render('admin/editcategory', req.data);

		});

	});

});

router.get('/users', function(req, res) {

	req.data.title = 'Пользователи';

	var perPage = 30, page = req.query.p || 1; page *= 1;

	var sortArray = ["name", "email", "country.name", "money", "hold", "purchases", "regDate", "blocked"];

	var sort = utils.sorting(sortArray, 7, req.query);

	req.db.Users.find({}).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, users) {

		if (err) return next(err);

		req.db.Users.count().exec(function(err, count) {

            if (err) return next(err);

            utils.pagination(page, perPage, count, req, res);

			if (count && users && users.length) {

				for (var i = 0; i < users.length; i++) {

					users[i].country = utils.getCountryName(users[i].country, req.data.admlang);

					users[i].regDate = utils.getDate(users[i].regDate, 2);

				}

				req.data.users = users;

			} else req.data.empty = true;

			res.render('admin/users', req.data);

		});

	});

});

router.get('/edituser', function(req, res) {

	var userId = req.query.id;

	req.data.title = 'Редактировать пользователя';

	req.db.Users.findOne({_id: userId}, function(err, userData) {

		if (userData) {

			req.data.userData = userData;

			req.data.countries = utils.getAllCountriesList(userData.country, req.data.admlang);

		} else req.data.empty = true;

		res.render('admin/edituser', req.data);

	});

});

router.get('/userprofile', function(req, res) {

	var userId = req.query.id;

	req.data.title = 'Профиль пользователя';

	req.db.Users.findOne({_id: userId}, function(err, userData) {

		if (userData) {

			userData.country = utils.getCountryName(userData.country, req.data.admlang);

			userData.regDate = utils.getDate(userData.regDate, 2);

			userData.logDate = utils.getDate(userData.logDate, 2);

			if (!userData.avatar) userData.avatar = '/img/noavatar.png';

            else if (userData.avatar.substr(0, 4) !== "http") userData.avatar = "/img/avatars/" + userData.avatar;

			req.data.userData = userData;

		} else req.data.empty = true;

		res.render('admin/userprofile', req.data);

	});

});

router.get(['/orders', '/orders/:s'], function(req, res) {

	var section = req.params.s, findOptions;

	var perPage = 20, page = req.query.p || 1; page *= 1;

	var sortArray = ["user.name", "amount", "cashback", "profit", "date", "status"];

	var sort = utils.sorting(sortArray, 5, req.query);

	if (!section) {

		req.data.title = 'Все заказы';

		findOptions = {};

	} else if (section === "wait") {

		req.data.title = ' Ожидающие заказы';

		findOptions = {status: 1};

	} else if (section === "accepted") {

		req.data.title = ' Одобренные заказы';

		findOptions = {status: 2};

	} else if (section === "rejected") {

		req.data.title = ' Отклоненые заказы';

		findOptions = {status: 3};

	}

	req.db.Orders.find(findOptions).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, orders) {

		req.db.Orders.count(findOptions).exec(function(err, count) {

			utils.pagination(page, perPage, count, req, res);

			if (orders && orders.length) {

				for (var i = 0; i < orders.length; i++) {

					var currencyOutput = " " + ((orders[i].currency === "USD") ? req.data.langs.currency_d : req.data.langs.currency_r);

					orders[i].cashback += currencyOutput;

					orders[i].amount += currencyOutput;

					orders[i].profit += currencyOutput;

					orders[i].date = utils.getDate(orders[i].date, 2);

				}

				req.data.orders = orders;

				res.render('admin/orders', req.data);

			} else {

				req.data.empty = true;

				res.render('admin/orders', req.data);

			}

		});

	});

});

router.get('/settings', function(req, res) {

	req.data.title = 'Настройки';

	res.render('admin/settings', req.data);

});

router.get('/logout', function(req, res) {

	res.clearCookie('admkey').redirect('/admin/auth');

});

var uploadFile = multer({storage: multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, './public/uploads/');

    }, filename: function (req, file, cb) {

        var ext = file.mimetype.split('/').pop();

        cb(null, "tmp_" + utils.getRandomInt(100, 999) + Date.now() + '.' + ext);

    }

})});

var uploadPicture = multer({storage: multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, './public/img/tmp/');

    }, filename: function (req, file, cb) {

        var ext = file.mimetype.split('/').pop();

        cb(null, "tmp_" + utils.getRandomInt(100, 999) + Date.now());

    }

})});

router.post('/api/newaffilnet', uploadPicture.array("picture"), function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.title || !data.website_id) return res.json({error: "Не заполнены все обязательные поля!"});

	if (!req.files || !req.files.length) return res.json({error: "Изображение не выбрано!"});

	var errorHandler = function(tmpFilePath) {

        fs.unlink(tmpFilePath, (err) => {

             if (err) console.log(err.toString());

             res.json({error: "Ошибка при загрузке изображения!"});

        });

    }

    utils.uploadPhoto({

      file: req.files[0],
      path: './public/img/affilnets/',
      newNamePrefix: 'affnet_'

    }, function(err, newFileName) {

		if (err) return res.json({error: true});

		var insertData = {

			title: data.title,

			picture: newFileName,

			websiteId: data.website_id

		};

	    db.Affilnets.insert(insertData, function(err, newData) {

	    	return res.json({success: "Новая партнерская сеть успешно добавлена!"});

		});

    });

});

router.post('/api/editaffilnet', uploadPicture.array("picture"), function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.title || !data.website_id || !data.affnet_id) return res.json({error: "Не заполнены все обязательные поля!"});

	req.db.Affilnets.findOne({_id: data.affnet_id}, function(err, affilData) {

		var updateData = {

			title: data.title,

			websiteId: data.website_id

		};

		if (req.files && req.files.length) {

			var uploadedFile = req.files[0];

			var errorHandler = function(tmpFilePath) {

		        fs.unlink(tmpFilePath, (err) => {

		             if (err) console.log(err.toString());

		             res.json({error: "Ошибка при загрузке изображения!"});

		        });

		    }

		    if (!affilData) return errorHandler(uploadedFile.path);

		    utils.uploadPhoto({

		      file: uploadedFile,
		      path: './public/img/affilnets/',
		      newNamePrefix: 'affnet_',
		      removeOldFile: affilData.picture || false

		    }, function(err, newFileName) {

				if (err) return res.json({error: true});

				updateData.picture = newFileName;

				db.Affilnets.update({_id: affilData._id}, {$set: updateData}, function(err) {

					return res.json({success: "Изменения успешно сохранены!"});

				});

		    });

		} else {

			if (!affilData) return res.json({error: "Партнерская сеть не найдена!"});

			db.Affilnets.update({_id: data.affnet_id}, {$set: updateData}, function(err) {

				return res.json({success: "Изменения успешно сохранены!"});

			});

		}

	});

});

router.get('/deleteaffilnet', function(req, res, next) {

	var db = req.db, affnetId = req.query.id;;

	if (!affnetId) return res.redirect('back');

	req.db.Affilnets.findOne({_id: affnetId}, function(err, affilData) {

		if (!affilData) return res.redirect('back');

		db.Affilnets.remove({_id: affnetId}, {}, function(err, numRemoved) {

			fs.unlink('./public/img/affilnets/' + affilData.picture, (err) => {

		        res.redirect('back');

		    });

		});

	});

});

router.post('/api/newshop', uploadPicture.array("picture"), function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.name || data.affilnet == 0 || !data.categories || !data.countries || !data.url || !data.cashback || !data.cashback_k || !data.average_time || !data.max_time || !data.desc_1 || !data.desc_2) return res.json({error: "Не заполнены все обязательные поля!"});

	if (!req.files || !req.files.length) return res.json({error: "Изображение магазина не выбрана!"});

	var errorHandler = function(tmpFilePath) {

        fs.unlink(tmpFilePath, (err) => {

             if (err) console.log(err.toString());

             res.json({error: "Ошибка при загрузке изображения!"});

        });

    }

    utils.uploadPhoto({

      file: req.files[0],
      path: './public/img/stores/',
      newNamePrefix: 'store_',
      width: 400,
      height: 130

    }, function(err, newFileName) {

		if (err) return res.json({error: true});

		var insertData = {

			name: data.name,

			affilnet: null,

			picture: newFileName,

			categories: data.categories,

			countries: data.countries,

			url: data.url,

			cashback: data.cashback + data.cashback_k,

			average_time: data.average_time*1,

			max_time: data.max_time*1,

			status: 1,

			profit: 0,

			purchases: 0,

			desc_1: data.desc_1,

			desc_2: data.desc_2,

			date: Date.now()

		};

		if (data.offer_id) insertData.offer_id = data.offer_id*1;

		if (typeof data.categories === "string") insertData.categories = [data.categories];

		if (typeof data.countries === "string") insertData.countries = [data.countries];

		req.db.Affilnets.findOne({_id: data.affilnet}, function(err, affnet) {

			if (affnet) insertData.affilnet = {_id: affnet._id, title: affnet.title};

			db.Stores.insert(insertData, function(err, newData) {

				return res.json({success: "Новый магазин успешно добавлен!"});

			}); 

		});

    });

});

router.post('/api/editshop', uploadPicture.array("picture"), function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.store_id || !data.name || !data.affilnet || !data.categories || !data.countries || !data.url || !data.cashback || !data.cashback_k || !data.average_time || !data.max_time || !data.desc_1 || !data.desc_2) return res.json({error: "Не заполнены все обязательные поля!"});

	req.db.Stores.findOne({_id: data.store_id}, function(err, storeData) {

		if (!storeData) return res.json({error: "Магазин не найден!"});

		var updateData = {

			name: data.name,

			categories: data.categories,

			countries: data.countries,

			url: data.url,

			cashback: data.cashback + data.cashback_k,

			average_time: data.average_time*1,

			max_time: data.max_time*1,

			desc_1: data.desc_1,

			desc_2: data.desc_2

		};

		if (data.offer_id) updateData.offer_id = data.offer_id*1;

		if (typeof data.categories === "string") updateData.categories = [data.categories];

		if (typeof data.countries === "string") updateData.countries = [data.countries];

		if (data.status == 1) updateData.status = 1;

		else if (data.status == 2) updateData.status = 2;

		req.db.Affilnets.findOne({_id: data.affilnet}, function(err, affnet) {

			if (affnet) updateData.affilnet = {_id: affnet._id, title: affnet.title};

			if (req.files && req.files.length) {

				var errorHandler = function(tmpFilePath) {

			        fs.unlink(tmpFilePath, (err) => {

			             if (err) console.log(err.toString());

			             res.json({error: "Ошибка при загрузке изображения"});

			        });

			    }

			    utils.uploadPhoto({

			      file: req.files[0],
			      path: './public/img/stores/',
			      newNamePrefix: 'store_',
			      width: 400,
			      height: 130,
			      removeOldFile: storeData.picture

			    }, function(err, newFileName) {

					if (err) return res.json({error: true});

					updateData.picture = newFileName;

					db.Stores.update({_id: data.store_id}, {$set: updateData}, function(err) {

						return res.json({success: "Изменения успешно сохранены!"});

					}); 

			    });

			} else {

				db.Stores.update({_id: data.store_id}, {$set: updateData}, function(err) {

					return res.json({success: "Изменения успешно сохранены!"});

				});

			}

		});

	});

});

router.get('/deleteshop', function(req, res, next) {

	var db = req.db, storeId = req.query.id;;

	if (!storeId) return res.redirect('back');

	req.db.Stores.findOne({_id: storeId}, function(err, storeData) {

		if (!storeData) return res.redirect('back');

		db.Stores.remove({_id: storeId}, {}, function(err, numRemoved) {

			fs.unlink('./public/img/stores/' + storeData.picture, (err) => {

		        res.redirect('back');

		    });

		});

	});

});

router.post('/api/newcategory', function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.category_name1 || !data.category_name2 || (!data.parent_category && !data.category_icon) || !data.category_desc_1 || !data.category_desc_2) return res.json({error: "Не заполнены все обязательные поля!"});

	var insertData = {

		name1: data.category_name1,
		name2: data.category_name2,
		icon: data.category_icon,
		desc_1: data.category_desc_1,
		desc_2: data.category_desc_2

	};

	if (data.parent_category) insertData.parentId = data.parent_category;

	if (data.category_metadesc) insertData.metadesc = data.category_metadesc;

	if (data.category_metakeys) insertData.metakeys = data.category_metakeys;

	db.Categories.insert(insertData, function(err, newData) {

		return res.json({success: "Новая категория успешно добавлена!"});

	});

});

router.post('/api/editcategory', function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.category_id || !data.category_name1 || !data.category_name2 || (!data.parent_category && !data.category_icon) || !data.category_desc_1 || !data.category_desc_2) return res.json({error: "Не заполнены все обязательные поля!"});

	var updateData = {

		name1: data.category_name1,
		name2: data.category_name2,
		icon: data.category_icon,
		desc_1: data.category_desc_1,
		desc_2: data.category_desc_2

	};

	if (data.parent_category) updateData.parentId = data.parent_category;

	if (data.category_metadesc) updateData.metadesc = data.category_metadesc;

	if (data.category_metakeys) updateData.metakeys = data.category_metakeys;

	/*
	db.Categories.findOne({_id: data.category_id}, function(err, category) {

		if (category.name3) {

			updateData.name1 = category.name2;

			updateData.name2 = category.name3;

			updateData.desc_1 = category.desc_2;

			updateData.desc_2 = category.desc_3;

		}

		db.Categories.update({_id: data.category_id}, {$set: updateData, $unset: {name3: true, desc_3: true}}, function(err) {

			return res.json({success: "Изменения успешно сохранены!"});

		});

	});
	*/

	db.Categories.update({_id: data.category_id}, {$set: updateData}, function(err) {

		return res.json({success: "Изменения успешно сохранены!"});

	});

});

router.get('/deletecategory', function(req, res, next) {

	var db = req.db, ctgrId = req.query.id;;

	if (!ctgrId) return res.redirect('back');

	db.Categories.remove({_id: ctgrId}, {}, function(err, numRemoved) {

		res.redirect('back');

	});

});

router.post('/api/edituser', function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.user_id || !data.name) return res.json({error: "Имя пользователя не должно быть пустым!"});

	if (data.name.length < 3) return res.json({error: "Имя пользователя должно содержать не менее 3 букв!"});

	data.balance *= 1; data.balance_r *= 1; data.hold *= 1; data.hold_r *= 1; 

  	var updateData = {name: utils.correctUserName(data.name) };

	updateData.email = data.email;

	if (data.country) updateData.country = (typeof data.country === "string") ? data.country : "";

	if (data.gender) {

		if (data.gender == 2) updateData.gender = 2;

		else if (data.gender == 1) updateData.gender = 1;

	}

	if (!isNaN(data.balance)) updateData.money = data.balance;

	if (!isNaN(data.balance_r)) updateData.money_r = data.balance_r;

	if (!isNaN(data.hold)) updateData.hold = data.hold;

	if (!isNaN(data.hold_r)) updateData.hold_r = data.hold_r;

	if (data.status) {

		if (data.status == 2) updateData.blocked = true;

		else if (data.status == 1) updateData.blocked = false;

	}

	if (data.account_type) {

		data.account_type *= 1;

		if (data.account_type === 4) updateData.status = 4;

		else if (data.account_type === 3) updateData.status = 3;

		else if (data.account_type === 2) updateData.status = 2;

		else if (data.account_type === 1) updateData.status = 1;

	}

	if (data.group) {

		data.group *= 1;

		if (data.group === 3) updateData.group = 3;

		else if (data.group === 2) updateData.group = 2;

		else if (data.group === 1) updateData.group = 1;

	}

	if (data.newpassword || data.rptpassword) {

		if (data.newpassword.length < 6) return res.json({error: "Пароль должен содержать не менее 6 символов!"});

		if (data.newpassword !== data.rptpassword) return res.json({error: "Пароли не совпадают!"});

		updateData.password = utils.md5(utils.md5(data.newpassword)).substr(0, 27);

	}

	db.Users.update({_id: data.user_id}, {$set: updateData}, function(err) {

		return res.json({success: "Изменения успешно сохранены!"});

	});

});

router.get('/deleteuser', function(req, res, next) {

	var db = req.db, userId = req.query.id;;

	if (!userId) return res.redirect('back');

	db.Users.remove({_id: userId}, {}, function(err, numRemoved) {

		res.redirect('back');

	});

});

router.get('/payouts', function(req, res) {

	req.data.title = 'Выплаты';

	var perPage = 30, page = req.query.p || 1; page *= 1;

	var sortArray = ["user.name", "method", "amount", "requisites", "date"];

	var sort = utils.sorting(sortArray, 5, req.query);

	req.db.Payouts.find({}).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, payouts) {

		if (err) return next(err);

		req.db.Payouts.count().exec(function(err, count) {

            if (err) return next(err);

            utils.pagination(page, perPage, count, req, res);

			if (count && payouts && payouts.length) {

				for (var i = 0; i < payouts.length; i++) {

					var currencyOutput = " " + ((payouts[i].currency === "USD") ? req.data.langs.currency_d : req.data.langs.currency_r);

					payouts[i].amount += currencyOutput;

					payouts[i].date = utils.getDate(payouts[i].date, 2);

				}

				req.data.payouts = payouts;

			} else req.data.empty = true;
			
			res.render('admin/payouts', req.data);

		});

	});

});

router.get('/approvepayout', function(req, res, next) {

	var db = req.db, payoutId = req.query.id;

	if (!payoutId) return res.redirect('back');

	db.Payouts.findOne({_id: payoutId}, function(err, payout) {

		if (!payout) return res.redirect('back');

		db.Payouts.update({_id: payoutId}, {$set: {status: 2}}, function(err) {

			db.Users.findOne({_id: payout.user._id}, function(err, user) {

				if (err || !user) return res.redirect('back');

				db.StateTotals.findOne({_id: "STATETOTALS"}, function(err, states) {

			        if (err || !states) return res.redirect('back');

			        var payoutKey = (payout.currency === "USD") ? "payout" : "payout_r";

			        states[payoutKey] = utils.toFixed((states[payoutKey] + payout.amount), 2);

			        var statesUpdateData = {};

			        statesUpdateData[payoutKey] = states[payoutKey];

			        db.StateTotals.update({_id: "STATETOTALS"}, {$set: statesUpdateData});

			        if (!user.notif_2) return res.redirect('back');

					var mailOptions = {

				        to: user.email,
				        html: 'payout',
	              		lang: user.notiflang || 1

				    }

				    var mailData = {

				        siteUrl: req.protocol + '://' + req.hostname,
				        siteName: req.data.configs.siteName,
				        userName: user.name,
				        payoutAmount: payout.amount,
				        payoutMethod: req.data.langs["paymethod_"+payout.method],
				        payoutRequisites: payout.requisites,
				        payoutCurrency: payout.currency

				    }
				      
				    utils.sendMail(mailOptions, mailData, function(resp) {

				        if (resp && !resp.success) console.log(resp);

				        return res.redirect('back');
				        
				    });

				});

			});

		});

	});

});

router.get('/rejectpayout', function(req, res, next) {

	var db = req.db, payoutId = req.query.id;

	if (!payoutId) return res.redirect('back');

	db.Payouts.findOne({_id: payoutId}, function(err, payout) {

		if (!payout) return res.redirect('back');

		db.Users.findOne({_id: payout.user._id}, function(err, user) {

			if (!user) return res.redirect('back');

			db.Payouts.update({_id: payoutId}, {$set: {status: 3}}, function() {

				var moneyKey = (payout.currency === "USD") ? "money" : "money_r";

				var payoutKey = (payout.currency === "USD") ? "payout" : "payout_r";

				var userUpdateData = {};

				userUpdateData[moneyKey] = utils.toFixed((user[moneyKey] + payout.amount), 2);

				userUpdateData[payoutKey] = utils.toFixed((user[payoutKey] - payout.amount), 2);

				db.Users.update({_id: payout.user._id}, {$set: userUpdateData}, function(err) {

					return res.redirect('back');

				});

			});

		});

	});
	
});

router.post('/api/settings', function(req, res) {

	var db = req.db, data = req.body, configs = req.data.configs;

	if (!data) return res.json({error: "Error!"});

	var updateData = {};

	if (data.sitename && data.sitename !== configs.siteName) updateData.siteName = data.sitename;

	if (data.metadescdefault && data.metadescdefault !== configs.metaDescDefault) updateData.metaDescDefault = data.metadescdefault;

	if (data.metakeysdefault && data.metakeysdefault !== configs.metaKeysDefault) updateData.metaKeysDefault = data.metakeysdefault;

	if (data.minpayout && data.minpayout*1 !== configs.minPayout) updateData.minPayout = data.minpayout*1;

	if (data.userprocent && data.userprocent*1 !== configs.userProcent) updateData.userProcent = data.userprocent*1;

	if (data.supportmail && data.supportmail !== configs.supportMail) updateData.supportMail = data.supportmail;

	if (data.accounttype2 && data.accounttype2*1 !== configs.getAccountType2) updateData.getAccountType2 = data.accounttype2*1;

	if (data.accounttype3 && data.accounttype3*1 !== configs.getAccountType3) updateData.getAccountType3 = data.accounttype3*1;

	if (data.accounttype4 && data.accounttype4*1 !== configs.getAccountType4) updateData.getAccountType4 = data.accounttype4*1;

	if (data.userProcentGrowth && data.userProcentGrowth*1 !== configs.userProcentGrowth) updateData.userProcentGrowth = data.userProcentGrowth*1;

	if (data.oldpassword || data.newpassword || data.newpassword2) {

		if (utils.md5(data.oldpassword) !== configs.adminKey) return res.json({error: "Указан неверный текущий пароль!"});

		if (data.newpassword.length < 6) return res.json({error: "Пароль должен содержать не менее 6 символов!"});

		if (data.newpassword !== data.newpassword2) return res.json({error: "Пароли не совпадают!"});

		updateData.adminKey = utils.md5(data.newpassword);

	}

	db.Configs.update({_id: "CONFIGS"}, { $set: updateData }, {}, function() {

		return res.json({success: "Изменения успешно сохранены!"});

	});

});

router.post('/api/getTurnoverStates', function(req, res) {

	var steatesDayLimit = 14;

	var date = new Date();

	date.setDate(date.getDate() - steatesDayLimit);

	var fromDay = utils.getDate(date.getTime(), false, true, "");

	req.db.StateDays.find({day: {$gte: fromDay}}, function(err, stateDays) {

		if (err) return res.json({error: "Error!"});

		var getDayItem = function(day) {

			for (var i = 0; i < stateDays.length; i++) {

				if (stateDays[i].day === day) return stateDays[i];

			}

			return {income: 0, income_r: 0, profit: 0, profit_r: 0};

		}

		var date = new Date();

		var today = utils.getDate(date.getTime(), false, true, "");

		var todayStateDay = getDayItem(today);

		var todayData = {

			y: (date.getMonth() + 1) + '.' + date.getDate(),
			a: todayStateDay.income,
			b: todayStateDay.profit

		};

		var todayData_r = {

			y: todayData.y,
			a: todayStateDay.income_r,
			b: todayStateDay.profit_r

		};

		var dataList = [todayData], dataList_r = [todayData_r];

		for (var i = steatesDayLimit-1; i > 0; i--) {

			date.setDate(date.getDate() - 1);

			var day = utils.getDate(date.getTime(), false, true, "");

			var stateDay = getDayItem(day);

			var dayData = {

				y: (date.getMonth() + 1) + '.' + date.getDate(),
				a: stateDay.income,
				b: stateDay.profit

			};

			var dayData_r = {

				y: dayData.y,
				a: stateDay.income_r,
				b: stateDay.profit_r

			};

			dataList.unshift(dayData);

			dataList_r.unshift(dayData_r);

		}

    	return res.json([dataList, dataList_r]);

    });

});

router.get('/discounts', function(req, res) {

	req.data.title = 'Акции и скидки';

	var discounts = req.data.configs.discounts;

	for (var i = 0; i < discounts.length; i++) {

		if (discounts[i].endDate) discounts[i].endDate = utils.getDate(discounts[i].endDate, 2, true);

	}

	req.data.discounts = discounts;

	res.render('admin/discounts', req.data);

});

router.post('/api/discount_switch', function(req, res) {

	var db = req.db, data = req.body, discounts = req.data.configs.discounts;

	var discountId = data.discount_id, action = data.discount_switch;

	if (!discountId || !action) return res.redirect("back");

	discountId *= 1;

	if (action === "on") {

		if (!data.discount_enddate) return res.redirect("back");

		var endDate = data.discount_enddate.split(".");

		if (!endDate.length) return res.redirect("back");

		var correctEndDate = endDate[1]+"/"+endDate[0]+"/"+endDate[2];

		correctEndDate = new Date(correctEndDate).getTime();

		if (correctEndDate < Date.now()) return res.redirect("back");

		discounts[discountId-1].endDate = correctEndDate;

		discounts[discountId-1].status = 1;

	} else if (action === "off") {

		discounts[discountId-1].endDate = 0;

		discounts[discountId-1].status = 0;

	}

	db.Configs.update({_id: "CONFIGS"}, { $set: {discounts: discounts} }, {}, function() {

		return res.redirect("back");

	});

});

router.get('/products', function(req, res) {

	req.data.title = 'Товары';

	var perPage = 20, page = req.query.p || 1; page *= 1;

	var sortArray = ["store.name", "price", "cashback", "purchases", "profit", "date", "status"];

	var sort = utils.sorting(sortArray, 6, req.query);

	req.db.Products.find({}).sort(sort).skip((perPage * page) - perPage).limit(perPage).exec(function(err, products) {

		if (err) return next(err);

		req.db.Products.count().exec(function(err, count) {

			if (err) return next(err);

            utils.pagination(page, perPage, count, req, res);

            if (req.error) {

            	req.data.title = 'Error 404';

				return res.status(404).render('admin/error', req.data);

            }

			if (count && products && products.length) {

				for (var i = 0; i < products.length; i++) {

					if (!products[i].cashback) products[i].cashback = products[i].store.cashback;

					products[i].cashback = utils.getCaskbackOutput(products[i].cashback, req.data, 100);

					products[i].currency = (products[i].currency === "RUB") ? req.data.langs.currency_r : req.data.langs.currency_d;

					if (products[i].picture.substr(0, 4) !== "http") products[i].picture = "/img/products/" + products[i].picture;

					products[i].date = utils.getDate(products[i].date, 2);

				}

				req.data.products = products;

			} else req.data.empty = true;

			res.render('admin/products', req.data);

		});

	});

});

router.get('/newproduct', function(req, res) {

	req.data.title = 'Добавить новый товар';

	req.db.Stores.find({}, function(err, stores) {

		if (stores && stores.length) {

			req.data.stores = stores;

		}

		req.db.Categories.find({}, function(err, categories) {

			if (categories && categories.length) {

				var createCategories = utils.createCategories(categories, req.data.lang);

				req.data.categories = createCategories.list;

			}

			req.data.countries = utils.getAllCountriesList(false, req.data.admlang, 1);

			res.render('admin/newproduct', req.data);

		});

	});

});

router.get('/editproduct', function(req, res) {

	var productId = req.query.id;

	req.data.title = 'Редактировать товар';

	req.db.Products.findOne({_id: productId}, function(err, product) {

		req.db.Stores.find({}, function(err, stores) {

			if (stores && stores.length) {

				req.data.stores = stores;

			}

			req.db.Categories.find({}, function(err, categories) {

				if (categories && categories.length) {

					var createCategories = utils.createCategories(categories, req.data.lang);

					req.data.categories = createCategories.list;

				}

				if (product) {

					product.cashback_k = (product.cashback) ? product.cashback.substr(-1) : product.store.cashback.substr(-1);

					if (product.cashback) {

						product.cashback = product.cashback.slice(0, -1);

					} else {

						product.store.cashback = product.store.cashback.slice(0, -1);

					}

					req.data.product = product;

					req.data.countries = utils.getAllCountriesList(product.countries, req.data.admlang, 1);

				} else req.data.empty = true;

				res.render('admin/editproduct', req.data);

			});

		});

	});

});

router.post('/api/newproduct', uploadPicture.array("picture"), function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.name || !data.categories || !data.countries || !data.price || !data.price_currency || !data.url) return res.json({error: "Не заполнены все обязательные поля!"});

	if (!req.files || !req.files.length) return res.json({error: "Изображение товара не выбрана!"});

	var errorHandler = function(tmpFilePath) {

        fs.unlink(tmpFilePath, (err) => {

             if (err) console.log(err.toString());

             res.json({error: "Ошибка при загрузке изображения!"});

        });

    }

    utils.uploadPhoto({

      file: req.files[0],
      path: './public/img/products/',
      newNamePrefix: 'product_',
      width: 200,
      height: 200

    }, function(err, newFileName) {

		if (err) return res.json({error: true});

		var insertData = {

			name: data.name,

			store: null,

			picture: newFileName,

			categories: data.categories,

			countries: data.countries,

			price: data.price*1,

			currency: data.price_currency,

			url: data.url,

			status: 1,

			profit: 0,

			purchases: 0,

			desc_1: data.desc_1 || "",

			desc_2: data.desc_2 || "",

			date: Date.now()

		};

		if (typeof data.categories === "string") insertData.categories = [data.categories];

		if (typeof data.countries === "string") insertData.countries = [data.countries];

		if (data.cashback) insertData.cashback = data.cashback + data.cashback_k;

		req.db.Stores.findOne({_id: data.store}, function(err, store) {

			if (store) {

				insertData.store = {_id: store._id, name: store.name};

				if (!insertData.cashback) insertData.store.cashback = store.cashback;

			}

			db.Products.insert(insertData, function(err, newData) {

				return res.json({success: "Новый товар успешно добавлен!"});

			});
	        
		});

    });

});

router.post('/api/editproduct', uploadPicture.array("picture"), function(req, res) {

	var db = req.db, data = req.body;

	if (!data || !data.product_id || !data.name || !data.store || !data.categories || !data.countries || !data.url || !data.price || !data.price_currency) return res.json({error: "Не заполнены все обязательные поля!"});

	req.db.Products.findOne({_id: data.product_id}, function(err, productData) {

		if (!productData) return res.json({error: "Магазин не найден!"});

		var updateData = {

			name: data.name,

			categories: data.categories,

			countries: data.countries,

			url: data.url,

			price: data.price*1,

			currency: data.price_currency,

			desc_1: data.desc_1,

			desc_2: data.desc_2

		};

		if (typeof data.categories === "string") updateData.categories = [data.categories];

		if (typeof data.countries === "string") updateData.countries = [data.countries];

		updateData.cashback = (data.cashback) ? data.cashback + data.cashback_k : "";

		if (data.status == 1) updateData.status = 1;

		else if (data.status == 2) updateData.status = 2;

		req.db.Stores.findOne({_id: data.store}, function(err, store) {

			if (store) {

				updateData.store = {_id: store._id, name: store.name};

				if (!updateData.cashback) updateData.store.cashback = store.cashback;

			}

			if (req.files && req.files.length) {

				var errorHandler = function(tmpFilePath) {

			        fs.unlink(tmpFilePath, (err) => {

			             if (err) console.log(err.toString());

			             res.json({error: "Ошибка при загрузке изображения"});

			        });

			    }

			    utils.uploadPhoto({

			      file: req.files[0],
			      path: './public/img/products/',
			      newNamePrefix: 'product_',
			      width: 200,
			      height: 200,
			      removeOldFile: productData.picture

			    }, function(err, newFileName) {

					if (err) return res.json({error: true});

					updateData.picture = newFileName;

					db.Products.update({_id: data.product_id}, {$set: updateData}, function(err) {

						return res.json({success: "Изменения успешно сохранены!"});

					});

			    });

			} else {

				db.Products.update({_id: data.product_id}, {$set: updateData}, function(err) {

					return res.json({success: "Изменения успешно сохранены!"});

				});

			}

		});

	});

});

router.get('/deleteproduct', function(req, res, next) {

	var db = req.db, productId = req.query.id;;

	if (!productId) return res.redirect('back');

	req.db.Products.findOne({_id: productId}, function(err, productData) {

		if (!productData) return res.redirect('back');

		db.Products.remove({_id: productId}, {}, function(err, numRemoved) {

			fs.unlink('./public/img/products/' + productData.picture, (err) => {

		        res.redirect('back');

		    });

		});

	});

});

router.get('/import_products', function(req, res) {

	req.data.title = 'Импорт товаров';

	res.render('admin/import_products', req.data);

});

router.post('/import_products', uploadFile.array("import_file"), function(req, res) {

	var data = req.body, files = req.files;

	var errorHandler = function(tmpFilePath) {

        fs.unlink(tmpFilePath, (err) => {

             if (err) console.log(err.toString());

             res.json({error: "Ошибка при загрузке файла!"});

        });

    }

	if (!data || data.import_type != 1 || !files[0]) return res.json({error: "Произошла ошибка!"});

	var file = files[0], type = data.import_type*1;

	var deleteOldImport = (data.import_delold && data.import_delold === "on") ? 1 : 0;

	var ext = file.mimetype.split('/').pop();

	if (ext !== "json") return errorHandler(file.path);

	var products = require("." + file.destination + file.filename).offer;

	if (!products.length) return errorHandler(file.path);

	var categories = require('../database/import_categories_' + type + '.json').category;

	var importItemData = [

		{
			storeId: ((req.data.test) ? "pxMBLOt23sdfpKo2h4kTJ" : "UXN7QBKNfLKzYyqE"),

			storeName: "Aliexpress"

		}

	];

	var getCategory = function(categoryId) {

		for (var i = 0; i < categories.length; i++) {

			if (categories[i].id === categoryId) return categories[i]._id;

		}

		return "";

	}

	for (var i = 0; i < products.length; i++) {

		var data = products[i];

		if (!data.title || !data.image || !data.price || !data.commissionRate) continue;

		var endDate = new Date(data.endDate);

		var insertData = {

			importId: type,

			name: data.title,

			store: {_id: importItemData[type-1].storeId, name: importItemData[type-1].storeName},

			picture: data.image,

			categories: [getCategory(data.categoryId)],

			countries: ["all"],

			oldPrice: data.oldprice*1,

			price: data.price*1,

			currency: "USD",

			discount: data.discount,

			url: data.url,

			cashback: data.commissionRate,

			status: 1,

			profit: 0,

			purchases: 0,

			desc_1: data.desc_1 || "",

			desc_2: data.desc_2 || "",

			endDate: endDate.getTime(),

			date: Date.now()

		};

		req.db.Products.insert(insertData);

		//if (i === 10000) break;

	}

	fs.unlink(file.path, (err) => {

        if (err) console.log(err.toString());

        var lsTime = Date.now() - 60000;

        if (deleteOldImport) req.db.Products.remove({importId: type, date: {$lt: lsTime}}, {multi: true});

        res.json({success: "Товары успешно импортированы!"});

    });

});

module.exports = router;
