$(document).ready(function() {

    var app = {

        configs: {

            openedNotification: false

        },

        timeouts: {},

        user: null

    };

    app.getRandomInt = function(min, max) {

        return Math.floor(Math.random() * (max - min + 1)) + min;
      
    }

    app.getCookie = function(name) {

        var cookies = document.cookie.split(';');

        for(var i=0 ; i < cookies.length ; ++i) {

            var pair = cookies[i].trim().split('=');

            if (pair[0] == name) return pair[1];
            
        }

        return null;

    };

    app.setCookie = function(c_name, value, expiredays) {

        var exdate = new Date();

        exdate.setDate(exdate.getDate()+expiredays);

        document.cookie = c_name+ "=" +escape(value)+
        ((expiredays==null) ? "" : ";expires="+exdate.toUTCString())+
        ";path=/";

    }

    app.deleteCookie = function(name, path, domain) {

        if ( app.getCookie( name ) ) document.cookie = name + '=' +
        ( ( path ) ? ';path=' + path : '') +
        ( ( domain ) ? ';domain=' + domain : '' ) +
        ';expires=Thu, 01-Jan-1970 00:00:01 GMT'; 
        
    }

    //=======================================================
    // Notifications Functions
    //=======================================================

    app.notifications = function(show, id, overlayTransparent, notClickable) {

        if (!id && !app.configs.openedNotification) return;

        if (!id) id = app.configs.openedNotification;

        var deepOverlay = $("#deepOverlay");

        var notification = $("#notifs").children("div[data-id="+id+"]");

        if (show) {

            app.closeOpenedNotification();

            app.configs.openedNotification = id;

            deepOverlay.addClass("show");

            if (overlayTransparent) deepOverlay.addClass("transparent");

            if (notClickable) deepOverlay.addClass("notclickable");

            notification.addClass("show");

        } else {

            app.configs.openedNotification = false;

            deepOverlay.attr("class", "deep_overlay");

            notification.removeClass("show");

        }

    }

    app.closeOpenedNotification = function() {

        if (app.configs.openedNotification) {

            if (app.configs.openedNotification === "messages") app.closeMessages();

            else if (app.configs.openedNotification === "profileMenu") app.closeProfileMenu();

            else app.notifications(false);

        }

    }

    $(document).on("click", "#deepOverlay:not(.notclickable)", function() {

        app.closeOpenedNotification();

        return false;

    });

    $("#notifs").on("click", "#closeWindow", function() {

        app.closeOpenedNotification();

        return false;

    }); 

    //=======================================================
    // Info Bar Function
    //=======================================================

    app.showInfoBar = function(type, text, infoBarId, timeout) {

        var infoBarIndex = "#infoBar";

        if (infoBarId) infoBarIndex += ("." + infoBarId);

        var extraClass = type; // success/error/info

        if (!timeout) timeout = 7000;

        var infoBar = $(infoBarIndex);

        if (app.timeouts.showInfoBar) {

            app.timeouts.showInfoBarCallback(0);

            clearTimeout(app.timeouts.showInfoBar);

            delete app.timeouts.showInfoBar, app.timeouts.showInfoBarCallback;

        }

        infoBar.html(text).addClass(extraClass).slideDown("fast");

        infoBar.scrollintoview();

        app.timeouts.showInfoBarCallback = function(slideSpeed) {

            infoBar.slideUp(slideSpeed, function() {

                $(this).removeClass(extraClass);

            });

        }

        app.timeouts.showInfoBar = setTimeout(function() {

            app.timeouts.showInfoBarCallback("fast");

        }, timeout);

    }

    $("body").on("touchstart", "#infoBar", function() {

        if (!$(this).is(":visible") || !app.timeouts.showInfoBar || !app.timeouts.showInfoBarCallback) return false;

        app.timeouts.showInfoBarCallback("fast");

        clearTimeout(app.timeouts.showInfoBar);

        delete app.timeouts.showInfoBar, app.timeouts.showInfoBarCallback;

        return false;

    });

    $("header").on("click", "#profileLink", function() {

        var dropdown = $("#profileDropdown");

        app.dropdownMenu(dropdown, $(this));

        return false;

    });

    app.dropdownMenu = function(el, toggler, callback) {

        var dropdownMenu = el;

        toggler.addClass("active");

        if (callback) callback();

        if (dropdownMenu.is(":visible")) {

            toggler.removeClass("active");

            dropdownMenu.slideUp("fast");

            return false;

        }

        dropdownMenu.slideDown("fast", function() {

            $("body").off("click").one('click', function() {

                if (dropdownMenu.is(":visible")) {

                    toggler.removeClass("active");

                    if (callback) callback();

                    dropdownMenu.slideUp("fast");

                }

            });
            
        });

    }

    app.openAuthLogin = function() {

        var authElement = $("#notifs").children(".notif_auth");

        if (authElement.hasClass("register")) authElement.removeClass("register")

        app.notifications(true, "authentification");

    }

    app.openAuthRegister = function() {

        var authElement = $("#notifs").children(".notif_auth");

        if (!authElement.hasClass("register")) authElement.addClass("register")

        app.notifications(true, "authentification");

    }

    $(document).on("click", "#signinButton", function() {

        app.openAuthLogin();

        return false;

    });

    $(document).on("click", "#signupButton", function() {

        app.openAuthRegister();

        return false;

    });

    /*app.getCountry = function(callback, ip) {

        var getLink = "https://ipapi.co/" + ip + "/json/";

        //if (ip) getLink += ip;

        $.getJSON(getLink, function(data) {

            var country = data.country || false;

            callback(country);

        });

    }*/

    //=======================================================
    // Authorization
    //=======================================================

    app.getSocialData = function(token, callback) {

        var getLink = "//ulogin.ru/token.php?host=" + encodeURIComponent(location.toString()) + "&token=" + token + "&callback=?";

        $.getJSON(getLink, function(data) {

            data = $.parseJSON(data.toString());

            if (data.error) return;

            callback(data);

        });

    }

    window.socialAuth = function(token) {

        if (app.user) return;

        app.getSocialData(token, function(socialData) {

            $.ajax({

                type: "POST",

                url: "/api/socialAuthorization",
                
                data: JSON.stringify(socialData),

                contentType: "application/json; charset=utf-8",

                dataType: "json",

                success: function(data) {

                    if (!data || data.error) {

                        if (!data) data = {error: "Error! 2"};

                        app.showInfoBar("error", data.error, "signin");

                        return;

                    }

                    app.setCookie("authkey", data.authKey, 30);

                    window.location.href = "/profile";

                },

                failure: function(errMsg) {

                    app.showInfoBar("error", errMsg, "signin");

                }

            });
        
        });
    
    }

    $("#signinForm").on("submit", function() {

        // if !sigend return false

        var sentData = {

            email: $("#signinEmail").val(),

            password: $("#signinPassword").val()

        }

        $.ajax({

            type: "POST",

            url: "/api/authorization",
            
            data: JSON.stringify(sentData),

            contentType: "application/json; charset=utf-8",

            dataType: "json",

            success: function(data) {

                if (!data || data.error) {

                    if (!data) data = {error: "Error! 2"};

                    app.showInfoBar("error", data.error, "signin");

                    return;

                }

                app.setCookie("authkey", data.authKey, 30);

                window.location.href = "/profile";

            },

            failure: function(errMsg) {

                app.showInfoBar("error", errMsg, "signin");

            }

        });

        return false;

    });

    $("#signupForm").on("submit", function() {

        // if !sigend return false

        var sentData = {

            email: $("#signupEmail").val(),

            name: $("#signupName").val(),

            password: $("#signupPassword").val(),

            password2: $("#signupPassword2").val()

        }

        $.ajax({

            type: "POST",

            url: "/api/registration",
            
            data: JSON.stringify(sentData),

            contentType: "application/json; charset=utf-8",

            dataType: "json",

            success: function(data) {

                if (!data || data.error) {

                    if (!data) data = {error: "Error! 2"};

                    app.showInfoBar("error", data.error, "signin");

                    return;

                }

                app.setCookie("authkey", data.authKey, 30);

                window.location.href = "/profile";

            },

            failure: function(errMsg) {

                app.showInfoBar("error", errMsg, "signin");

            }

        });

        return false;

    });

    //=======================================================
    // Change Photo Submit
    //=======================================================

    $("#mainContent").on("mouseover", "#profileImage:not(.notover)", function() {

        $("#changePhotoBut").addClass('show');

    }).on("mouseout", "#profileImage:not(.notover)", function() {

        $("#changePhotoBut").removeClass('show');

    });

    $("#mainContent").on("click", "#changePhotoBut", function(e) {

        e.preventDefault();

        $("#photoFile").click();

    });

    $("#mainContent").on("change", "#photoFile", function() {

        //console.log("change");

        $("#changePhotoForm").submit();

        return false;

    });

    $("#mainContent").on("submit", "#changePhotoForm", function(event) {

        var profileImage = $("#profileImage");

        var photo = profileImage.children("img");

        var loader = $("#photoLoader");

        $(this).ajaxSubmit({

            beforeSubmit: function() {

                $("#changePhotoBut").removeClass('show');

                profileImage.addClass("notover");

                loader.addClass("show");

                photo.addClass("notvisible");

            },

            success: function(res) {

                if (res.image) {

                    photo.attr("src", res.image);

                    if (res.itsMe) $("#profileLink").children("img").attr("src", res.image);

                }

                profileImage.removeClass("notover");

                loader.removeClass("show");

                photo.removeClass("notvisible");
                
            },

            error: function(xhr) {

                profileImage.removeClass("notover");

                loader.removeClass("show");

                photo.removeClass("notvisible");

                console.log('Error: ' + xhr.status);

            }

        });

        return false;

    });

    $("#payoutMethods").on("click", "button", function() {

        var id = $(this).data("id");

        var action = $(this).data("action");

        var method = $(this).data("method");

        var requisites = $(this).data("requisites");

        var currency = $(this).data("currency");

        var currency_lang = $(this).data("currency_lang");

        var money = $(this).data("money");

        if (action === "requisite") {

            app.notifications(true, "requisite_" + id);

        } else if (action === "payout") {

            $("#payoutNotifInfoId").val(id);

            $("#payoutNotifInfoMethod").text(method);

            $("#payoutNotifInfoRequisites").text(requisites);

            $("#payoutNotifInfoCurrency").val(currency);

            $("#payoutNotifInfoCurrencyLang").text(currency_lang);

            $("#payoutNotifInfoMoney").val(money);

            app.notifications(true, "payout");

        }

        return false;

    });

    $("#payoutRequisites").on("click", "button", function() {

        var id = $(this).data("id");

        app.notifications(true, "requisite_" + id);

        return false;

    });

    //=======================================================
    // Change Language
    //=======================================================

    $("#openFlags").on("click", ".current", function() {

        $(this).removeClass('current');

        $(this).addClass('opened');

        var neighbours = $("#openFlags").children("div").not(this);

        $.each(neighbours, function(i, val) {

            $(this).css("right", (i+1)*56);

        });

        return false

    });

    $("#openFlags").on("click", ".opened", function() {

        $(this).removeClass('opened');

        $(this).addClass('current');

        var neighbours = $("#openFlags").children("div").not(this);

        $.each(neighbours, function(i, val) {

            $(this).css("right", 0);

        });

        return false

    });

    $("#openFlags").on("click", "div:not(.opened, .current)", function() {

        var newLang = $(this).data("id");

        var currLang = app.getCookie("lang");

        if (newLang != currLang) app.setCookie("lang", newLang, 365);

        window.location.reload();

        return false

    });

    $("#changeUserSettings").on("submit", function() {

        $(this).ajaxSubmit({

            success: function(res) {

                if (res && res.error) return app.showInfoBar("error", res.error, "user_settings");

                return app.showInfoBar("success", res.success, "user_settings");
                
            }

        });

        return false;

    });

    //=======================================================
    // BB Tags
    //=======================================================

    app.insertBbTag = function(start, end) {

        var element = document.getElementById('bbTags').nextElementSibling;

        if (document.selection) {

            element.focus();

            sel = document.selection.createRange();

            sel.text = start + sel.text + end;

        } else if (element.selectionStart || element.selectionStart == '0') {

            element.focus();

            var startPos = element.selectionStart;

            var endPos = element.selectionEnd;

            element.value = element.value.substring(0, startPos) + start + element.value.substring(startPos, endPos) + end + element.value.substring(endPos, element.value.length);
            
        } else {

            element.value += start + end;

        }

    }

    $("#bbTags").children("button").click(function() {

        var button_id = attribs = $(this).attr("alt");

        button_id = button_id.replace(/\[.*\]/, '');

        if (/\[.*\]/.test(attribs)) { attribs = attribs.replace(/.*\[(.*)\]/, ' $1'); } else attribs = '';

        var start = '['+button_id+attribs+']';

        var end = '[/'+button_id+']';

        app.insertBbTag(start, end);

        return false;

    });

    //=======================================================
    // Right Menu Children System
    //=======================================================

    $("#rightMenu").on("click", "#openChildMenu", function() {

        var childMenu = $(this).next("ul");

        var arrow = $(this).children("i");

        childMenu.slideToggle("fast");

        arrow.toggleClass("rotate");

        return false

    });

    $("header").on("click", "#openMenuMobile", function() {

        var toggler = $(this);

        var horizontalMenu = $("#horizontalMenu");

        horizontalMenu.slideToggle("fast", function() {

            if (toggler.hasClass('active')) toggler.removeClass('active');

            else {

                toggler.addClass('active');

                $("body").off("click").one('click', function() {

                    if (horizontalMenu.is(":visible")) {

                        toggler.removeClass("active");

                        horizontalMenu.slideUp("fast");

                    }

                });

            }

        });

        return false;

    });

    $("#mainContent").on("click", "#goTo:not(.activated)", function() {

        var urlString = $(this).attr("href");

        var url = new URL(urlString);

        var type = url.searchParams.get("subid2");

        var id = url.searchParams.get("subid1");

        $.ajax({

            type: "POST",

            url: "/api/goToActivate",
            
            data: JSON.stringify({id: id, type: type}),

            contentType: "application/json; charset=utf-8",

            dataType: "json",

            success: function(data) {

                if (!data || data.error) {

                    if (!data || !data.error) data = {error: "Error!"};

                    app.showInfoBar("error", data.error);

                    return;

                }

                if (type == 1) {

                    $("#goTo").removeClass("btn_danger").addClass("btn_success activated");

                } else if (type == 2) {

                    $("#goTo[data-id="+id+"]").removeClass("btn_secondary").addClass("btn_success activated");

                }

            },

            failure: function(errMsg) {

                app.showInfoBar("error", errMsg);

            }

        });

    });

    if ($(".toggle_list .toggle_title").hasClass('active')) {

        $(".toggle_list .toggle_title.active").closest('.toggle_list').find('.toggle_inner').show();

    }

    $(".toggle_list .toggle_title").click(function() {

        if ($(this).hasClass('active')) {

            $(this).removeClass("active").closest('.toggle_list').find('.toggle_inner').slideUp(200);

        } else {

            $(this).addClass("active").closest('.toggle_list').find('.toggle_inner').slideDown(200);

        }

    });

    //=======================================================
    // Sorting
    //=======================================================

    app.sorting = function() {

        var sortCols = $("table thead.sortable tr").children("th").not(".nosort");

        var sortColsLength = sortCols.length;

        if (!sortColsLength) return;

        var urlParams = new URLSearchParams(window.location.search);

        var index, reverse = (urlParams.has('reverse')) ? 1 : 0;

        if (urlParams.has('sort')) index = urlParams.get('sort')*1;

        if (reverse === 1) urlParams.delete('reverse');

        if (!urlParams.has('sort')) urlParams.set('sort', 1);

        if (urlParams.has('p')) urlParams.delete('p');

        $.each(sortCols, function(i, value) {

            var text = $(this).text();

            if (!text) return;

            var setArrow = '';

            if (!index && $(this).hasClass("defsort")) index = i + 1;

            urlParams.set('sort', i+1);

            if (index === i+1) {

                setArrow = (reverse === 1) ? ' class="sort_down"' : ' class="sort_up"';

                if (reverse === 0) urlParams.append('reverse', 1);

            } else {

                if (reverse === 0 && urlParams.has('reverse')) urlParams.delete('reverse');

            }

            var newHtml = '<a href="' + window.location.pathname + '?' + urlParams.toString() + '"' + setArrow + '>' + text + '</a>';

            $(this).html(newHtml);

        });

    }


    app.sorting();

    $('select').select2({ minimumResultsForSearch: Infinity, width: '' });

});

var socialAuth;