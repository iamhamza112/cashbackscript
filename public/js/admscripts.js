$(document).ready(function() {

    var adminApp = {

        configs: {

            openedNotification: false,

            menuIsOpened: false

        },

        timeouts: {}

    };

    adminApp.getCookie = function(name) {

        var cookies = document.cookie.split(';');

        for(var i=0 ; i < cookies.length ; ++i) {

            var pair = cookies[i].trim().split('=');

            if (pair[0] == name) return pair[1];
            
        }

        return null;

    };

    adminApp.setCookie = function(c_name, value, expiredays) {

        var exdate = new Date();

        exdate.setDate(exdate.getDate()+expiredays);

        document.cookie = c_name+ "=" +escape(value)+
        ((expiredays==null) ? "" : ";expires="+exdate.toUTCString())+
        ";path=/";

    }

    adminApp.deleteCookie = function(name, path, domain) {

        if ( adminApp.getCookie( name ) ) document.cookie = name + '=' +
        ( ( path ) ? ';path=' + path : '') +
        ( ( domain ) ? ';domain=' + domain : '' ) +
        ';expires=Thu, 01-Jan-1970 00:00:01 GMT'; 
        
    }

    //=======================================================
    // Notifications Functions
    //=======================================================

    adminApp.notifications = function(show, id, overlayTransparent, notClickable) {

        if (!id && !adminApp.configs.openedNotification) return;

        if (!id) id = adminApp.configs.openedNotification;

        var deepOverlay = $("#deepOverlay");

        var notification = $("#notifs").children("div[data-id="+id+"]");

        if (show) {

            adminApp.closeOpenedNotification();

            adminApp.configs.openedNotification = id;

            deepOverlay.addClass("show");

            if (overlayTransparent) deepOverlay.addClass("transparent");

            if (notClickable) deepOverlay.addClass("notclickable");

            notification.addClass("show");

        } else {

            adminApp.configs.openedNotification = false;

            deepOverlay.attr("class", "deep_overlay");

            notification.removeClass("show");

        }

    }

    adminApp.closeOpenedNotification = function() {

        if (adminApp.configs.openedNotification) {

            /*if (adminApp.configs.openedNotification === "messages") adminApp.closeMessages();*/

            adminApp.notifications(false);

        }

    }

    $('body').on("click", "#deepOverlay:not(.notclickable)", function() {

        adminApp.closeOpenedNotification();

        return false;

    });

    $("#notifs").on("click", "#closeWindow", function() {

        adminApp.closeOpenedNotification();

        return false;

    }); 

    //=======================================================
    // Info Bar Function
    //=======================================================

    adminApp.showInfoBar = function(type, text, infoBarId, timeout) {

        var infoBarIndex = "#infoBar";

        if (infoBarId) infoBarIndex += ("." + infoBarId);

        var extraClass = type; // success/error/info

        if (!timeout) timeout = 7000;

        var infoBar = $(infoBarIndex);

        if (adminApp.timeouts.showInfoBar) {

            adminApp.timeouts.showInfoBarCallback(0);

            clearTimeout(adminApp.timeouts.showInfoBar);

            delete adminApp.timeouts.showInfoBar, adminApp.timeouts.showInfoBarCallback;

        }

        infoBar.html(text).addClass(extraClass).slideDown("fast");

        infoBar.scrollintoview();

        adminApp.timeouts.showInfoBarCallback = function(slideSpeed) {

            infoBar.slideUp(slideSpeed, function() {

                $(this).removeClass(extraClass);

            });

        }

        adminApp.timeouts.showInfoBar = setTimeout(function() {

            adminApp.timeouts.showInfoBarCallback("fast");

        }, timeout);

    }

    $("body").on("touchstart", "#infoBar", function() {

        if (!$(this).is(":visible") || !adminApp.timeouts.showInfoBar || !adminApp.timeouts.showInfoBarCallback) return false;

        adminApp.timeouts.showInfoBarCallback("fast");

        clearTimeout(adminApp.timeouts.showInfoBar);

        delete adminApp.timeouts.showInfoBar, adminApp.timeouts.showInfoBarCallback;

        return false;

    });

    adminApp.dropdownMenu = function(el, toggler, callback) {

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

    $("#profileNav").on("click", "#profileLink", function() {

        var dropdownMenu = $("#profileDropdown");

        adminApp.dropdownMenu(dropdownMenu, $(this));

        return false;

    });

    $("#header").on("click", "#adminOpenMenu", function() {

        //$("#sidebar").addClass("open");

        return false;

    });

    $("#mainContent").on("submit", "#adminSettings", function(event) {

        $(this).ajaxSubmit({

            success: function(res) {

                if (res && res.error) return adminApp.showInfoBar("error", res.error);

                return adminApp.showInfoBar("success", res.success);
                
            }

        });

        return false;

    });

    $("#mainContent").on("submit", "#form", function(event) {

        var button = $(this).find("button[type=submit]");

        $(this).ajaxSubmit({

            beforeSubmit: function() {

                button.prop('disabled', true).addClass("loading");

            },

            success: function(res) {

                button.prop('disabled', false).removeClass("loading");

                if (res && res.error) return adminApp.showInfoBar("error", res.error);

                return adminApp.showInfoBar("success", res.success);
                
            }

        });

        return false;

    });

    $("#mainContent").on("click", "#deleteUser", function() {

        var userId = $(this).data("id");

        $("#userDeleteConfirmValue").attr("href", "/admin/deleteuser?id="+userId);

        adminApp.notifications(true, "userDeleteConfirm");

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

                    $("#profileImage").children("img").attr("src", res.image);

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

    $("#header").on("click", "#adminOpenMenu", function() {

        var menu = $("#sidebar"), deepOverlay = $("#deepOverlay");

        var closeMenu = function() {

            adminApp.menuIsOpened = false;

            deepOverlay.removeClass("show");

            menu.removeClass("d_block");

        }

        if (!adminApp.menuIsOpened) {

            adminApp.menuIsOpened = true;

            deepOverlay.addClass("show");

            menu.addClass("d_block");

            deepOverlay.one('swipeleft, click', function() {

                closeMenu();

            });

        } else {

            closeMenu();

        }

        return false

    });

    //=======================================================
    // BB Tags
    //=======================================================

    adminApp.insertBbTag = function(element, start, end) {

        var selection = element.textrange();

        if (selection.text) {

            element.focus();

            element.textrange('replace', start + selection.text + end);

        } else if (selection.start || selection.start === 0) {

            element.focus();

            var startPos = selection.start;

            var endPos = selection.end;

            var value = element.val().substring(0, startPos) + start + element.val().substring(startPos, endPos) + end + element.val().substring(endPos, element.val().length);

            element.val(value);

        } else {

            element.val(element.val() + start + end);

        }

        //console.log(selection)

    }

    $("body").on("click", "#bbTags > button", function() {

        var buttonId = attribs = $(this).data("alt");

        buttonId = buttonId.replace(/\[.*\]/, '');

        if (/\[.*\]/.test(attribs)) attribs = attribs.replace(/.*\[(.*)\]/, ' $1');

        else attribs = '';

        var textarea = $(this).parent().next();

        var start = '['+buttonId+attribs+']';

        var end = '[/'+buttonId+']';

        adminApp.insertBbTag(textarea, start, end);

        return false;

    });

    $("#switchBoardControl").on("click", "li:not(.selected)", function() {

        var index = $(this).index();

        var area = $("#switchBoard").children(".switchboard_area").eq(index);

        $("#switchBoardControl").children("li.selected").removeClass("selected");

        $(this).addClass("selected");

        $("#switchBoard").children(".switchboard_area.show").removeClass("show");

        area.addClass("show");

        return false

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

        var currLang = adminApp.getCookie("admlang");

        if (newLang != currLang) adminApp.setCookie("admlang", newLang, 365);

        window.location.reload();

        return false

    });

    //=======================================================
    // Parent Categories on Change
    //=======================================================

    $("#form").on("change", "#parentCategories", function() {

        var value = $(this).val();

        var element = $("#categoryFaIcon");

        if (value == 0) element.slideDown("fast");

        else element.slideUp("fast");

        return false;

    });

    //=======================================================
    // Import Json Products
    //=======================================================

    $("#form").on("click", "#importButton", function(e) {

        e.preventDefault();

        $("#importFile").click();

    });

    $("#form").on("change", "#importFile", function() {

        $(this).submit();

        return false;

    });

    //=======================================================
    // Sorting
    //=======================================================

    adminApp.sorting = function() {

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


    adminApp.sorting();
    
    $('select').select2({ minimumResultsForSearch: Infinity, width: '' });

    $('[data-toggle="datepicker"]').datepicker({format: 'dd.mm.yyyy'});

});