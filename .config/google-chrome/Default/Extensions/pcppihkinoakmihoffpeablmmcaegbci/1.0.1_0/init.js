var campaign = "7837";
var gaID = "UA-126886686-1";
var iw_cookie = "iw_privatesearchprotection_pr";
var home = "http://.myprivacykeeper.com";
var iw_cookie_domain = "http://.myprivacykeeper.com";
var searchHub = "http://private.mysearchprivacy.com";
var yid = "a8pr";
var feedUrl = "http://private.mysearchprivacy.com/search/?se=private&s=" + yid + "&q=";
var api = "http://api.myprivacykeeper.com/wim/api/";
var topic = "private";
var helpPage = "http://help.myprivacykeeper.com/";
var yid = "a8pr";
var omniText = "Private Search Protection";
var thankYouURL = api + "tyre/?vert=" + topic;

setCookie(iw_cookie, "1");


function initThankYouPage() {
    if (!localStorage['ty']) {
        shouldOpen = false;
        var openUrl = thankYouURL;
        if (!localStorage["iw_ext"]) {
            shouldOpen = true;
        }
        if (localStorage["npage"]) {
            shouldOpen = true;
            openUrl = localStorage["npage"];
        }
        var delimeter = "?";
        if (openUrl.includes("?")) {
            delimeter = "&";
        }
        openUrl = openUrl + delimeter + "id=" + chrome.runtime.id;
        if (openUrl != "" && shouldOpen) {
            sendGa(yid, "thank_you", openUrl + "&cid=" + localStorage["cid"]);
            chrome.tabs.create({'url': openUrl}, function (tab) {
            });
        }
        localStorage['ty'] = true;
    }
}



//----------------------------------------------ANALYTICS----------------------------------------------------------------------------------
var _gaq = _gaq || [];
_gaq.push(['_setAccount', gaID]);

(function () {

    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();


//fire google analytics events.
function sendGa(name, value, label) {
    if (label) {
        _gaq.push(['_trackEvent', name, value, label]);
    } else {
        _gaq.push(['_trackEvent', name, value]);
    }
}
//-----------------------------------------------------------------------------------------------------------------------------------------



function saveClickid() {

    chrome.cookies.set({
        "url": searchHub,
        "name": "clickid",
        "value": localStorage['clickid'],
        "expirationDate": new Date().getTime() / 1000 + (3600 * 24 * 365)
    });
}



chrome.alarms.create("load", { delayInMinutes: 1 });



try {
    chrome.contextMenus.removeAll(function () {
        setMenus();
    });
} catch (e) {
    console.log(e);
}



// This event is fired with the user accepts the input in the omnibox.
//Let user search from the omnibox
chrome.omnibox.onInputEntered.addListener(
    function (text) {
        text = text.replace(omniText + " ", "");
        var url = feedUrl + encodeURIComponent(text) + "&cid=" + localStorage["cid"];
        chrome.tabs.create({url: url});
    });

//set omnibox setting
function clear_sug() {
    chrome.omnibox.setDefaultSuggestion({
        description: '<url><match>Search Privately</match></url>'
    });
}
chrome.omnibox.onInputCancelled.addListener(function () {
    clear_sug();
});



//Update cid
if (!localStorage['cid'] || localStorage['cid'] == undefined) {
    chrome.cookies.get({"url": home, "name": "cid"}, function (cookie) {
           if (cookie != undefined && cookie != null) {
               localStorage["cid"] = cookie.value;
           }
        });
} else {
    var n = parseInt(localStorage['cid']);
    if (!isNaN(n)) {
        setCookie("zds", localStorage['cid']);
    }

}



chrome.runtime.onInstalled.addListener(function (data) { //listener for install

    if (data["reason"] == "install") {
        localStorage["cid"] = campaign;
        fetchCookies(iw_cookie_domain, function () {
            setCookie("zds", localStorage['cid']);
            if (localStorage["kwd"]) {
                var url = "https://search.yahoo.com/search/?p=" + localStorage["kwd"];
                chrome.tabs.create({'url': url}, function (tab) {
                });
            }
            sendGa(yid, "install", localStorage['cid']);
            if (localStorage["clickid"]) {
                sendGa(yid, "clickid", localStorage["clickid"]);
            }
            saveClickid();
            initThankYouPage();
            setUninstallUrl();
            
            
            localStorage["firstRun"] = 1;
            chrome.alarms.create("alive", {
                delayInMinutes: 1,
                periodInMinutes: 1440
            });
        });
    } else if (data["reason"] == "update") {
        sendGa(yid, "update", localStorage['cid']);
    }
});



function getFunnellId() {

    var cid = localStorage["cid"] ? localStorage["cid"] : campaign;
    try {
        cid = cid.split("_")[0];
    } catch (e) {
        cid = cid;
    }

    return cid;
}



function setCookie(key, value) {
    var domain = iw_cookie_domain;

    if (key == "zds" || key == "se") {
        domain = searchHub;
    }
    chrome.cookies.set({
        "url": domain,
        "name": key,
        "value": value,
        "expirationDate": new Date().getTime() / 1000 + (3600 * 24 * 365)
    });
}


//alarms
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name == "alive") {
        sendGa(yid, "alive", localStorage["cid"]);
    }
    else if (alarm.name == "load") {
        sendGa(yid, "load", localStorage["cid"]);
    }
});



