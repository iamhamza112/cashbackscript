const express = require('express');

const router = express.Router();

const utils = require('../models/utils.js');

const fs = require('fs');

const multer = require('multer');

const request = require('request');

var actionRequests = {

	inProcess: false,

	requests: []

}

router.post('/socialAuthorization', function(req, res) {

  var db = req.db, data = req.body;

  if (!data || !data.uid || req.data.user) return res.json({error: "Error!"});

  db.Users.findOne({'uid' : data.uid}, function(err, dataUser) {

    if (err) return res.json({error: "Error!"});

    if (dataUser) {

        // -------------------------------------------------------
        // LOG IN ------------------------------------------------
        // -------------------------------------------------------

        return utils.userSignIn(dataUser, res, db);

    } else {

        // -------------------------------------------------------
        // REGISTER ----------------------------------------------
        // -------------------------------------------------------

        var date = new Date(), time = date.getTime();

        dataUser = {

          name: data.first_name,
          regDate: time,
          logDate: time,
          group: 1,
          socNet: data.network,
          socPage: data.profile,
          uid: data.uid,
          country: req.data.country,
          status: 1,
          money: 0,
          money_r: 0,
          hold: 0,
          hold_r: 0,
          payout: 0,
          payout_r: 0,
          purchases: 0,
          notif_1: 1,
          notif_2: 1,
          notiflang: req.data.lang

        };

        if (data.photo_big && typeof data.photo_big === "string") dataUser.avatar = data.photo_big.replace("http:", "https:");

        if (data.sex) dataUser.gender = data.sex*1;

        //if (data.bdate) dataUser.birthday = data.bdate;

        if (data.last_name !== undefined) dataUser.name += ' ' + data.last_name;

        dataUser.name = utils.correctUserName(dataUser.name);

        if (data.email) {

          dataUser.email = data.email;

          if (data.verified_email != 1) {

            dataUser.noverified = utils.getRandomInt(10000, 99999) + Date.now();

            var mailOptions = {

              to: dataUser.email,
              html: 'activation',
              lang: req.data.lang

            }

            var mailData = {

              siteUrl: req.protocol + '://' + req.hostname,
              siteName: req.data.configs.siteName,
              userName: dataUser.name,
              activateCode: dataUser.noverified


            }
            
            utils.sendMail(mailOptions, mailData, function(resp) {

              if (resp && !resp.success) console.log(resp);
              
            });

          }

        } else {

          var mailOptions = {

            to: dataUser.email,
            html: 'registration',
            lang: req.data.lang

          }

          var mailData = {

            siteUrl: req.protocol + '://' + req.hostname,
            siteName: req.data.configs.siteName,
            userName: dataUser.name,
            supportMail: req.data.configs.supportMail


          }
          
          utils.sendMail(mailOptions, mailData, function(resp) {

            if (resp && !resp.success) console.log(resp);
            
          });

        }

        db.Users.insert(dataUser, function (err, newUser) {

          if (err) return res.json({error: "Error!"});

          return utils.userSignIn(newUser, res, db);

        });

      }

  });

});

router.post('/authorization', function(req, res) {

  var db = req.db, data = req.body;

  if (!data || !data.email || !data.password || req.data.user) return res.json({error: "Error!"});

  var password = utils.md5(utils.md5(data.password)).substr(0, 27);

  db.Users.findOne({'email' : data.email, 'password': password}, function(err, dataUser) {

      if (err) return res.json({error: "Error!"});

      if (!dataUser) return res.json({error: req.data.langs.error_user_not_found});

      return utils.userSignIn(dataUser, res, db);

  });

});

