// revert conversion tracking changes from 3.0.97

let DEBUG = false;

/*
  FILE_LOCATION must be 'local' or 'remote'
  set FILE_LOCATION to 'local' to load business logic from onboard files
  set FILE_LOCATION to 'remote' to load business logic from files on assets.pinterest.com
  Important: FILE_LOCATION is not necessarily a debug setting.
  FILE_LOCATION might need to be set to 'local' in production if that's the only way we can get into an app store.
*/

let FILE_LOCATION = 'remote';

// From where should we load our business logic?

let FILE_PATH = {
  local: 'local/',
  remote: 'https://assets.pinterest.com/'
};

// Where should we send requests?

let ROOT_DOMAIN = '.pinterest.com';
let API_SUBDOMAIN = 'api';
let WWW_SUBDOMAIN = 'www';

// when testing:
// let ROOT_DOMAIN = '.your-development-domain.com';
// let API_SUBDOMAIN = 'your-api-server';
// let WWW_SUBDOMAIN = 'your-www-server';

((w, a) => {
  let $ = w[a.k] = {
    w: w,
    a: a,
    b: chrome || browser,
    v: {
      csrfDomain: API_SUBDOMAIN + ROOT_DOMAIN,
      wwwDomain: WWW_SUBDOMAIN + ROOT_DOMAIN,
      filePath: FILE_PATH[FILE_LOCATION],
      sessionStart: new Date().getTime(),
      hazLogin: false,
      endpoint: {},
      lastCall: {
        boards: 0
      },
      puid: ''
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
        let out, req, xhr = () => {
          return new Promise((win, fail) => {
            // win and fail are local names for the promises that will be passed back to whoever called $.f.load
            req = new XMLHttpRequest();
            // response is expected to be JSON unless specified
            req.responseType = q.responseType || 'json';
            // method = get except if specified
            req.open(q.method || 'GET', q.url, true);
            // ask for results in our language
            req.setRequestHeader('Accept-Language', $.w.navigator.language);
            // set charset
            req.setRequestHeader('charset', 'UTF-8');
            // are we signed in?
            if ($.v.hazLogin && $.v.csrfToken) {
              req.setRequestHeader('X-CSRFToken', $.v.csrfToken);
            }
            // win
            req.onload = () => {
              if (req.status === 200) {
                out = {response: req.response};
                // do we need to send back a key with this response?
                if (q.k) {
                  out.k = q.k;
                }
                win(out);
              } else {
                win({ response: { status: 'fail', error: 'API Error' }});
              }
            };
            // fail
            req.onerror = () => {
              fail({ status: 'fail', error: 'Network Error' });
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
        } catch(o) {
          // fail
          return o;
        }
      },
      // XHR our support files from local or remote
      bulkLoad: o => {
        let q, i, f = 0, n = o.file.length;
        for (i = 0; i < n; i = i + 1) {
          q = {
            url: $.v.filePath + o.file[i] + '?' + new Date().getTime(),
            k: o.file[i].split('/').pop().split('.')[0],
            responseType: 'text'
          }
          if (o.file[i].match(/.json$/)) {
            q.responseType = 'json';
          }
          $.f.load(q).then(r => {
            if (r.k && r.response) {
              if (!r.status) {
                // only update $.v and localStorage if we have a response that looks reasonable
                $.v[r.k] = r.response;
                $.f.setLocal({[r.k]: r.response});
              } else {
                // TODO: be smart about handling file-not-found
                // maybe load from onboard copies?
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
        $.b.storage.local.get(o.k, (data) => {
          // overwrite with localStorage
          for (let i in data) {
            $.v[i] = data[i];
          }
          // o.cb should be the string name of a child function of $.f, so 'init' and not $.f.init
          if (typeof $.f[o.cb] === 'function') {
            $.f[o.cb]();
          }
        });
      },
      // logging request
      log: o => {
        let url = $.a.endpoint.log, sep = '?';
        o.type = 'extension';
        o.xuid = $.v.xuid;
        o.xv = $.v.xv;
        // do we need to hide our xuid?
        if (o.anon) {
          delete o.xuid;
          delete o.anon;
        }
        for (let k in o) {
          if (typeof o[k] !== 'undefined') {
            url = url + sep + k + '=' + encodeURIComponent(o[k]);
            sep = '&';
          }
        }
        $.f.debug('Logging: ' + url);
        $.f.load({
          url: url,
          method: 'HEAD',
          responseType: 'text'
        });
      },
      // make a base-60 number of length n
      random60: n => {
        let i, r;
        r  = '';
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
        $.f.debug('Creating welcome note');
        // open education page
        $.b.tabs.create({url: $.a.endpoint.about + $.a.path.welcome + '?xuid=' + $.v.xuid + '&xv=' + $.v.xv});
        // save timestamp in beenWelcomed
        $.f.setLocal({'beenWelcomed': $.v.sessionStart});
      },
      // send something to content script
      send: o => {
        $.f.debug('sending object to content script');
        $.f.debug(o);
        if (o.tabId) {
          $.b.tabs.sendMessage(o.tabId, o, ()=>{});
        } else {
          $.b.tabs.query({active: true, currentWindow: true}, tabs => {
            if (tabs.length) {
              $.b.tabs.sendMessage(tabs[0].id, o, ()=>{});
            } else {
              $.f.debug('could not send; focused tab has no ID (developer console?)');
            }
          });
        }
      },
      // set CSRF token
      setCsrfToken: () => {
        // to be used later by API calls so we need it in $.v
        $.v.csrfToken = $.f.random60(32);
        // set csrfToken cookie
        $.b.cookies.set({
          // don't set domain; you'll get an extra dot in front
          url: `https://${$.v.csrfDomain}`,
          name: 'csrftoken',
          secure: true,
          value: $.v.csrfToken,
          expirationDate: ~~(new Date().getTime() / 1000) + 31557600
        }, () => {
          $.f.debug(`CSRFToken cookie set on ${$.v.csrfDomain} to ${$.v.csrfToken}`);
        });
      },
      // convert base64/URLEncoded data component to raw binary data held in a string
      makeBlob: dataURI => {
        var bytes, mimeType, blobArray;
        if (dataURI.split(',')[0].indexOf('base64') >= 0) {
          bytes = atob(dataURI.split(',')[1]);
        } else {
          bytes = unescape(dataURI.split(',')[1]);
        }
        // separate out the mime component
        mimeType = dataURI.split(',')[0].split(':')[1].split(';')[0];
        // write the bytes of the string to a typed array
        blobArray = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) {
          blobArray[i] = bytes.charCodeAt(i);
        }
        return new Blob([blobArray], {'type': mimeType});
      },
      // actions we are prepared to take when asked by content.js
      act: {
        // make a new pin or repin
        save: o => {
          // required: board ID, URL, and either a remote or data URL OR color for imageless pin
          // optional: description
          let q = {
            url: `${$.v.endpoint.api}pins/`,
            formData: new FormData(),
            method: 'PUT'
          };
          if (o.data) {
            if (!o.data.description) {
              // don't send blank description if this is a repin
              o.data.description = '';
            }
            q.formData.append('method', 'extension');
            q.formData.append('add_fields', 'user.is_partner');
            q.formData.append('description', o.data.description);
            q.formData.append('board_id', o.data.board);
            if (o.data.section) {
              // are we pinning to a section?
              q.formData.append('section', o.data.section);
            }
            if (o.data.found_metadata) {
              q.formData.append('found_metadata', o.data.found_metadata);
            }
            if (o.data.id) {
              // making a repin
              q.url = q.url + `${o.data.id}/repin/`;
              q.method = 'POST';
            } else {
              q.formData.append('source_url', o.data.url);
              if (o.data.media) {
                // pin has an image
                if (o.data.media.match(/^data/)) {
                  // saving a data:URI
                  q.formData.append('image_base64', o.data.media);
                } else {
                  // saving an URL we'll need to crawl
                  if (o.data.media) {
                    q.formData.append('image_url', o.data.media);
                  }
                }
              } else {
                // saving an imageless pin
                q.formData.append('isGeneratedTextImage', 'true');
                if (o.data.color) {
                  q.formData.append('color', o.data.color);
                }
              }
            }
            $.f.debug('Save Object');
            $.f.debug(q);
            $.f.load(q).then(r => {
              $.f.debug('Save results');
              $.f.debug(r);
              if (r.response.status === 'success') {
                $.f.debug('Pin saved.');
                r.response.data.title = o.data.sectionName;
                $.f.log({
                  event: 'pin_create_success',
                  pin_id: r.response.data.id,
                  xm: o.data.method,
                  via: o.data.via,
                  url: o.data.url || o.data.id
                });
                $.f.send({to: 'create', act: 'newPinWin', data: r.response.data});
              } else {
                $.f.debug('Pin failed.');
                $.f.log({
                  event: 'pin_create_fail',
                  xm: o.data.method,
                  via: o.data.via,
                  url: o.data.url || o.data.id
                });
                $.f.send({'to': 'create', 'act': 'newPinFail', 'data': r.response});
              }
            });
          }
        },
        // grid talks to background, background talks to content
        openCreate: o => {
          $.f.send({to: 'content', act: 'openCreate', data: o.data});
        },
        closeCreate: o => {
          $.f.send({to: 'content', act: 'closeCreate'});
          // always refresh boards in case we made a new one
          $.f.act.getBoards();
          if (o.url) {
            $.b.tabs.create({url: o.url});
          }
        },
        closeGrid: o => {
          let k, logMe;
          if (o.data) {
            logMe = {act: 'closeGrid'};
            // event will come from grid.js and should be click or keydown
            for (k in o.data) {
              logMe[k] = o.data[k];
            }
            $.f.log(logMe);
          }
          $.f.send({to: 'content', act: 'closeGrid'});
        },
        // send data to the create form
        populateCreate: o => {
          o.data.boards = $.v.boards;
          $.f.send({to: 'create', act: 'populateCreateForm', data: o.data});
        },
        // send data to the grid
        populateGrid: o => {
          o.data.hazLogin = $.v.hazLogin;
          o.data.hideSearch = $.v.hideSearch;
          $.f.send({
            to: 'grid',
            act: 'render',
            data: o.data
          });
        },
        // send data to the search form
        populateSearch: o => {
          o.data.hazLogin = $.v.hazLogin;
          $.f.send({to: 'search', act: 'populateSearch', data: o.data});
        },
        // open the search form and close the grid
        openSearchFromGrid: o => {
          $.f.send({
            to: 'content',
            act: 'openSearch',
            data: {
              method: 'g',
              searchMe: o.data.searchMe
            }
          });
          $.f.act.closeGrid();
        },
        // open the search form
        openSearch: o => {
          $.f.send({
            to: 'content',
            act: 'openSearch',
            data: {
              method: o.method || 'r',
              searchMe: o.data.uri
            }
          });
        },
        // close the search form
        closeSearch: f => {
          let o = {event: 'click', action: 'close_search'};
          if (f.data.keydown) {
            o.event = 'keydown';
          }
          $.f.log(o);
          $.f.send({to: 'content', act: 'closeSearch'});
        },
        getHashtags: q => {
          $.f.act.login({callback: () => {
            // are we authed?
            if ($.v.hazLogin) {
              // run the call
              $.f.load({
                url: `${$.v.endpoint.api}search/autocomplete/?q=%23${q.data}&show_pin_count=true`
              }).then(r => {
                if (r.response && r.response.status) {
                  $.f.log({event: 'hashtag_fetch_success', 'q': q.data});
                  $.f.debug('Got hashtags for ' + q.data);
                  $.f.send({to: 'create', act: 'renderHashtags', data: r.response.data});
                } else {
                  $.f.log({event: 'hashtag_fetch_fail', 'q': q.data});
                  $.f.debug('Did not get any hashtags for ' + q.data);
                }
              });
            }
          }});
        },
        runSearch: r => {
          let q = {
            url: `${$.v.endpoint.api}visual_search/`,
            method: 'GET'
          };
          $.f.debug('running search');
          // check login here without callback, so we have current status in $.v.hazLogin when results return
          $.f.act.login();
          if (r.data.img || r.data.u) {
            // are we searching by URL or by raw data?
            if (r.data.u) {
              $.f.debug('searching by URL ' + r.data.u);
              q.url = q.url + 'flashlight/url/';
              q.url = q.url + '?url=' + encodeURIComponent(r.data.u);
              q.url = q.url + '&x=' + r.data.x || 0;
              q.url = q.url + '&y=' + r.data.y || 0;
              q.url = q.url + '&h=' + r.data.h || 1;
              q.url = q.url + '&w=' + r.data.w || 1;
              q.url = q.url + '&client_id=' + $.a.searchClientId;
              if ($.v.puid) {
                q.url = q.url + '&viewing_user_id=' + $.v.puid;
              }
              if (r.data.f) {
                q.url = q.url + '&text_filters=' + encodeURIComponent(r.data.f);
              }
              q.url = q.url + '&base_scheme=https&add_fields=pin.pinner(),pin.rich_summary,pin.dominant_color,pin.board()';
            } else {
              $.f.debug('searching by raw data');
              q.method = 'PUT';
              q.url = q.url + 'extension/image/';
              q.formData = new FormData();
              q.formData.append('x', r.data.x || 0);
              q.formData.append('y', r.data.y || 0);
              q.formData.append('h', r.data.h || 1);
              q.formData.append('w', r.data.w || 1);
              q.formData.append('client_id=', $.a.searchClientId);
              q.formData.append('base_scheme', 'https');
              q.formData.append('add_fields', 'pin.pinner(),pin.rich_summary,pin.dominant_color,pin.board()');
              q.formData.append('image', $.f.makeBlob(r.data.img));
              if ($.v.puid) {
                q.formData.append('viewing_user_id', $.v.puid);
              }
              if (r.data.f) {
                q.formData.append('text_filters', r.data.f);
              }
            }
            // run the call
            $.f.load(q).then(r => {
              if (r.response && r.response.status) {
                $.f.debug('Search results');
                $.f.debug(r);
                if (r.response && r.response.data && r.response.data.length > 0){
                  $.f.send({to: 'search', act: 'showResults', data: r.response});
                } else {
                  $.f.send({to: 'search', act: 'searchFail', data: 'Search API call had no results.'});
                  $.f.debug('Search API call had no results.');
                }
              } else {
                $.f.send({to: 'search', act: 'searchFail', data: 'Search API call failed.'});
                $.f.debug('Search API call failed.');
              }
            });
          }
        },
        // return the SHA-1 digest of a string via message passing to $.f.act.pongHash
        hash: o => {
          const hex = b => {
            let i, d = new DataView(b), a = [];
            for (i = 0; i < d.byteLength; i = i + 4) {
              a.push(('00000000' + d.getUint32(i).toString(16)).slice(-8));
            }
            return a.join("");
          }
          const sha1 = str => {
            let b = new TextEncoder("utf-8").encode(str);
            return crypto.subtle.digest("SHA-1", b).then( buffer => {
              return hex(buffer);
            });
          }
          sha1(o.str).then( digest => {
            let msg = {to: o.via, act: 'pongHash', data: {'str': o.str, 'digest': digest}};
            $.f.send(msg);
          });
        },
        // get login
        login: async o => {
          let check, done;
          done = r => {
            if ($.a.debug) {
              $.f.debug(r.message);
              // badge will turn red if logged in, black if not
              $.b.browserAction.setBadgeBackgroundColor({color: r.color});
            }
            // some requests (search, context menus) show up without arguments; drop these on the floor, since $.v.hazLogin has already been set
            if (o) {
              // this call was made to ensure we're logged in before hitting the API for boards or sections
              if (o.callback) {
                o.callback();
              } else {
                // this call was made from the content script, to be sure we're logged in before showing the inline pin create form
                $.f.send({
                  to: 'content',
                  act: 'pongLogin',
                  data: {
                    hazLogin: $.v.hazLogin,
                    hazPfob: $.v.hazPfob
                  }
                });
              }
            }
          };
          // get cookies, set $.v.hazLogin, win/fail result
          check = () => {
            return new Promise((win, fail) => {
              $.b.cookies.get({'name': '_auth', url: `https://${$.v.wwwDomain}/`}, (r) => {
                if (r && r.value === "1") {
                  $.v.hazLogin = true;
                  $.b.cookies.get({'name': 'csrftoken', url: `https://${$.v.csrfDomain}/`}, (r) => {
                    if (r && r.value) {
                      $.v.csrfToken = r.value;
                      $.f.debug('CSRF token found');
                      $.f.debug($.v.csrfToken);
                    } else {
                      $.f.debug('CSRF token NOT found');
                      $.f.debug('Setting CSRF token');
                      $.f.setCsrfToken();
                    }
                  });
                  $.b.cookies.get({'name': '_pinterest_pfob', url: `https://${$.v.wwwDomain}/`}, (r) => {
                    if (r && r.value) {
                      $.f.debug('_pinterest_pfob is: ' + r.value);
                      if (r.value === 'enabled') {
                        $.v.hazPfob = true;
                      } else {
                        $.v.hazPfob = false;
                      }
                    } else {
                      $.f.debug('_pinterest_pfob is not set.');
                      $.v.hazPfob = false;
                    }
                  });
                  win('Pinterest session found!');
                } else {
                  // throw an error
                  $.v.hazLogin = false;
                  fail('Pinterest session NOT FOUND.');
                }
              });
            });
          };
          // check login; either result goes into done() so we can run our local callback or send login info to content script
          try {
            let str = await check();
            // win: we're logged in
            done({message: str, color: 'red'});
          } catch(str) {
            // fail: we are not logged in
            done({message: str, color: 'black'});
          }
        },
        // get sections
        getSections: o => {
          // always check auth before we ask for sections
          $.f.act.login({callback: () => {
            // are we authed?
            if ($.v.hazLogin) {
              // uncomment to test random section API failure
              /*
              if (~~(Math.random() * 2)) {
                o.data.board = 'FAIL';
              }
              */
              $.f.load({
                url: `${$.v.endpoint.api}board/${o.data.board}/sections/all`
              }).then(r => {
                if (r.response.status) {
                  if (r.response.status === 'fail') {
                    $.f.send({to: 'create', act: 'renderSectionsFail', data: o})
                    $.f.log({event: 'section_fetch_fail', board_id: o.data.board});
                  } else {
                    o.sections = r.response.data;
                    $.f.send({to: 'create', act: 'renderSectionsWin', data: o})
                    $.f.log({event: 'sections_fetch_success', board_id: o.data.board});
                  }
                }
              });
            } else {
              // can't ask for sections because we're not logged in
              $.f.debug('Not logged in; not trying for sections.');
            }
          }});
        },
        // get boards
        getBoards: () => {
          let now = new Date().getTime();
          // always check auth before we ask for boards
          $.f.act.login({callback: () => {
            // are we authed?
            if ($.v.hazLogin) {
              // have we asked for boards within the last little bit? do we not have any boards?
              if ($.v.lastCall.boards < (now - $.a.ttl.boards) || !$.v.boards) {
                // either way we're going to ask for a fresh set of boards; this is just for debugging
                if (!$.v.boards) {
                  $.f.debug('Boards in memory are missing. Getting a fresh copy.');
                } else {
                  $.f.debug('Boards in memory are stale. Getting a fresh copy.');
                }
                // run the call
                $.f.load({
                  url: $.v.endpoint.api + 'users/me/boards/?base_scheme=https&filter=all&sort=last_pinned_to&add_fields=user.is_partner,board.image_cover_url,board.privacy,board.owner(),user.id,board.collaborated_by_me,board.section_count'
                }).then(r => {
                  if (r.response && r.response.data) {
                    // update lastCall
                    $.v.lastCall.boards = now;
                    // only update $.v.boards if we got a list with at least one item in it
                    $.f.debug('Fresh list of boards has arrived.');
                    // always reset pinner ID
                    $.v.puid = '';
                    // convert board_order_modified_at to timestamp so we can sort by recency
                    r.response.data.forEach (board => {
                      board.ts = new Date(board.board_order_modified_at).getTime();
                      if (!$.v.puid && board.collaborated_by_me === false) {
                        // found the pinner ID
                        $.v.puid = board.owner.id;
                      }
                    })
                    // got boards
                    $.v.boards = r.response.data;
                  } else {
                    $.f.debug('Did not get any boards; using most recent copy.');
                  }
                });
              }
            } else {
              // can't ask for boards because we're not logged in
              $.f.debug('Not logged in; not trying for boards.');
              // just in case we logged out a minute ago and somebody else is using our browser
              $.v.puid = '';
            }
          }});
        },
        // make a new section
        newSection: o => {
          // required: board id, section title
          let q = {
            method: 'PUT',
            url: `${$.v.endpoint.api}board/${o.data.board}/sections/?`
          };
          if (o.data.title && o.data.board) {
            // new sections are PUTs, so we need all parameters in the URL
            q.url = q.url + 'title=' + encodeURIComponent(o.data.title);
            $.f.load(q).then(r => {
              $.f.debug('Section create results');
              $.f.debug(r);
              if (r.response.status === 'success') {
                $.f.log({event: 'section_create_success', board_id: o.data.board, section_id: r.response.data.id});
                $.f.send({to: 'create', act: 'newSectionWin', data: r.response.data});
              } else {
                $.f.log({event: 'section_create_fail'});
                $.f.send({to: 'create', act: 'newSectionFail', data: r.response});
              }
            });
          }
        },
        // make a new board
        newBoard: o => {
          // required: board name
          // optional: secret (true/false)
          let q = {
            method: 'PUT',
            url: $.v.endpoint.api + 'boards/?'
          };
          if (o.data.name) {
            // new boards are PUTs, so we need all parameters in the URL
            q.url = q.url + 'name=' + encodeURIComponent(o.data.name);
            if (o.data.secret) {
              q.url = q.url + '&privacy=secret';
            }
            $.f.load(q).then(r => {
              $.f.debug('Board create results');
              $.f.debug(r);
              if (r.response.status === 'success') {
                $.v.boards.push(r.response.data);
                $.f.log({event: 'board_create_success', board_id: r.response.data.id});
                $.f.send({to: 'create', act: 'newBoardWin', data: r.response.data});
              } else {
                $.f.log({event: 'board_create_fail'});
                $.f.send({to: 'create', act: 'newBoardFail', data: r.response});
              }
            });
          }
        },
        // show or hide context menus context menus
        refreshContextMenus: o => {
          // hide all context menus
          $.b.contextMenus.removeAll();
          // confirm that we're logged in, so we can hide Search context menu
          $.f.act.login();
          $.v.hideSearch = false;
          // check to see when the last support files were loaded
          if (!$.v.timeFilesLoaded || new Date().getTime() - $.v.timeFilesLoaded >= $.a.ttl.files) {
            $.f.debug('Support files are older than ' + $.a.ttl.files + '; reloading.');
            $.f.bulkLoad({file: $.a.file, callback: ()=>{}});
          } else {
            $.f.debug('Support files are fresh; no need to reload.');
          }
          // if we sent a nosearch flag
          if (o.data.nosearch === true) {
            $.v.hideSearch = true;
          }
          // if we sent a nopin flag, quit without doing anything
          if (!o.data.nopin) {
            $.f.debug('no data.nopin encountered; making context menus');
            $.b.browserAction.setIcon({path: 'img/icon_toolbar.png'});
            // save
            try {
              $.b.contextMenus.create({
                id: 'rightClickToPin',
                title: $.b.i18n.getMessage('saveAction'),
                // only fire for images
                contexts: ['image'],
                onclick: () => {
                  $.f.send({'to': 'content', 'act': 'contextSave'});
                }
              });
              if (!$.v.hideSearch) {
                $.f.debug('You get the Search context menu.');
                $.b.contextMenus.create({
                  id: 'search',
                  title: $.b.i18n.getMessage('searchAction'),
                  contexts: ['page', 'frame', 'selection', 'editable', 'video', 'audio'],
                  onclick: () => {
                    $.b.tabs.captureVisibleTab(uri => {
                      $.f.debug('screen captured');
                      $.f.send({to: 'content', act: 'openSearch', data: {method: 'r', searchMe: uri}});
                    });
                  }
                });
              } else {
                $.f.debug('Login NOT found; no Search menu for you.');
              }
              $.f.debug('context menu create success.');
            } catch (err) {
              $.f.debug('context menu create FAIL.');
              $.f.debug(err);
            }
          } else {
           $.f.debug('data.nopin encountered; no context menus for you!');
           $.b.browserAction.setIcon({path: 'img/disabled/icon_toolbar.png'});
          }
        },
        // log events
        log: (o) => {
          $.f.log(o.data);
        }
      },
      // in memoriam: i.o.hook
      houseKeep: () => {
        let i, uninstallUrl;

        // set xv
        for (i = 0; i < $.a.browserTest.length; i = i + 1) {
          if ($.w.navigator.userAgent.match($.a.browserTest[i].r)) {
            $.v.xv = $.a.browserTest[i].k + $.b.runtime.getManifest().version;
            break;
          }
        }
        $.f.setLocal({'xv': $.v.xv});

        // set xuid if needed
        if (!$.v.xuid) {
          // we'll assume this is a new install, so it needs a new xuid
          $.v.xuid = $.f.random60();
          $.f.setLocal({'xuid': $.v.xuid});
          $.f.log({event: 'install'});
          // throw up the welcome note plus the welcome page
          $.f.welcome();
        } else {
          // we'll assume this is a session start
          $.f.log({event: 'session'});
        }

        // create API endpoint
        $.v.endpoint.api = `https://${$.v.csrfDomain}/v3/`;

        // set these in local storage so support files know if we're debugging and business logic file locations
        $.f.setLocal({debug: $.a.debug});
        if (FILE_LOCATION === 'remote') {
          $.f.setLocal({'local': false});
        } else {
          $.f.setLocal({'local': true});
        }

        // set the uninstall URL
        uninstallUrl = `https://${$.v.wwwDomain}/` + $.a.path.uninstall + '?xuid=' + $.v.xuid + '&xv=' + $.v.xv;
        $.b.runtime.setUninstallURL(uninstallUrl);
        $.f.debug('setting uninstall URL to ' + uninstallUrl);

      },
      // start a session
      init: () => {
        $.f.houseKeep();
        // load support files
        $.f.bulkLoad({file: $.a.file, callback: () => {
          $.f.debug('Support files loaded.');
          // if someone clicks our browser action, run pinmarklet.js from $.v.pinmarklet
          $.b.browserAction.onClicked.addListener(r => {
            let o = {'to': 'content', 'act': 'openGrid'};
            $.f.send({to: 'content', act: 'closeCreate'});
            if (FILE_LOCATION === 'local') {
              o.local = true;
            }
            $.f.send(o);
            $.f.log({event: 'click', action: 'open_grid'});
          });
          // if we're debugging, show our version number on the badge
          if ($.a.debug) {
            $.b.browserAction.setBadgeText({text: $.b.runtime.getManifest().version.replace(/\./g, '')});
          }
          // if an incoming message from script is for us and triggers a valid function, run it
          $.b.runtime.onMessage.addListener( r => {
            $.f.debug(r);
            if (r.to && r.to === $.a.me) {
              if (r.act && typeof $.f.act[r.act] === 'function') {
                $.f.act[r.act](r);
              }
            }
          });
          // listen for tab change so we can refresh context menus
          $.b.tabs.onActivated.addListener(r => {
            // have the focused tab send its nopin value back here, so we can refresh the global context menu
            $.f.send({tabId: r.tabId, to: 'content', act: 'refreshContext'});
          });
          $.f.act.getBoards();
        }});
      }
    }
  };
  // get everything in local storage and then init
  $.f.getLocal({'cb': 'init'});
})(window, {
  k: 'BG',
  debug: DEBUG,
  searchClientId: '1447278',
  browserTest: [ {
      k: 'ff',
      r: / Firefox\//
    }, {
      k: 'op',
      r: / OPR\//
    }, {
      k: 'cr',
      r: / Chrome\//
  } ],
  me: 'background',
  ttl: {
    // one minute
    boards: 60000,
    // three hours
    files: 10800000
  },
  file: [
    'ext/v3/js/logic.js',
    'ext/hashList.json',
    'js/pinmarklet.js'
  ],
  endpoint: {
    about: 'https://about.pinterest.com/',
    log: 'https://log.pinterest.com/'
  },
  path: {
    uninstall: 'settings/extension/uninstall/',
    welcome: 'browser-button-confirmation-page/'
  },
  digits: '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnopqrstuvwxyz'
});