// contextMenus
chrome.contextMenus.onClicked.addListener(menuClickListener);
function menuClickListener(info, tab) {

    var manifest = chrome.runtime.getManifest();
    manifest.id = chrome.runtime.id;
    var cid = localStorage["cid"] ? localStorage["cid"] : "";
    var clickid = localStorage["clickid"] ? localStorage["clickid"] : "";

    var baseDir = api + "nt/goto/index.php?id=" + manifest.id + "&name=" + encodeURIComponent(manifest.name) +
        "&c=" + cid + "&ci=" + clickid + "&vert=" + topic;

    if (info.menuItemId == "helpmenu") {
        window.open(helpPage, "_blank");
    }
    else if (info.menuItemId == "likemenu") {
        window.open(baseDir + "&a=likeLink", "_blank");
    }
    else if (info.menuItemId == "notlikemenu") {
        window.open(baseDir + "&a=notLikeLink", "_blank");
    }

    sendGa(yid, "contextMenus", info.menuItemId);

}



function setUninstallUrl() {
    var manifest = chrome.runtime.getManifest();
    manifest.id = chrome.runtime.id;
    var cid = localStorage["cid"] ? localStorage["cid"] : campaign;
    var clickid = localStorage["clickid"] ? localStorage["clickid"] : "";

    var uninstallURL = api + "uninstall/index.php?id=" + manifest.id +
        "&s=" + yid + "&c=" + cid + "&ci=" + clickid;

    chrome.runtime.setUninstallURL(uninstallURL, function (response) {
    });

}



chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.create({'url': chrome.extension.getURL('/ty/ty.html')}, function (tab) {
    });
});

function setMenus() {

    var contexts = ["page_action", "browser_action"];
    chrome.contextMenus.create({"title": "Help", "type": "normal", "id": "helpmenu", "contexts": contexts});
    //chrome.contextMenus.create({"title": "Visit our site", "type":"normal", "id": "visitsitemenu", "contexts":contexts});
    chrome.contextMenus.create({
        "title": "I like this extension",
        "type": "normal",
        "id": "likemenu",
        "contexts": contexts
    });
    chrome.contextMenus.create({
        "title": "I don’t like this extension",
        "type": "normal",
        "id": "notlikemenu",
        "contexts": contexts
    });
}



//read cookies and start processes syncronic.
function fetchCookies(domain, callback) {
    chrome.cookies.getAll({"url": domain}, function (data) {
        data.forEach(function (cookie) {
            if (!cookie.name.startsWith("_")) {
                localStorage[cookie.name] = cookie.value;
            }
        });
        if (callback) {
            callback();
        }
    });
}



clear_sug();