router.post('/registration', function(req, res) {

  var db = req.db, data = req.body;

  if (!data || !data.email || !data.name || !data.password || !data.password2 || req.data.user) return res.json({error: "Error!"});

  db.Users.findOne({'email' : data.email}, function(err, dataUser) {

      if (err) return res.json({error: err});

      if (dataUser) return res.json({error: req.data.langs.error_email_already_registered});

      if (data.name.length < 3) return res.json({error: req.data.langs.error_name_more_than});

      if (data.password.length < 6) return res.json({error: req.data.langs.error_password_more_than});

      if (data.password !== data.password2) return res.json({error: req.data.langs.error_passwords_donot_mutch});

      var nowTime = Date.now();

      var password = utils.md5(utils.md5(data.password)).substr(0, 27);

      dataUser = {

        email: data.email,
        password: password,
        regDate: nowTime,
        logDate: nowTime,
        group: 1,
        country: req.data.country,
        status: 1,
        money: 0,
        money_r: 0,
        hold: 0,
        hold_r: 0,
        payout: 0,
        purchases: 0,
        notif_1: 1,
        notif_2: 1,
        notiflang: req.data.lang,
        noverified: utils.getRandomInt(10000, 99999) + Date.now()

      };

      dataUser.name = utils.correctUserName(data.name);

      var mailOptions = {

        to: dataUser.email,
        html: 'activation',
        lang: req.data.lang

      }

      var mailData = {

        siteUrl: req.protocol + '://' + req.hostname,
        siteName: req.data.configs.siteName,
        userName: dataUser.name,
        activateCode: dataUser.noverified


      }
      
      utils.sendMail(mailOptions, mailData, function(resp) {

        if (resp && !resp.success) console.log(resp);
        
      });

      db.Users.insert(dataUser, function (err, newUser) {

        if (err) return res.json({error: "Error!"});

        return utils.userSignIn(newUser, res, db);

      });

  });

});


var uploadPhoto = multer({storage: multer.diskStorage({

  destination: function (req, file, cb) {

      cb(null, './public/img/tmp/');

  }, filename: function (req, file, cb) {

      var ext = file.mimetype.split('/').pop();

      cb(null, "tmp_" + utils.getRandomInt(100, 999) + Date.now());

  }

})});

router.post('/changePhoto', uploadPhoto.array("photo"), function(req, res, next) {

  var errorHandler = function(tmpFilePath) {

      fs.unlink(tmpFilePath, (err) => {

           if (err) console.log(err.toString());

           res.json({error: true});

      });

  }

  if (!req.files || !req.files.length) return res.json({error: true});

  var userId = req.body.user_id || false, db = req.db, file = req.files[0];

  if (!req.data.user) return errorHandler(file.path);

  var userEditor = req.data.user;

  var userEditingId = (userId && userEditor.group === 3 && userEditor._id !== userId) ? userId : userEditor._id;

  var itsMe = (userEditor._id === userEditingId) ? true : false;

  db.Users.findOne({_id: userEditingId}, function(err, userEditing) {

    if (err || !userEditing) return errorHandler(file.path);

    utils.uploadPhoto({

      file: file,
      path: './public/img/avatars/',
      width: 300,
      height: 300,
      removeOldFile: (userEditing.avatar && userEditing.avatar.substr(0, 4) !== "http") ? userEditing.avatar : false

    }, function(err, newFileName) {

      if (err) return res.json({error: true});

      db.Users.update({'_id' : userEditingId}, {$set: {avatar: newFileName}}, function() {

        res.json({itsMe: itsMe, image: "/img/avatars/" + newFileName});

      });

    });

  });

});

