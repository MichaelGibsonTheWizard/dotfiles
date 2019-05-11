/*
  be smarter about checking auth, csrftoken, and pfob cookies
  get boards only when called by the picker
*/

// debug needs to be set here or else we don't know whether we want to load our local ctrl.json
// throughout: depend on $.v.debug, NOT $.v.ctrl.debug, which should not exist.
let DEBUG = false;

// what is the name of our control file?
let CONTROL_FILE = "ctrl.json";

// where will we find hashList.json and our control file when we're not debugging?
let REMOTE_ASSET_PATH = "https:/assets.pinterest.com/ext/";

/* when debugging, open up ctrl.json and change: 

  "csrfDomain": "api.pinterest.com",
  "wwwSDomain": "www.pinterest.com"
  
... to this:

  "csrfDomain": "api-yourname.pinterdev.com",
  "wwwSDomain": "yourname.pinterdev.com"
*/

// this needs to run outside the main IIFE to catch the event, which seems to fire off very quickly
let INSTALL_OBJ = {};
if (chrome && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(o => {
    INSTALL_OBJ = o;
  });
} else {
  // check other WebExtensions-compatible browsers
  if (browser && browser.runtime) {
    browser.runtime.onInstalled.addListener(o => {
      INSTALL_OBJ = o;
    });
  }
}