router.post('/profile_settings', function(req, res) {

  /*
  notif_1 - cashback to hold
  notif_2 - payout
  */

  var db = req.db, data = req.body;

  if (!data || !data.name) return res.json({error: req.data.langs.error_name_mustnot_be_empty});

  if (data.name.length < 3) return res.json({error: req.data.langs.error_name_more_than});

  var updateData = { name: utils.correctUserName(data.name) };

  if (data.gender) {

    if (data.gender == 2) updateData.gender = 2;

    else if (data.gender == 1) updateData.gender = 1;

  }

  updateData.notif_1 = (data.notif_1 && data.notif_1 === "on") ? 1 : 0;

  updateData.notif_2 = (data.notif_2 && data.notif_2 === "on") ? 1 : 0;

  if (data.notiflang) {

    if (data.notiflang == 1) updateData.notiflang = 1;

    else if (data.notiflang == 2) updateData.notiflang = 2;

  }

  if (data.oldpassword || data.newpassword || data.rptpassword) {

    if (req.data.user.password) {

      var oldpassword = (data.oldpassword) ? utils.md5(utils.md5(data.oldpassword)).substr(0, 27) : false;

      if (oldpassword !== req.data.user.password) return res.json({error: req.data.langs.error_old_password_incorrect});

    }

    if (data.newpassword.length < 6) return res.json({error: req.data.langs.error_password_more_than});

    if (data.newpassword !== data.rptpassword) return res.json({error: req.data.langs.error_passwords_donot_mutch});

    updateData.password = utils.md5(utils.md5(data.newpassword)).substr(0, 27);

  }

  db.Users.update({_id: req.data.user._id}, {$set: updateData}, function(err) {

    return res.json({success: req.data.langs.success_user_data_edit});

  });

});

router.post('/requisite', function(req, res) {

  var db = req.db, data = req.body, user = req.data.user;

  if (!data || !data.id || !data.requisite) return res.redirect("back");

  var requisiteName; data.id *= 1;

  for (var i = 0; i < req.data.configs.payoutSystems.length; i++) {

    if (req.data.configs.payoutSystems[i].id === data.id) {

      requisiteName = req.data.configs.payoutSystems[i].name; break;

    }

  }

  if (!requisiteName || (data.id === 5 && !data.requisite_2)) return res.redirect("back");

  var updateData = (user.requisites || {});

  updateData[requisiteName] = (data.requisite_2) ? {val_1: data.requisite, val_2: data.requisite_2} : data.requisite;

  db.Users.update({_id: user._id}, {$set: {requisites: updateData}}, function() {

    return res.redirect("back");

  });

});

router.post('/payout', function(req, res) {

  var db = req.db, data = req.body, user = req.data.user;

  console.log(data);

  if (!user || !data || !data.id || !data.amount || !data.currency) return res.redirect("back");

  if (data.currency !== "USD" && data.currency !== "RUB") return res.redirect("back");

  var payoutMethod; data.amount *= 1; data.id *= 1;

  var amount = utils.toFixed(data.amount, 2);

  var moneyKey = (data.currency === "USD") ? "money" : "money_r";

  var payoutKey = (data.currency === "USD") ? "payout" : "payout_r";

  var minPayoutKey = (data.currency === "USD") ? "minPayout" : "minPayout_r";

  if (user[moneyKey] < amount || amount < req.data.configs[minPayoutKey]) return res.redirect("back");

  for (var i = 0; i < req.data.configs.payoutSystems.length; i++) {

    if (req.data.configs.payoutSystems[i].id === data.id) {

      payoutMethod = req.data.configs.payoutSystems[i].name; break;

    }

  }

  if (!payoutMethod) return res.redirect("back");

  var userRequisites = user.requisites[payoutMethod];

  if (!userRequisites) return res.redirect("back");

  var userUpdateData = {};

  userUpdateData[moneyKey] = utils.toFixed((user[moneyKey] - amount), 2);

  userUpdateData[payoutKey] = utils.toFixed((user[payoutKey] + amount), 2);

  var insertData = {

    user: {_id: user._id, name: user.name},

    method: payoutMethod,

    requisites: userRequisites,

    amount: amount,

    currency: data.currency,

    date: Date.now(),

    status: 1

  };

  db.Users.update({_id: user._id}, {$set: userUpdateData}, function() {

    db.Payouts.insert(insertData, function() {

      res.redirect("/profile/payouts");

    });

  });

});

router.post('/goToActivate', function(req, res) {

  var db = req.db, data = req.body, user = req.data.user;

  var id = data.id, type = data.type;

  if (!user || !id || !type || (type != 1 && type != 2)) return res.json({error: "Error!"});

  var activeKey = (type == 1) ? "activeStores" : "activeProducts";

  if (!user[activeKey]) user[activeKey] = [id];

  else if (user[activeKey].indexOf(id) === -1) user[activeKey].push(id);

  else return res.json({success: true});

  var updateData = {};

  updateData[activeKey] = user[activeKey];

  db.Users.update({_id: user._id}, {$set: updateData}, function() {

    res.json({success: true});

  });

});

router.post('/affilnetOfferStatus', function(req, res) {

  var db = req.db, data = req.body;

  var offer_id = data.offer_id, offer_status = data.offer_status;

  if (!offer_id || !offer_status) return res.end();

  db.Stores.findOne({offer_id: offer_id*1}, function(err, store) {

    if (err || !store) return res.end();

    var updateData = {};

    if (offer_status === "denied" || offer_status === "disabled" || offer_status === "dead") updateData.status = 2;

    else if (offer_status === "active") updateData.status = 1;

    db.Stores.update({_id: store._id}, {$set: updateData});

  });

});

router.post('/affilnetActionStatus', function(req, res) {

  var data = req.body, configs = req.data.configs;

  console.log("-------- action start ---------");
  console.log(data);
  console.log(actionRequests);
  console.log("-------------------------------");

  var doRequest = function(data, req, res) {

    /*------ post data ------
    offer_id - ID партнёрской программы
    website_id - ID площадки
    order_id - ID заказа в партнерской сети
    subid - User Id
    subid1 - Store/Product Id
    subid2 - type 1/2 [store/product]
    status - Статус платежа
    income - Сумма вашего заработка
    currency - Валюта программы
    order_sum - Сумма заказа
    country_code - Код страны в формате RU / UA / US
    type = Тип действия lead/sale
    ------------------------*/

    var db = req.db, /*data = req.body,*/ configs = req.data.configs;

    actionRequests.inProcess = true;

    var errorHandler = function(error) {

      console.log("Error #", error);

      endRequest();

    }

    var endRequest = function() {

      if (actionRequests.requests.length) {

          var requestData = actionRequests.requests.shift();

          doRequest(requestData, req, res);

      } else {

        actionRequests.inProcess = false;

        res.end();

      }

    }

    var userId = data.subid, id = data.subid1, type = data.subid2*1, status = data.payment_status;

    //---------------------------------------------------------------------------------------- TODO

    if (status && status !== "new" && status !== "processing" && userId && !id && !type) {

      var oldSubidsList = ["RQjV8e43H2rQByv8", "kSVKw7K0YTaCQmzX", "BQ14N6pPLkv0Svqt", "tMVpf8x8Gkoenur9", "D3E5qfr2cZjArWRw", "ctTpRQ3JAQO0tcA5", "NqUwVnjTvUhEkZ2o", "wqv1fLQMYib64Wf7", "gpQCb0Eu0DYEgoUQ", "b89T3Rg7wcURh0eZ", "jTKr737PWvnztQVm", "HCxRlqOUacFVyNC3", "tsSQLKOqkX7cbUMD", "uyxYHtX84MypUert", "SpbZowoYvRt0TNRv", "uQ4t4j7QZEN96tdW"];

      if (oldSubidsList.indexOf(userId) !== -1) {

        userId = "mdmvNVcDdmngHXlA";

        id = "67Hm7OPbctziAJeT";

        type = 1;

      }

    }

    //---------------------------------------------------------------------------------------- TODO

    var order_sum = data.order_sum*1, income = data.payment_sum*1, currency = data.currency.toUpperCase(), affilnetOrderId = data.order_id;

    if (!data.website_id || !userId || !id || (type !== 1 && type !== 2) || !status || !order_sum || !income || !currency || !affilnetOrderId || (data.type && data.type !== "sale") || (currency !== "USD" && currency !== "RUB")) return errorHandler(0);

    db.Affilnets.findOne({websiteId: data.website_id}, function(err, affilnet) {

      if (err || !affilnet) return errorHandler(1);

      db.Users.findOne({_id: userId}, function(err, user) {

        if (err || !user) return errorHandler(2);

        var dbKey = (type === 1) ? "Stores" : "Products";

        db[dbKey].findOne({_id: id}, function(err, dbItem) {

          if (err || !dbItem) return errorHandler(4);

          var store, product;

          if (type === 1) store = dbItem;

          else product = dbItem;

          var storeId = (store) ? store._id : product.store._id;

          db.Orders.findOne({affilnetOrderId: affilnetOrderId}, function(err, order) {

            db.Stores.findOne({_id: storeId}, function(err, store) {

              if (err || !store) return errorHandler(5);

              db.StateTotals.findOne({_id: "STATETOTALS"}, function(err, states) {

                if (err || !states) return errorHandler(6);

                var todayKey = utils.getDate(false, false, true, "");

                //var todayKey = utils.getDate(data.action_time*1000, false, true, ""); //test

                db.StateDays.findOne({day: todayKey}, function(err, todayStates) {

                  if (err) return errorHandler(7);

                  var moneyKey = (currency === "USD") ? "money" : "money_r";

                  var holdKey = (currency === "USD") ? "hold" : "hold_r";

                  var profitKey = (currency === "USD") ? "profit" : "profit_r";

                  var incomeKey = (currency === "USD") ? "income" : "income_r";

                  var payoutKey = (currency === "USD") ? "payout" : "payout_r";

                  var updateUserData = {}, storeUpdateData = {}, productUpdateData = {}, updateOrderData = {}, statesUpdateData = {};

                  order_sum = utils.toFixed(order_sum, 2);

                  income = utils.toFixed(income, 3);

                  // get cashback discount if exists

                  var discountProcent = 0;

                  if (user.status !== 1 || user.purchases !== 0) req.data.discounts[0] = 0;

                  for (var j = 0; j < req.data.discounts.length; j++) {

                    discountProcent = req.data.discounts[j];

                    if (discountProcent !== 0) break;

                  }

                  var userPocentAdd = (user.status - 1) * configs.userProcentGrowth;

                  var userProfitProcent = configs.userProcent + userPocentAdd;

                  if (discountProcent > 0) userProfitProcent += utils.toFixed(userProfitProcent * discountProcent / 100);

                  if (userProfitProcent > 100) userProfitProcent = 100;

                  var userProfit = utils.toFixed((income * userProfitProcent / 100), 2);

                  var ourProfit = utils.toFixed((income - userProfit), 3);

                  console.log("Income:", income);

                  console.log("userProfitProcent:", userProfitProcent);

                  console.log("userProfit:", userProfit);

                  console.log("ourProfit:", ourProfit);

                  console.log("--------- action end ----------");

                  if ((status === "new" || status === "processing") && !order) {

                    var activeKey = (type === 1) ? "activeStores" : "activeProducts";

                    if (user[activeKey].indexOf(id) === -1) return errorHandler(3);

                    var insertData = {

                      user: {_id: user._id, name: user.name},

                      store: {_id: store._id, name: store.name, picture: store.picture},

                      cashback: userProfit,

                      profit: ourProfit,

                      currency: currency,

                      amount: order_sum,

                      affilnetOrderId: affilnetOrderId,

                      //date: (data.action_time*1000 || Date.now()), //test

                      date: Date.now(),

                      status: 1

                    };

                    if (data.country_code) insertData.country = data.country_code;

                    db.Orders.insert(insertData);

                    //----------------------------

                    updateUserData[holdKey] = utils.toFixed((user[holdKey] + userProfit), 2);

                    updateUserData.purchases = user.purchases + 1;

                    // change user status

                    var userProfitUsd = (currency === "USD") ? userProfit : (userProfit / configs.defaultRateRurUsd);

                    var totalMoneyUsd = utils.toFixed((user.hold + user.money + user.payout + ((user.hold_r + user.money_r + user.payout_r) / configs.defaultRateRurUsd)), 2);

                    if (user.status < 4 && (totalMoneyUsd + userProfitUsd) >= configs["getAccountType"+(user.status+1)]) {

                      updateUserData.status = user.status + 1;

                    }

                    //-------------------

                    storeUpdateData.purchases = store.purchases + 1;

                    storeUpdateData[profitKey] = utils.toFixed((store[profitKey] + ourProfit), 3);

                    /*--------- update product data ----------*/

                    if (product) {

                      productUpdateData.purchases = product.purchases + 1;

                      productUpdateData[profitKey] = utils.toFixed((product[profitKey] + ourProfit), 3);

                      db.Products.update({_id: product._id}, {$set: productUpdateData});

                    }

                    /*--------- update states ----------*/

                    statesUpdateData[incomeKey] = utils.toFixed((states[incomeKey] + income), 3);

                    statesUpdateData[profitKey] = utils.toFixed((states[profitKey] + ourProfit), 3);

                    if (todayStates) {

                      var todayStatesUpdateData = {};

                      todayStatesUpdateData[incomeKey] = utils.toFixed((todayStates[incomeKey] + income), 3);

                      todayStatesUpdateData[profitKey] = utils.toFixed((todayStates[profitKey] + ourProfit), 3);

                      db.StateDays.update({_id: todayStates._id}, {$set: todayStatesUpdateData});

                    } else {

                      var todayStatesInsertData = {

                        day: todayKey,
                        income: 0,
                        profit: 0,
                        income_r: 0,
                        profit_r: 0

                      };

                      todayStatesInsertData[incomeKey] = income;

                      todayStatesInsertData[profitKey] = ourProfit;

                      db.StateDays.insert(todayStatesInsertData);

                    }

                    /*-------- send e-mail notification --------*/

                    if (user.notif_1) {

                      var mailOptions = {

                        to: user.email,
                        html: 'cashback_to_hold',
                        lang: user.notiflang || 1

                      }

                      var mailData = {

                        siteUrl: req.protocol + '://' + req.hostname,
                        siteName: configs.siteName,
                        userName: user.name,
                        userProfit: userProfit,
                        currency: currency


                      }
                      
                      utils.sendMail(mailOptions, mailData, function(resp) {

                        if (resp && !resp.success) console.log(resp);

                        //return errorHandler(8);
                        
                      });

                    }

                    db.Users.update({_id: user._id}, {$set: updateUserData}, function(err) {

                          db.Stores.update({_id: store._id}, {$set: storeUpdateData}, function(err) {

                              db.StateTotals.update({_id: "STATETOTALS"}, {$set: statesUpdateData}, function(err) {

                                  endRequest();
                                  
                              });

                          });

                      });

                  } else if (status === "approved" && order && order.status === 1) {

                    updateOrderData.status = 2;

                    updateUserData[holdKey] = utils.toFixed((user[holdKey] - order.cashback), 2);

                    updateUserData[moneyKey] = utils.toFixed((user[moneyKey] + order.cashback), 2);

                    db.Users.update({_id: user._id}, {$set: updateUserData}, function(err) {

                      db.Orders.update({_id: order._id}, {$set: updateOrderData}, function(err) {

                          endRequest();

                      });

                    });

                  } else if ((status === "declined" || status === "rejected") && order && order.status === 1) {

                    updateOrderData.status = 3;

                    updateOrderData.profit = 0;

                    updateUserData[holdKey] = utils.toFixed((user[holdKey] - order.cashback), 2);

                    storeUpdateData.purchases = store.purchases - 1;

                    storeUpdateData[profitKey] = utils.toFixed((store[profitKey] - ourProfit), 3);

                    /*--------- update product data ----------*/

                    if (product) {

                      productUpdateData.purchases = product.purchases - 1;

                      productUpdateData[profitKey] = utils.toFixed((product[profitKey] - ourProfit), 3);

                      db.Products.update({_id: product._id}, {$set: productUpdateData});

                    }

                    /*--------- update states ----------*/

                    statesUpdateData[incomeKey] = utils.toFixed((states[incomeKey] - income), 3);

                    statesUpdateData[profitKey] = utils.toFixed((states[profitKey] - income + order.cashback), 3);

                    var orderDay = utils.getDate(order.date, false, true, "");

                    db.StateDays.findOne({day: orderDay}, function(err, orderStateDay) {

                      if (err || !orderStateDay) return;

                      var orderDayStatesUpdateData = {};

                      orderDayStatesUpdateData[incomeKey] = utils.toFixed((orderStateDay[incomeKey] - income), 3);

                      orderDayStatesUpdateData[profitKey] = utils.toFixed((orderStateDay[profitKey] - income + order.cashback), 3);

                      db.StateDays.update({_id: orderStateDay._id}, {$set: orderDayStatesUpdateData}, function(err) {

                          db.Users.update({_id: user._id}, {$set: updateUserData}, function(err) {

                              db.Orders.update({_id: order._id}, {$set: updateOrderData}, function(err) {

                                  db.Stores.update({_id: store._id}, {$set: storeUpdateData}, function(err) {

                                      db.StateTotals.update({_id: "STATETOTALS"}, {$set: statesUpdateData}, function(err) {

                                          endRequest();
                                          
                                      });

                                  });

                              });

                          });

                      });

                    });

                  } else if (status === "pending" && order && order.status === 2) {

                    updateOrderData.status = 1;

                    updateUserData[moneyKey] = utils.toFixed((user[moneyKey] - order.cashback), 2);

                    updateUserData[holdKey] = utils.toFixed((user[holdKey] + order.cashback), 2);

                    db.Users.update({_id: user._id}, {$set: updateUserData}, function(err) {

                      db.Orders.update({_id: order._id}, {$set: updateOrderData}, function(err) {

                          endRequest();

                      });

                    });
                    
                  } else endRequest();

                  /*if (Object.keys(updateUserData).length) db.Users.update({_id: user._id}, {$set: updateUserData});

                  if (Object.keys(storeUpdateData).length) db.Stores.update({_id: store._id}, {$set: storeUpdateData});

                  if (Object.keys(productUpdateData).length) db.Products.update({_id: product._id}, {$set: productUpdateData});

                  if (Object.keys(updateOrderData).length) db.Orders.update({_id: order._id}, {$set: updateOrderData});

                  if (Object.keys(statesUpdateData).length) db.StateTotals.update({_id: "STATETOTALS"}, {$set: statesUpdateData});

                  res.end();*/

                });

              });

            });

          });

        });

      });

    });
    
  }

  if (actionRequests.inProcess) actionRequests.requests.push(data);

  else doRequest(data, req, res);

});