((w, a) => {
  let $ = (w[a.k] = {
    w: w,
    a: a,
    b: chrome || browser,
    v: {
      sessionStart: new Date().getTime(),
      endpoint: {},
      puid: "",
      // just in case we screw up ctrl.json, let's keep a local known-good pattern
      pattern: {
        pinmarklet:
          "^https?:\\/\\/assets\\.pinterest\\.com\\/js\\/pinmarklet\\.js"
      }
    },
    f: {
      // console.log to background window
      debug: o => {
        if (o && $.a.debug) {
          console.log(o);
        }
      },
      // new async/await XHR loader
      load: async q => {
        let out,
          req,
          xhr = () => {
            return new Promise((win, fail) => {
              // win and fail are local names for the promises that will be passed back to whoever called $.f.load
              req = new XMLHttpRequest();
              // response is expected to be JSON unless specified
              req.responseType = q.responseType || "json";
              // method = get except if specified
              req.open(q.method || "GET", q.url, true);
              // ask for results in our language
              req.setRequestHeader("Accept-Language", $.w.navigator.language);
              // set charset
              req.setRequestHeader("charset", "UTF-8");
              // are we signed in?
              if (q.auth && q.csrftoken) {
                req.setRequestHeader("X-CSRFToken", q.csrftoken);
              }
              // win
              req.onload = () => {
                if (req.status === 200) {
                  out = { response: req.response };
                  // do we need to send back a key with this response?
                  if (q.k) {
                    out.k = q.k;
                  }
                  win(out);
                } else {
                  win({ response: { status: "fail", error: "API Error" } });
                }
              };
              // fail
              req.onerror = () => {
                fail({ status: "fail", error: "Network Error" });
              };
              // add formData to request if sent
              if (q.formData) {
                req.send(q.formData);
              } else {
                req.send();
              }
            });
          };
        // run it and return a promise
        try {
          let o = await xhr(q);
          // win
          return o;
        } catch (o) {
          // fail
          return o;
        }
      },
      // XHR our business logic (.js) files from local
      // XHR our data files (.json) fromm remote
      bulkLoad: o => {
        let q,
          i,
          f = 0,
          url,
          n = o.file.length;
        for (i = 0; i < n; i = i + 1) {
          url = o.file[i];
          if (o.file[i].match(/\.json$/)) {
            url = REMOTE_ASSET_PATH + o.file[i];
            if (o.file[i] === CONTROL_FILE && DEBUG) {
              $.f.debug("Loading local control file.");
              // load from onboard version
              url = CONTROL_FILE;
            }
          }
          url = url + "?" + new Date().getTime();
          q = {
            url: url,
            k: o.file[i]
              .split("/")
              .pop()
              .split(".")[0],
            responseType: "text"
          };
          if (o.file[i].match(/.json$/)) {
            q.responseType = "json";
          }
          $.f.load(q).then(r => {
            if (r.k) {
              if (r.response) {
                if (!r.status) {
                  // only update $.v and localStorage if we have a response that looks reasonable
                  $.v[r.k] = r.response;
                  $.f.setLocal({ [r.k]: r.response });
                } else {
                  $.f.debug(
                    "Ignoring " + r.k + " because of status " + r.status
                  );
                }
              } else {
                $.f.debug("No reponse for " + r.k);
              }
            }
            f = f + 1;
            if (f === n) {
              $.v.timeFilesLoaded = new Date().getTime();
              o.callback();
            }
          });
        }
      },
      // set an object in local storage
      setLocal: o => {
        $.b.storage.local.set(o);
      },
      // get local storage, set local lets, run callback if specified
      getLocal: o => {
        if (!o.k) {
          o.k = null;
        }
        $.b.storage.local.get(o.k, data => {
          // overwrite with localStorage
          for (let i in data) {
            $.v[i] = data[i];
          }
          // o.cb should be the string name of a child function of $.f, so 'init' and not $.f.init
          if (typeof $.f[o.cb] === "function") {
            $.f[o.cb]();
          }
        });
      },

      // Return a promise containing cookie contents
      getCookies: () => {
        /*
          Usage:
          $.f.getCookies().then(
            result => {
              doStuffWith(result);
            }
          );
        */

        // run me after we've successfully queried cookies
        const processCookies = cookies => {
          const result = {
            auth: false,
            csrftoken: null,
            pfob: false,
            timeCheck: 0
          };

          if (cookies["_auth"]) {
            /*
              New key timeCheck will be populated with the _auth cookie's expiration date,
              which should change when accounts are switched or user signs out.
              The image picker (create.js) will send timeCheck back to us each time we need
              to query an endpoint that requires authorization.
              If the remote version of timeCheck is not the current value, login status has
              changed since the image picker opened, so we should close with an error.
            */
            result.timeCheck = cookies["_auth"].expirationDate;
            if (cookies["_auth"].value === "1") {
              // we are logged in
              result.auth = true;
              // check csrftoken
              if (cookies["csrftoken"].value) {
                result.csrftoken = cookies["csrftoken"].value;
              } else {
                result.csrftoken = $.f.setCsrfToken();
              }
            }
            if (cookies["_pinterest_pfob"].value === "enabled") {
              result.pfob = true;
            }
          }
          return result;
        };

        // return only the cookies we want
        return new Promise(resolve => {
          $.b.cookies.getAll(
            {
              // this will match api.pinterest.com and www.pinterest.com
              domain: ".pinterest.com"
            },
            r => {
              // clone the cookies we care about with domains and default null values
              const getThese = Object.assign({}, $.a.importantCookies);
              for (let item of r) {
                if (getThese[item.name]) {
                  if (item.domain === getThese[item.name].domain) {
                    getThese[item.name].value = item.value;
                    getThese[item.name].expirationDate = item.expirationDate;
                  }
                }
              }

              // process our results and send them to the next step in the promise chain
              resolve(processCookies(getThese));
            }
          );
        });
      },
      // logging request
      log: o => {
        let url = $.v.ctrl.endpoint.log,
          sep = "?";
        o.type = "extension";
        o.xuid = $.v.xuid;
        o.xv = $.v.xv;
        // do we need to hide our xuid?
        if (o.anon) {
          delete o.xuid;
          delete o.anon;
        }
        for (let k in o) {
          if (typeof o[k] !== "undefined") {
            url = url + sep + k + "=" + encodeURIComponent(o[k]);
            sep = "&";
          }
        }
        $.f.debug("Logging: " + url);
        $.f.load({
          url: url,
          method: "HEAD",
          responseType: "text"
        });
      },
      // make a base-60 number of length n
      random60: n => {
        let i, r;
        r = "";
        n = n - 0;
        if (!n) {
          n = 12;
        }
        for (i = 0; i < n; i = i + 1) {
          r = r + $.a.digits.substr(Math.floor(Math.random() * 60), 1);
        }
        return r;
      },
      // welcome, new user!
      welcome: () => {
        // create a note
        $.f.debug("Creating welcome note");
        // open education page
        $.b.tabs.create({
          url:
            $.v.ctrl.endpoint.about +
            $.v.ctrl.path.welcome +
            "?xuid=" +
            $.v.xuid +
            "&xv=" +
            $.v.xv
        });
        // save timestamp in beenWelcomed
        $.f.setLocal({ beenWelcomed: $.v.sessionStart });
      },
      // send something to content script
      send: o => {
        $.f.debug("sending object to content script");
        $.f.debug(o);
        if (o.tabId) {
          $.b.tabs.sendMessage(o.tabId, o);
        } else {
          $.b.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs.length) {
              $.b.tabs.sendMessage(tabs[0].id, o);
            } else {
              $.f.debug(
                "could not send; focused tab has no ID (developer console?)"
              );
            }
          });
        }
      },
      // set CSRF token on api.pinterest.com
      setCsrfToken: () => {
        $.b.cookies.set(
          {
            // set the URL, not the domain; if you set domain you'll get .api.pinterest.com, which is wrong
            url: `https://${$.v.ctrl.csrfDomain}`,
            name: "csrftoken",
            secure: true,
            value: $.f.random60(32),
            expirationDate: Math.floor(new Date().getTime() / 1000) + 31557600
          },
          () => {
            $.f.debug(
              `CSRFToken cookie set on ${$.v.ctrl.csrfDomain} to ${newToken}`
            );
          }
        );
        // return this so we can use it immediately for API calls without querying cookies again
        return newToken;
      },
      // for image search: convert base64/URLEncoded data component to raw binary data
      makeBlob: dataURI => {
        var bytes, mimeType, blobArray;
        if (dataURI.split(",")[0].indexOf("base64") >= 0) {
          bytes = atob(dataURI.split(",")[1]);
        } else {
          bytes = unescape(dataURI.split(",")[1]);
        }
        // separate out the mime component
        mimeType = dataURI
          .split(",")[0]
          .split(":")[1]
          .split(";")[0];
        // write the bytes of the string to a typed array
        blobArray = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) {
          blobArray[i] = bytes.charCodeAt(i);
        }
        return new Blob([blobArray], { type: mimeType });
      },
      // return the SHA-1 digest of a string
      hash: str => {
        // pad each item in a buffer with up to eight leading zeroes
        const hex = b => {
          let i,
            d = new DataView(b),
            a = [];
          for (i = 0; i < d.byteLength; i = i + 4) {
            a.push(("00000000" + d.getUint32(i).toString(16)).slice(-8));
          }
          return a.join("");
        };
        let b = new TextEncoder("utf-8").encode(str);
        return crypto.subtle.digest("SHA-1", b).then(buffer => {
          return hex(buffer);
        });
      },
      // actions we are prepared to take when asked by content.js
      act: {
        // make a new pin or repin
        save: o => {
          $.f.getCookies().then(cookies => {
            if (
              cookies.auth &&
              cookies.timeCheck &&
              o.data.timeCheck &&
              cookies.timeCheck === o.data.timeCheck
            ) {
              // required: board ID, URL, and either a remote or data URL OR color for imageless pin
              // optional: description
              const q = {
                auth: true,
                csrftoken: cookies.csrftoken,
                url: `${$.v.endpoint.api}pins/`,
                formData: new FormData(),
                method: "PUT"
              };
              if (o.data) {
                if (!o.data.description) {
                  // don't send blank description if this is a repin
                  o.data.description = "";
                }
                q.formData.append("method", "extension");
                q.formData.append("add_fields", "user.is_partner");
                q.formData.append("description", o.data.description);
                q.formData.append("board_id", o.data.board);
                if (o.data.section) {
                  // are we pinning to a section?
                  q.formData.append("section", o.data.section);
                }
                if (o.data.found_metadata) {
                  q.formData.append("found_metadata", o.data.found_metadata);
                }
                if (o.data.id) {
                  // making a repin
                  q.url = q.url + `${o.data.id}/repin/`;
                  q.method = "POST";
                } else {
                  q.formData.append("source_url", o.data.url);
                  if (o.data.media) {
                    // pin has an image
                    if (o.data.media.match(/^data/)) {
                      // saving a data:URI
                      q.formData.append("image_base64", o.data.media);
                    } else {
                      // saving an URL we'll need to crawl
                      if (o.data.media) {
                        q.formData.append("image_url", o.data.media);
                      }
                    }
                  } else {
                    // saving an imageless pin
                    q.formData.append("isGeneratedTextImage", "true");
                    if (o.data.color) {
                      q.formData.append("color", o.data.color);
                    }
                  }
                }
                $.f.debug("Save Object");
                $.f.debug(q);
                $.f.load(q).then(r => {
                  $.f.debug("Save results");
                  $.f.debug(r);
                  if (r.response.status === "success") {
                    $.f.debug("Pin saved.");
                    r.response.data.title = o.data.sectionName;
                    let logMe = {
                      event: "pin_create_success",
                      client: "extension",
                      pin_id: r.response.data.id,
                      xm: o.data.method,
                      via: o.data.via,
                      url: o.data.url || o.data.id
                    };
                    if ($.v.guid) {
                      logMe.guid = $.v.guid;
                      $.v.guid = "";
                    }
                    $.f.log(logMe);
                    $.f.send({
                      to: "create",
                      act: "newPinWin",
                      data: r.response.data
                    });
                  } else {
                    $.f.debug("Pin failed.");
                    let logMe = {
                      event: "pin_create_fail_api",
                      client: "extension",
                      xm: o.data.method,
                      via: o.data.via,
                      url: o.data.url || o.data.id
                    };
                    if ($.v.guid) {
                      logMe.guid = $.v.guid;
                      $.v.guid = "";
                    }
                    $.f.log(logMe);
                    // we are logged in but the pin failed
                    $.f.send({
                      to: "create",
                      act: "newPinFail",
                      data: r.response
                    });
                  }
                });
              }
            } else {
              // lost auth before pin create attempt
              $.f.send({
                to: "create",
                act: "newPinFail",
                data: {
                  message: $.v.message.create.msgOops,
                  message_detail: $.v.message.create.msgLoginFail
                }
              });
              $.f.log({
                event: "pin_create_fail_login",
                board_id: o.data.board
              });
            }
          });
        },
        // grid talks to background, background talks to content
        openCreate: o => {
          $.f.send({ to: "content", act: "openCreate", data: o.data });
        },
        closeCreate: o => {
          $.f.send({ to: "content", act: "closeCreate" });
          if (o.url) {
            $.b.tabs.create({ url: o.url });
          }
        },
        closeSave: o => {
          $.f.send({ to: "content", act: "closeSave" });
        },
        seeItNow: o => {
          $.f.send({ to: "content", act: "closeSave" });
          $.w.open(
            `https://${$.v.ctrl.wwwDomain}/pin/${o.data.pinId}/`,
            "_blank"
          );
        },
        closeGrid: o => {
          let k, logMe;
          if (o.data) {
            logMe = { act: "closeGrid" };
            // event will come from grid.js and should be click or keydown
            for (k in o.data) {
              logMe[k] = o.data[k];
            }
            $.f.log(logMe);
          }
          $.f.send({ to: "content", act: "closeGrid" });
        },
        // send data to the create form
        populateCreate: o => {
          $.f.getCookies().then(cookies => {
            // this will help us know if login has changed while image picker is up
            o.data.timeCheck = cookies.timeCheck;
            $.f.send({
              to: "create",
              act: "populateCreateForm",
              data: o.data
            });
          });
          // get boards and send them on a separate thread, so the rest of the pin create form can render quickly
          $.f
            .load({
              url:
                $.v.endpoint.api +
                "users/me/boards/?base_scheme=https&filter=all&sort=last_pinned_to&add_fields=user.is_partner,board.image_cover_url,board.privacy,board.owner(),user.id,board.collaborated_by_me,board.section_count"
            })
            .then(r => {
              if (r.response && r.response.data) {
                // convert board_order_modified_at to timestamp so we can sort by recency
                r.response.data.forEach(board => {
                  board.ts = new Date(board.board_order_modified_at).getTime();
                  // TODO: access the user object (needs a new API endpoint) to get this every time
                  // $.v.puid is used in search but we are no longer stashing boards so it won't happen reliably
                  if (!$.v.puid && board.collaborated_by_me === false) {
                    // found the pinner ID
                    $.v.puid = board.owner.id;
                  }
                });
                // got boards
                o.data.boards = r.response.data;
              } else {
                o.data.boards = [];
                $.f.debug("Did not get any boards; sending an empty array.");
              }
              $.f.send({
                to: "create",
                act: "renderBoards",
                data: o.data
              });
            });
        },
        // send data to the iframed save form
        populateSave: o => {
          $.f.send({ to: "save", act: "populateSave", data: o.data });
        },
        // send data to the grid
        populateGrid: o => {
          $.f.getCookies().then(cookies => {
            o.data.auth = cookies.auth;
            o.data.hideSearch = $.v.hideSearch;
            $.f.send({
              to: "grid",
              act: "render",
              data: o.data
            });
          });
        },
        // send data to the search form
        populateSearch: o => {
          $.f.getCookies().then(cookies => {
            // search needs to know if we're authed in order to open the right board picker
            o.data.auth = cookies.auth;
            $.f.send({ to: "search", act: "populateSearch", data: o.data });
          });
        },
        // open the search form and close the grid
        openSearchFromGrid: o => {
          $.f.send({
            to: "content",
            act: "openSearch",
            data: {
              method: "g",
              searchMe: o.data.searchMe
            }
          });
          $.f.act.closeGrid();
        },
        // open the search form
        openSearch: o => {
          $.f.send({
            to: "content",
            act: "openSearch",
            data: {
              method: o.method || "r",
              searchMe: o.data.uri
            }
          });
        },
        // close the search form
        closeSearch: f => {
          let o = { event: "click", action: "close_search" };
          if (f.data.keydown) {
            o.event = "keydown";
          }
          $.f.log(o);
          $.f.send({ to: "content", act: "closeSearch" });
        },
        // query /search/autocomplete for hashtags
        getHashtags: o => {
          // suspenders + belt; user may have logged out after opening image picker
          $.f.getCookies().then(cookies => {
            if (cookies.auth) {
              // we are logged in, so run the call
              const q = {
                auth: true,
                csrftoken: cookies.csrftoken,
                url: `${$.v.endpoint.api}search/autocomplete/?q=%23${
                  o.data
                }&show_pin_count=true`
              };
              $.f.load(q).then(r => {
                if (r.response && r.response.status) {
                  $.f.log({ event: "hashtag_fetch_success", q: o.data });
                  $.f.debug("Got hashtags for " + o.data);
                  const hashtags = r.response.data.filter(
                    item => item.query !== undefined
                  );
                  if (hashtags.length) {
                    $.f.send({
                      to: "create",
                      act: "renderHashtags",
                      data: hashtags
                    });
                  }
                } else {
                  $.f.log({ event: "hashtag_fetch_fail_api", q: o.data });
                  $.f.debug("Did not get any hashtags for " + o.data);
                }
              });
            }
          });
        },
        // visual search; takes an URL or a raw image object
        runSearch: r => {
          const q = {
            url: `${$.v.endpoint.api}visual_search/`,
            method: "GET"
          };
          $.f.debug("running search");
          if (r.data.img || r.data.u) {
            // are we searching by URL or by raw data?
            if (r.data.u) {
              $.f.debug("searching by URL " + r.data.u);
              q.url = q.url + "flashlight/url/";
              q.url = q.url + "?url=" + encodeURIComponent(r.data.u);
              q.url = q.url + "&x=" + r.data.x || 0;
              q.url = q.url + "&y=" + r.data.y || 0;
              q.url = q.url + "&h=" + r.data.h || 1;
              q.url = q.url + "&w=" + r.data.w || 1;
              q.url = q.url + "&client_id=" + $.v.ctrl.search.clientId;
              if ($.v.puid) {
                q.url = q.url + "&viewing_user_id=" + $.v.puid;
              }
              if (r.data.f) {
                q.url = q.url + "&text_filters=" + encodeURIComponent(r.data.f);
              }
              q.url =
                q.url +
                "&base_scheme=https&add_fields=pin.pinner(),pin.rich_summary,pin.dominant_color,pin.board()";
            } else {
              $.f.debug("searching by raw data");
              q.method = "PUT";
              q.url = q.url + "extension/image/";
              q.formData = new FormData();
              q.formData.append("x", r.data.x || 0);
              q.formData.append("y", r.data.y || 0);
              q.formData.append("h", r.data.h || 1);
              q.formData.append("w", r.data.w || 1);
              q.formData.append("client_id=", $.v.ctrl.search.clientId);
              q.formData.append("base_scheme", "https");
              q.formData.append(
                "add_fields",
                "pin.pinner(),pin.rich_summary,pin.dominant_color,pin.board()"
              );
              q.formData.append("image", $.f.makeBlob(r.data.img));
              if ($.v.puid) {
                q.formData.append("viewing_user_id", $.v.puid);
              }
              if (r.data.f) {
                q.formData.append("text_filters", r.data.f);
              }
            }
            // run the call
            $.f.load(q).then(r => {
              if (r.response && r.response.status) {
                $.f.debug("Search results");
                $.f.debug(r);
                if (
                  r.response &&
                  r.response.data &&
                  r.response.data.length > 0
                ) {
                  $.f.send({
                    to: "search",
                    act: "showResults",
                    data: r.response
                  });
                } else {
                  $.f.send({
                    to: "search",
                    act: "searchFail",
                    data: "Search API call had no results."
                  });
                  $.f.debug("Search API call had no results.");
                }
              } else {
                $.f.send({
                  to: "search",
                  act: "searchFail",
                  data: "Search API call failed."
                });
                $.f.debug("Search API call failed.");
              }
            });
          }
        },
        // tell logic.js if it should no-pin or no-hover a specific domain
        checkFeatureBlock: o => {
          // hash all varations of the domain to catch cases where
          // we are visiting foo.bar.com but bar.com is on the list
          let i,
            domainToCheck,
            parts,
            status = {
              nosearch: false,
              nohover: false,
              nopin: false
            };
          parts = o.domain.split(".");
          parts.reverse();
          // start with the tld
          domainToCheck = parts[0];
          for (i = 1; i < parts.length; i = i + 1) {
            // add the next path level
            domainToCheck = parts[i] + "." + domainToCheck;
            // hash it and then check the digest against items loaded from hashList.json on session start
            $.f.hash(domainToCheck).then(digest => {
              // check if our digest is on theOtherList, which contains domains that should never be saved
              $.v.hashList.theOtherList.filter(item => {
                if (digest.match(item)) {
                  $.f.debug(
                    "No-pin list match on " +
                      domainToCheck +
                      "; pin, search, and hover disabled"
                  );
                  status.nosearch = status.nopin = status.nohover = true;
                  // log it without any identifying information, including the domain
                  $.f.log({
                    anon: true,
                    event: "block",
                    list: "nopin",
                    hash: item
                  });
                }
              });
              // check if our digest is on theList, which contains domains that should not show hovering Save buttons
              $.v.hashList.theList.filter(item => {
                if (digest.match(item)) {
                  $.f.debug(
                    "No-hover list match on " +
                      domainToCheck +
                      "; hover disabled"
                  );
                  status.nohover = true;
                  // log it without any identifying information, including the domain
                  $.f.log({
                    anon: true,
                    event: "block",
                    list: "nohover",
                    hash: item
                  });
                }
              });
            });
          }

          // send back the results
          $.f.send({
            to: "content",
            act: "renderFeatureBlock",
            data: status
          });
        },
        // logic would like to know if we are logged in and (if so)
        // if the Pinner allows personalization from offsite browsing
        login: () => {
          $.f.getCookies().then(cookies => {
            // while debugging we show a badge with the version inside.
            // background color reminds us whether we are logged in or not
            if (cookies.auth) {
              $.b.browserAction.setBadgeBackgroundColor({ color: "red" });
            } else {
              $.b.browserAction.setBadgeBackgroundColor({ color: "black" });
            }
            // this call was made from the content script, to be sure we're logged in before showing the inline pin create form
            $.f.send({
              to: "content",
              act: "pongLogin",
              // send hash of csftoken
              data: {
                auth: cookies.auth,
                pfob: cookies.pfob
              }
            });
          });
        },
        // get sections
        getSections: o => {
          // always check auth before we ask for sections
          $.f.getCookies().then(cookies => {
            if (
              cookies.auth &&
              cookies.timeCheck &&
              o.data.timeCheck &&
              cookies.timeCheck === o.data.timeCheck
            ) {
              // uncomment to test random section API failure
              /*
              if (Math.floor(Math.random() * 2)) {
                o.data.board = 'FAIL';
              }
              */
              const q = {
                auth: true,
                csrftoken: cookies.csrftoken,
                url: `${$.v.endpoint.api}board/${o.data.board}/sections/all`
              };
              $.f.load(q).then(r => {
                if (r.response.status) {
                  // API has failed; we're going to ask them to log in again
                  if (r.response.status === "fail") {
                    $.f.send({
                      to: "create",
                      act: "renderSectionsFail",
                      data: {
                        message: $.v.message.create.msgOops,
                        message_detail: $.v.message.create.msgLoginFail
                      }
                    });
                    $.f.log({
                      event: "section_fetch_fail_api",
                      board_id: o.data.board
                    });
                  } else {
                    // we're good
                    o.sections = r.response.data;
                    $.f.send({
                      to: "create",
                      act: "renderSectionsWin",
                      data: o
                    });
                    $.f.log({
                      event: "sections_fetch_success",
                      board_id: o.data.board
                    });
                  }
                }
              });
            } else {
              // can't ask for sections because we're not logged in
              $.f.debug("Login problem; can't try for sections.");
              $.f.send({
                to: "create",
                act: "renderSectionsFail",
                data: {
                  message: $.v.message.create.msgOops,
                  message_detail: $.v.message.create.msgLoginFail
                }
              });
              $.f.log({
                event: "sections_fetch_fail_login",
                board_id: o.data.board
              });
            }
          });
        },
        // make a new section
        newSection: o => {
          // required: board id, section title
          $.f.getCookies().then(cookies => {
            if (
              cookies.auth &&
              cookies.csrftoken &&
              cookies.timeCheck &&
              o.data.timeCheck &&
              cookies.timeCheck === o.data.timeCheck
            ) {
              const q = {
                auth: true,
                csrftoken: cookies.csrftoken,
                method: "PUT",
                url: `${$.v.endpoint.api}board/${o.data.board}/sections/?`
              };
              if (o.data.title && o.data.board) {
                // new sections are PUTs, so we need all parameters in the URL
                q.url = q.url + "title=" + encodeURIComponent(o.data.title);
                $.f.load(q).then(r => {
                  $.f.debug("Section create results");
                  $.f.debug(r);
                  if (r.response.status === "success") {
                    $.f.log({
                      event: "section_create_success",
                      board_id: o.data.board,
                      section_id: r.response.data.id
                    });
                    $.f.send({
                      to: "create",
                      act: "newSectionWin",
                      data: r.response.data
                    });
                  } else {
                    $.f.log({
                      event: "section_create_fail_api",
                      board_id: o.data.board
                    });
                    // create needs to do something with this error
                    $.f.send({
                      to: "create",
                      act: "newSectionFail",
                      data: r.response
                    });
                  }
                });
              }
            } else {
              // lost auth before section create attempt
              $.f.send({
                to: "create",
                act: "newSectionFail",
                data: {
                  message: $.v.message.create.msgOops,
                  message_detail: $.v.message.create.msgLoginFail
                }
              });
              $.f.log({
                event: "section_create_fail_login",
                board_id: o.data.board
              });
            }
          });
        },
        // make a new board
        newBoard: o => {
          // required: board name
          // optional: secret (true/false)
          $.f.getCookies().then(cookies => {
            if (
              cookies.auth &&
              cookies.csrftoken &&
              cookies.timeCheck &&
              o.data.timeCheck &&
              cookies.timeCheck === o.data.timeCheck
            ) {
              const q = {
                auth: true,
                csrftoken: cookies.csrftoken,
                method: "PUT",
                url: $.v.endpoint.api + "boards/?"
              };
              if (o.data.name) {
                // new boards are PUTs, so we need all parameters in the URL
                q.url = q.url + "name=" + encodeURIComponent(o.data.name);
                if (o.data.secret) {
                  q.url = q.url + "&privacy=secret";
                }
                $.f.load(q).then(r => {
                  $.f.debug("Board create results");
                  $.f.debug(r);
                  if (r.response.status === "success") {
                    $.f.log({
                      event: "board_create_success",
                      board_id: r.response.data.id
                    });
                    $.f.send({
                      to: "create",
                      act: "newBoardWin",
                      data: r.response.data
                    });
                  } else {
                    $.f.log({ event: "board_create_fail_api" });
                    $.f.send({
                      to: "create",
                      act: "newBoardFail",
                      data: r.response
                    });
                  }
                });
              }
            } else {
              // lost auth before board create attempt
              $.f.send({
                to: "create",
                act: "newBoardFail",
                data: {
                  message: $.v.message.create.msgOops,
                  message_detail: $.v.message.create.msgLoginFail
                }
              });
              $.f.log({ event: "board_create_fail_login" });
            }
          });
        },
        // show or hide context menus
        refreshContextMenus: o => {
          // hide all context menus
          $.b.contextMenus.removeAll();
          // confirm that we're logged in, so we can hide Search context menu if the global flag is set
          $.f.act.login();
          $.v.hideSearch = false;
          // check to see when the last support files were loaded
          if (
            !$.v.timeFilesLoaded ||
            new Date().getTime() - $.v.timeFilesLoaded >= $.a.ttl.files
          ) {
            $.f.debug(
              "Support files are older than " + $.a.ttl.files + "; reloading."
            );
            $.f.bulkLoad({ file: $.a.file, callback: () => {} });
          } else {
            $.f.debug("Support files are fresh; no need to reload.");
          }
          // if we sent a nosearch flag
          if (o.data.nosearch === true) {
            $.v.hideSearch = true;
          }
          // if we sent a nopin flag, quit without doing anything
          if (!o.data.nopin) {
            $.f.debug("no data.nopin encountered; making context menus");
            $.b.browserAction.setIcon({ path: "img/icon_toolbar.png" });
            // save
            try {
              $.b.contextMenus.create({
                id: "rightClickToPin",
                title: $.b.i18n.getMessage("saveAction"),
                // only fire for images
                contexts: ["image"],
                onclick: () => {
                  $.f.send({ to: "content", act: "contextSave" });
                }
              });
              if (!$.v.hideSearch) {
                $.f.debug("You get the Search context menu.");
                $.b.contextMenus.create({
                  id: "search",
                  title: $.b.i18n.getMessage("searchAction"),
                  contexts: [
                    "page",
                    "frame",
                    "selection",
                    "editable",
                    "video",
                    "audio"
                  ],
                  onclick: () => {
                    $.b.tabs.captureVisibleTab(uri => {
                      $.f.debug("screen captured");
                      $.f.send({
                        to: "content",
                        act: "openSearch",
                        data: { method: "r", searchMe: uri }
                      });
                    });
                  }
                });
              } else {
                $.f.debug("Login NOT found; no Search menu for you.");
              }
              $.f.debug("context menu create success.");
            } catch (err) {
              $.f.debug("context menu create FAIL.");
              $.f.debug(err);
            }
          } else {
            $.f.debug("data.nopin encountered; no context menus for you!");
            $.b.browserAction.setIcon({
              path: "img/disabled/icon_toolbar.png"
            });
          }
        },
        // log events
        log: o => {
          $.f.log(o.data);
        }
      },
      // the uninstall URL opens in a new tab when the extension is removed
      setUninstallURL: () => {
        // build an URL that will log the current version and xuid on uninstall
        const uninstallUrl = `${$.v.ctrl.endpoint.about}${
          $.v.ctrl.path.uninstall
        }?type=extension&event=uninstall&xuid=${$.v.xuid}&xv=${$.v.xv}`;
        // set it -- this is NOT in local storage, so should not be cleared by privacy utils
        $.b.runtime.setUninstallURL(uninstallUrl);
        $.f.debug("setting uninstall URL to " + uninstallUrl);
      },
      // be sure we have an xuid, which is a persistent identifier we can use for funnel analysis
      checkXuid: () => {
        // if we have not found this in local storage, make one
        if (!$.v.xuid) {
          $.v.xuid = $.f.random60();
          $.f.debug("new XUID: " + $.v.xuid);
          // save for later
          $.f.setLocal({ xuid: $.v.xuid });
        }
        // always set the uninstall URL whether or not we have made a new xuid
        // because we want the current version in the uninstall URL
        $.f.setUninstallURL();
      },
      // see if we have just installed or updated the extension
      checkInstallObj: () => {
        // INSTALL_OBJ has been set previous to main script loading
        if (INSTALL_OBJ && INSTALL_OBJ.reason) {
          // checking for xuid will also update the uninstall URL
          $.f.checkXuid();
          // reasons are: install, update, chrome_update, or shared_module_update
          // not sure if chrome_update will be browser_update for other browsers
          const logMe = {
            event: INSTALL_OBJ.reason
          };
          // if we're updating, add the previous version
          if (INSTALL_OBJ.previousVersion) {
            logMe.previousVersion = INSTALL_OBJ.previousVersion;
          }
          // log it
          $.f.log(logMe);
          // if this is an install, show the welcome page
          if (INSTALL_OBJ.reason === "install") {
            $.f.welcome();
          }
        }
      },
      // in memoriam: i.o.hook
      houseKeep: () => {
        let i;

        // build a string like cr4.0.77
        // for logging and setting data-pinterest-extension-installed
        for (i = 0; i < $.a.browserTest.length; i = i + 1) {
          if ($.w.navigator.userAgent.match($.a.browserTest[i].r)) {
            $.v.xv = $.a.browserTest[i].k + $.b.runtime.getManifest().version;
            break;
          }
        }
        // always overwrite the version on session start
        $.f.setLocal({ xv: $.v.xv });

        // check (create if needed) our extension user identifier
        $.f.checkXuid();

        // we have an xuid so we can log a session
        $.f.log({ event: "session" });

        // create API endpoint
        $.v.endpoint.api = `https://${$.v.ctrl.csrfDomain}/v3/`;

        // set these in local storage so support files know if we're debugging and business logic file locations
        $.f.setLocal({ debug: $.a.debug });

        // since we can't store a regex pattern in a pure JSON object, we will need to build from strings
        for (let k in $.v.pattern) {
          try {
            // only attempt to update the pattern if we have it in ctrl.pattern
            if ($.v.ctrl.pattern[k]) {
              $.v.pattern[k] = new RegExp($.v.ctrl.pattern[k]);
            }
          } catch (err) {
            $.f.debug(
              "Can't create a regex from  " +
                $.v.ctrl.pattern[k] +
                " ... sticking with " +
                $.v.pattern[k]
            );
          }
        }

        // check if our onInstalled listener caught anything
        $.f.checkInstallObj();
      },
      // start a session
      init: () => {
        const messages = {};
        // overlays are: create, search, and grid
        // we also have: logic, which alerts
        // this grabs all possible messages one time and
        // sends them via localStorage instead of using
        // the i18n API every time, which is slow/blockish
        for (let overlay in $.a.translateThese) {
          messages[overlay] = {};
          for (let pair in $.a.translateThese[overlay]) {
            // check for exact match for overlay_pair,
            // then just pair,
            // and use english default if not found
            messages[overlay][pair] =
              $.b.i18n.getMessage(overlay + "_" + pair) ||
              $.b.i18n.getMessage(pair) ||
              $.a.translateThese[overlay][pair];
          }
        }
        $.f.debug("Messages retrieved from i18n:");
        $.f.debug(messages);
        // once messages are in local storage, they will be available to each overlay when it loads
        $.f.setLocal({ msg: messages });
        // background also needs global access to messages to send login fail errors
        $.v.message = messages;

        // load support files
        $.f.bulkLoad({
          file: $.a.file,
          callback: () => {
            $.f.debug("Support files loaded.");
            $.f.debug($.a.file);
            $.f.houseKeep();

            // if someone clicks our browser action, run pinmarklet.js from $.v.pinmarklet
            $.b.browserAction.onClicked.addListener(r => {
              let o = { to: "content", act: "openGrid" };
              $.f.send({ to: "content", act: "closeCreate" });
              $.f.send(o);
              $.f.log({ event: "click", action: "open_grid" });
            });
            // if we're debugging, show our version number on the badge
            if ($.a.debug) {
              $.b.browserAction.setBadgeText({
                text: $.b.runtime.getManifest().version.replace(/\./g, "")
              });
            }
            // if an incoming message from script is for us and triggers a valid function, run it
            $.b.runtime.onMessage.addListener(r => {
              $.f.debug(r);
              if (r.to && r.to === $.a.me) {
                if (r.act && typeof $.f.act[r.act] === "function") {
                  $.f.act[r.act](r);
                }
              }
            });
            // listen for tab change so we can refresh context menus
            $.b.tabs.onActivated.addListener(r => {
              // have the focused tab send its nopin value back here, so we can refresh the global context menu
              $.f.send({
                tabId: r.tabId,
                to: "content",
                act: "refreshContext"
              });
            });
            // listen for window focus change
            $.b.windows.onFocusChanged.addListener(windowId => {
              $.b.tabs.query({ active: true, currentWindow: true }, tab => {
                // do we have an active tab in the current window?
                if (tab[0]) {
                  // ask the focused tab send its nopin value back here, so we can refresh the global context menu
                  $.f.send({
                    tabId: tab[0].tabId,
                    to: "content",
                    act: "refreshContext"
                  });
                }
              });
            });
            // block requests to certain Pinterest URLs
            $.b.webRequest.onBeforeRequest.addListener(
              e => {
                // can we try to block pinmarklet?
                if ($.v.ctrl.canHaz.localImagePicker) {
                  // are we trying to run pinmarklet?
                  if (e.url.match($.v.pattern.pinmarklet)) {
                    $.v.guid = "";
                    // are we inside another page rather than trying to load pinmarklet itself in a new tab?
                    // e.initiator = Chrome; e.originUrl = Firefox
                    if (e.initiator || e.originUrl) {
                      // close the create form if it's currently open
                      $.f.send({ to: "content", act: "closeCreate" });
                      // get ready to log the interception event
                      let logMe = {
                        event: "interception",
                        action: "open_grid"
                      };
                      // get params from call to pinmarklet
                      let params = new URLSearchParams(e.url.split("?")[1]);
                      // do we have a guid?
                      if (params.get("guid")) {
                        // add it to logging ping
                        logMe.guid = $.v.guid = params.get("guid");
                      }
                      // log it
                      $.f.log(logMe);
                      // open grid
                      $.f.send({
                        to: "content",
                        act: "openGrid"
                      });

                      // cancel the request to pinmarklet.js
                      return {
                        cancel: true
                      };
                    }
                  }
                }
              },
              {
                urls: ["*://*.pinterest.com/*"]
              },
              ["blocking"]
            );
            // set the initial state of the debug flag on our browser button
            $.f.act.login();
          }
        });
      }
    }
  });
  // get everything in local storage and then init
  $.f.getLocal({ cb: "init" });
})(window, {
  k: "BG",
  debug: DEBUG,
  importantCookies: {
    _auth: {
      domain: ".pinterest.com",
      value: null
    },
    csrftoken: {
      domain: "api.pinterest.com",
      value: null
    },
    _pinterest_pfob: {
      domain: ".pinterest.com",
      value: null
    }
  },
  browserTest: [
    {
      k: "ff",
      r: / Firefox\//
    },
    {
      k: "op",
      r: / OPR\//
    },
    {
      k: "ms",
      r: / Edge\//
    },
    {
      k: "cr",
      r: / Chrome\//
    }
  ],
  me: "background",
  ttl: {
    // one minute
    boards: 60000,
    // three hours
    files: 10800000
  },
  file: [
    // special case: if DEBUG is true, ctrl.json will load from our local /ext directory
    CONTROL_FILE,
    "js/logic.js",
    "js/pinmarklet.js",
    // JSON files will load from server, with ASSET_PATH prepended
    "hashList.json"
  ],
  digits: "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnopqrstuvwxyz",
  // each overlay has its own sub-object with keys and values
  // duplication for things like saveAction are needed because each
  // overlay only sees its subset of messages
  translateThese: {
    search: {
      headerMessage: "More like this from Pinterest",
      saveAction: "Save",
      msgOops: "Oops!"
    },
    grid: {
      choosePin: "Choose a Pin to save",
      saveAction: "Save"
    },
    logic: {
      saveAction: "Save",
      noPinDomain:
        "Sorry, pinning is not allowed from this domain. Please contact the site operator if you have any questions."
    },
    create: {
      // main header in Save form
      chooseBoard: "Choose board",
      // Creates the pin
      saveAction: "Save",
      // placeholder text in Search input
      filter: "Search",
      // interstitial header in board list
      topChoices: "Top choices",
      // interstitial header in board list
      allBoards: "All boards",
      // header in Create form
      outerAddFormOpener: "Create board",
      // placeholder text in Create Board input
      placeholderFilterAddBoard: 'Such as "Places to Go"',
      // placeholder text in Create Section input
      placeholderFilterAddSection: 'Like "Lighting"',
      // placeholder text in Pin description
      placeholderDescription: "Tell us about this Pin...",
      // label over secret/not-secret switch
      addFormSecretLabel: "Secret",
      // label for board sections
      chooseSection: "Choose section",
      // label to add section
      addSection: "Add Section",
      // switch option yes
      optYes: "Yes",
      // switch option no
      optNo: "No",
      // cancel create
      closeAddForm: "Cancel",
      // create new board
      submitAddForm: "Create",
      // board identifier
      msgPinSavedTo: "Saved to %",
      // board create fail
      msgBoardFail: "Could not create new board",
      // pin create fail
      msgPinFail: "Could not save this page",
      // pin / board create success button
      msgSeeItNow: "See it now",
      // pin create success close
      msgClose: "Close",
      // error header
      msgOops: "Oops!",
      // error when we try do something that requires a login and we can't find it
      // most likely this will happen when someone has the image picker up in one tab and
      // signs out, clears cookies, or changes accounts in another tab without reloading
      msgLoginFail:
        "Sorry, something's not quite right here. Please check that you are logged into Pinterest and try again.",
      // get help button
      msgHelp: "Get Help"
    }
  }
});