router.post('/getStatesGraphic', function(req, res) {

  req.db.Orders.find({"user._id": req.data.user._id, $or: [{status: 1}, {status: 2}]}).sort({date: -1}).exec(function(err, orders) {

    if (err || !orders) return res.json({error: "Error!"});

    var statesDayLimit = req.query.l || 7;

    var date = new Date();

    var dataList = [], profitsArray = {};

    for (var j = 0; j < orders.length; j++) {

      var order = orders[j];

      if (order.date < (date.getTime() - statesDayLimit*24*3600000)) break;

      var dayKey = ((order.currency === "USD") ? "d" : "r") + utils.getDate(order.date, false, true, "");

      profitsArray[dayKey] = (profitsArray[dayKey]) ? utils.toFixed((profitsArray[dayKey] + order.cashback), 2) : order.cashback;

    }

    for (var i = 0; i < statesDayLimit; i++) {

      date.setDate(date.getDate() - ((i===0) ? 0 : 1));

      var keyDay = utils.getDate(date.getTime(), false, true, "");

      var keyUsd = "d" + keyDay, keyRub = "r" + keyDay;

      dataList.unshift({

        y: (date.getMonth() + 1) + '.' + date.getDate(),
        a: (profitsArray[keyUsd] || 0),
        b: (profitsArray[keyRub] || 0),

      });

    }

      return res.json(dataList);

    });

});


module.exports = router;