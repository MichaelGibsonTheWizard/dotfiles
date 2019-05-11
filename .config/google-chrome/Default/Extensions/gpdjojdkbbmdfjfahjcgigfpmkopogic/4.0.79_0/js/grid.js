// be smarter about checking auth, csrftoken, and pfob cookies

((w, d, a) => {
  var $ = {
    w: w,
    d: d,
    a: a,
    b: chrome || browser,
    v: {
      css: "",
      endpoint: {},
      msg: {}
    },
    s: {},
    f: {
      // console.log to background window
      debug: o => {
        if (o && $.v.ctrl.debug) {
          console.log(o);
        }
      },
      // get a DOM property or text attribute
      get: o => {
        var r = null;
        if (typeof o.el[o.att] === "string") {
          r = o.el[o.tt];
        } else {
          r = o.el.getAttribute("data-" + o.att);
        }
        return r;
      },
      // set a DOM property or text attribute
      set: o => {
        if (typeof o.el[o.att] === "string") {
          o.el[o.att] = o.string;
        } else {
          o.el.setAttribute("data-" + o.att, o.string);
        }
      },
      // create a DOM element
      make: o => {
        var el = false,
          t,
          a,
          k;
        for (t in o) {
          el = $.d.createElement(t);
          for (a in o[t]) {
            if (typeof o[t][a] === "string") {
              $.f.set({ el: el, att: a, string: o[t][a] });
            } else {
              if (a === "style") {
                for (k in o[t][a]) {
                  el.style[k] = o[t][a][k];
                }
              }
            }
          }
          break;
        }
        return el;
      },
      // send a message
      send: o => {
        $.f.debug("Sending message");
        o.via = $.v.me;
        if (!o.to) {
          o.to = "background";
        }
        $.f.debug(JSON.stringify(o));
        $.b.runtime.sendMessage(o);
      },
      // send a ping from the background process to log.pinterest.com
      log: o => {
        o.lv = $.a.ver;
        o.via = $.d.URL;
        $.f.send({
          act: "log",
          data: o
        });
      },
      // if we're right-clicking on an image, save it to $.v.contextEl
      context: e => {
        if (e.button === 2) {
          var t = e.target;
          if (t && t.tagName && t.tagName === "IMG") {
            $.v.contextEl = t;
          }
        }
      },
      // get the position of a DOM element
      getPos: o => {
        var positionTop = 0,
          positionLeft = 0;
        if (o.el.offsetParent) {
          do {
            positionLeft = positionLeft + o.el.offsetLeft;
            positionTop = positionTop + o.el.offsetTop;
          } while ((o.el = o.el.offsetParent));
          return { top: positionTop, left: positionLeft };
        }
      },
      // return an event's target element
      getEl: e => {
        var r = e.target;
        // text node; return parent
        if (r.targetNodeType === 3) {
          r = r.parentNode;
        }
        return r;
      },
      // open the pin create form
      pop: o => {
        // what to log
        let logMe,
          dualScreenLeft,
          dualScreenTop,
          height,
          width,
          left,
          top,
          query;

        logMe = { event: "click", xm: o.method };

        dualScreenLeft =
          $.w.screenLeft != undefined ? $.w.screenLeft : screen.left;
        dualScreenTop = $.w.screenTop != undefined ? $.w.screenTop : screen.top;

        width = $.w.outerWidth
          ? $.w.outerWidth
          : $.w.defaultStatus.documentElement.clientWidth
          ? $.w.defaultStatus.documentElement.clientWidth
          : screen.width;
        height = $.w.outerHeight
          ? $.w.outerHeight
          : $.w.defaultStatus.documentElement.clientHeight
          ? $.w.defaultStatus.documentElement.clientHeight
          : screen.height;
        left = (width - $.a.pop.width) / 2 + dualScreenLeft;
        top = (height - $.a.pop.height) / 2 + dualScreenTop;

        if (!o.method) {
          // default to hoverbutton method
          o.method = "h";
        }

        // how to pin
        if (o.id) {
          // repin
          query = $.v.endpoint.rePinCreate.replace(/%s/, o.id);
          // log the pin ID
          logMe.repin = id;
        } else {
          // new pin
          query = $.v.endpoint.pinCreate + "?url=" + encodeURIComponent(o.url);
          if (o.color) {
            // imageless pin
            query =
              query +
              "&pinFave=1&color=" +
              encodeURIComponent(o.color) +
              "&h=236&w=236";
          } else {
            // regular pin
            query = query + "&media=" + encodeURIComponent(o.media);
          }
          query =
            query +
            "&xm=" +
            o.method +
            "&xv=" +
            $.v.xv +
            "&xuid=" +
            $.v.xuid +
            "&description=" +
            encodeURIComponent(o.description);
        }

        // open pop-up window
        $.w.open(
          query,
          "pin" + new Date().getTime(),
          "status=no,resizable=yes,scrollbars=yes,personalbar=no,directories=no,location=no,toolbar=no,menubar=no,height=" +
            $.a.pop.height +
            ",width=" +
            $.a.pop.width +
            ",left=" +
            left +
            ",top=" +
            top
        );
        $.f.log(logMe);
      },
      // return moz, webkit, ms, etc
      getVendorPrefix: () => {
        var x = /^(moz|webkit|ms)(?=[A-Z])/i,
          r = "",
          p;
        for (p in $.d.b.style) {
          if (x.test(p)) {
            r = "-" + p.match(x)[0].toLowerCase() + "-";
            break;
          }
        }
        return r;
      },
      // build stylesheet
      buildStyleSheet: () => {
        var css, rules, k, re, repl;
        css = $.f.make({ STYLE: { type: "text/css" } });
        rules = $.v.css;
        // each rule has our randomly-created key at its root to minimize style collisions
        rules = rules.replace(/\._/g, "." + a.k + "_");
        // strings to replace in CSS rules
        var repl = {
          "%prefix%": $.f.getVendorPrefix()
        };
        // replace everything in repl throughout rules
        for (k in repl) {
          if (repl[k].hasOwnProperty) {
            // re = new RegExp(k, 'g');
            rules = rules.replace(new RegExp(k, "g"), repl[k]);
          }
        }
        // add rules to stylesheet
        if (css.styleSheet) {
          css.styleSheet.cssText = rules;
        } else {
          css.appendChild($.d.createTextNode(rules));
        }
        // add stylesheet to page
        if ($.d.h) {
          $.d.h.appendChild(css);
        } else {
          $.d.b.appendChild(css);
        }
      },
      // recursive function to make rules out of a Sass-like object
      presentation: o => {
        // make CSS rules
        var name,
          i,
          k,
          pad,
          key,
          rules = "",
          selector = o.str || "";
        for (k in o.obj) {
          if (typeof o.obj[k] === "string") {
            rules = rules + "\n  " + k + ": " + o.obj[k] + ";";
          }
          if (typeof o.obj[k] === "object") {
            key = selector + " " + k;
            key = key.replace(/ &/g, "");
            key = key.replace(/,/g, ", " + selector);
            $.f.presentation({ obj: o.obj[k], str: key });
          }
        }
        // add selector and rules to stylesheet
        if (selector && rules) {
          $.v.css = $.v.css + selector + " { " + rules + "\n}\n";
        }
        // if this is our root, remove from current context and make stylesheet
        if (o.obj === $.a.styles) {
          $.w.setTimeout(() => {
            $.f.buildStyleSheet();
          }, 1);
        }
      },
      // build a complex element from a JSON template
      buildOne: o => {
        var key, child;
        for (key in o.obj) {
          child = $.f.make({
            SPAN: {
              className: $.a.k + "_" + key.replace(/ /g, " " + $.a.k)
            }
          });
          o.el.appendChild(child);
          if (!$.s[key]) {
            $.s[key] = child;
          }
          $.f.buildOne({ obj: o.obj[key], el: child });
        }
      },
      // clean troublesome characters from strings that may be shown onscreen
      clean: o => {
        return new DOMParser().parseFromString(o.str, "text/html")
          .documentElement.textContent;
      },
      // close grid from background process
      close: o => {
        $.f.send({ act: "closeGrid", data: o });
      },
      act: {
        render: r => {
          let cc, i, n, it, thumb, mask, desc, img, ft, ftDesc, parser;
          $.f.debug("rendering the grid");
          $.f.debug(r);

          $.v.endpoint.pinCreate = $.v.ctrl.endpoint.grid.pinCreate.replace(
            /www/,
            r.data.config.domain
          );
          $.v.endpoint.rePinCreate = $.v.ctrl.endpoint.grid.rePinCreate.replace(
            /www/,
            r.data.config.domain
          );

          // never show the imageless thumb if we have more than one thing
          if (r.data.thumb.length > 1) {
            for (i = r.data.thumb.length - 1; i > -1; i = i - 1) {
              if (!r.data.thumb[i].src) {
                r.data.thumb.splice(i, 1);
                break;
              }
            }
          }

          // are we logged in?
          if (r.data.auth) {
            // we'll use this later to open the right pin create form from the grid
            $.v.hazLogin = true;
            // if we only have one thing, go directly to pin create
            if (r.data.thumb.length === 1) {
              $.f.send({
                act: "openCreate",
                data: r.data.thumb[0]
              });
              // close and log this event
              $.f.close({
                event: "skipGrid",
                url: r.data.thumb[0].url || null
              });
            }
          }

          // avoid the initial flash of header if we are skipping the grid
          $.d.body.style.display = "block";
          cc = 0;
          $.d.title = $.v.msg.choosePin;
          $.s.hdMsg.innerText = $.v.msg.choosePin;
          for (i = 0, n = r.data.thumb.length; i < n; i = i + 1) {
            it = r.data.thumb[i];
            desc = (it.description || "").substr(0, 500);
            thumb = $.f.make({
              DIV: {
                className: `${$.a.k}_thumb`
              }
            });
            if (it.src) {
              // only show search button if we're not on a page where search is verboten
              if (!r.data.hideSearch) {
                thumb.appendChild(
                  $.f.make({
                    SPAN: {
                      className: `${$.a.k}_searchButton`
                    }
                  })
                );
              }
              img = $.f.make({
                IMG: {
                  src: it.media
                }
              });
              mask = $.f.make({
                DIV: {
                  className: `${$.a.k}_mask`,
                  url: it.url,
                  media: it.media,
                  description: desc,
                  pinId: it.dataPinId || undefined
                }
              });
            } else {
              // make an imageless thumb
              it = r.data.imageless;
              img = $.f.make({
                SPAN: {
                  className: `${$.a.k}_imageless`,
                  style: {
                    backgroundColor: it.color
                  }
                }
              });
              mask = $.f.make({
                DIV: {
                  className: `${$.a.k}_mask`,
                  url: it.url,
                  color: it.color,
                  siteName: it.siteName,
                  description: desc
                }
              });
              img.appendChild(
                $.f.make({
                  SPAN: {
                    className: `${$.a.k}_site`,
                    innerText: it.siteName
                  }
                })
              );
              img.appendChild(
                $.f.make({
                  SPAN: {
                    className: `${$.a.k}_text`,
                    innerText: $.f.clean({ str: desc })
                  }
                })
              );
            }
            thumb.appendChild(img);
            thumb.appendChild(
              $.f.make({
                SPAN: {
                  className: `${$.a.k}_saveButton`,
                  innerText: $.v.msg.saveAction
                }
              })
            );
            ft = $.f.make({
              DIV: {
                className: `${$.a.k}_ft`
              }
            });
            ftDesc = $.f.make({
              SPAN: {
                className: `${$.a.k}_desc`,
                innerText: desc
              }
            });
            ftDesc.appendChild(
              $.f.make({
                SPAN: {
                  className: `${$.a.k}_dimensions`,
                  innerText: it.height + " x " + it.width
                }
              })
            );
            ft.appendChild(ftDesc);
            thumb.appendChild(ft);
            thumb.appendChild(mask);
            // add this thumb to the right column
            $.d.getElementById("c_" + cc).appendChild(thumb);
            // next time, use the next column
            cc = (cc + 1) % $.v.columnCount;
          }
        }
      },
      // a click!
      click: e => {
        let children, data, el, i;
        el = $.f.getEl(e);
        if (el === $.s.x) {
          $.f.close({ event: "click" });
        }
        if (el.className === `${$.a.k}_searchButton`) {
          children = el.parentNode.children;
          for (i = 0; i < children.length; i++) {
            if (children[i].className === `${$.a.k}_mask`) {
              $.f.send({
                act: "openSearchFromGrid",
                data: {
                  searchMe: $.f.get({ el: children[i], att: "media" })
                }
              });
              // log the click
              $.f.log({
                event: "click",
                overlay: "grid",
                action: "open_search"
              });
            }
          }
        }
        if (el.className === $.a.k + "_mask") {
          data = {
            url: $.f.get({ el: el, att: "url" }),
            id: $.f.get({ el: el, att: "pinId" }) || null,
            media: $.f.get({ el: el, att: "media" }),
            color: $.f.get({ el: el, att: "color" }),
            siteName: $.f.get({ el: el, att: "siteName" }),
            description: $.f.get({ el: el, att: "description" }),
            method: "g"
          };
          // log the click
          $.f.log({
            event: "click",
            overlay: "grid",
            action: "open_create"
          });
          // open the form
          if ($.v.hazLogin) {
            // open the inline create form
            $.f.send({
              act: "openCreate",
              data: data
            });
          } else {
            // open the pop-up form
            $.f.pop(data);
          }
          $.f.close();
        }
      },
      // close on escape
      keydown: e => {
        var k = e.keyCode || null;
        if (k === 27) {
          $.f.close({ event: "keydown" });
        }
      },
      // start
      init: () => {
        $.d.b = $.d.getElementsByTagName("BODY")[0];
        if ($.d.b) {
          // don't allow right-click menus unless we are in debug mode
          if (!$.v.debug) {
            $.d.addEventListener("contextmenu", event =>
              event.preventDefault()
            );
          }
          $.d.h = $.d.getElementsByTagName("HEAD")[0];
          $.f.presentation({ obj: $.a.styles });
          $.f.buildOne({ obj: $.a.structure, el: $.d.b });
          $.f.debug("structure rendered");
          $.v.columnCount = Math.floor($.d.b.offsetWidth / 250);
          if ($.v.columnCount) {
            for (var i = 0; i < $.v.columnCount; i = i + 1) {
              var col = $.d.createElement("DIV");
              col.className = $.a.k + "_col";
              col.id = "c_" + i;
              $.s.grid.appendChild(col);
            }
            $.d.b.addEventListener("click", $.f.click);
            $.d.addEventListener("keydown", $.f.keydown);
            // freshen boards
            $.f.send({ act: "getBoards" });
          } else {
            $.f.debug("Not enough room to render grid columns; closing.");
            $.f.close();
          }
        }
      }
    }
  };
  // if an incoming message from script is for us and triggers a valid function, run it
  $.b.runtime.onMessage.addListener(r => {
    $.f.debug("message received");
    if (r.to && r.to === $.a.me) {
      if (r.act && typeof $.f.act[r.act] === "function") {
        $.f.act[r.act](r);
      }
    }
  });
  // get everything in local storage and then init
  $.b.storage.local.get(null, r => {
    for (let i in r) {
      $.v[i] = r[i];
    }
    // promote only the right subset of messages
    $.v.msg = $.v.msg.grid;
    $.f.init();
  });
})(window, document, {
  k: "GRID_" + new Date().getTime(),
  me: "grid",
  pop: {
    height: 650,
    width: 800
  },
  iframe: {
    style: {
      border: "none",
      display: "block",
      position: "fixed",
      height: "100%",
      width: "100%",
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
      margin: "0",
      clip: "auto",
      zIndex: "9223372036854775807"
    }
  },
  // our structure
  structure: {
    hd: {
      hdMsg: {},
      x: {}
    },
    grid: {}
  },
  // a SASS-like object to be turned into stylesheets
  styles: {
    body: {
      background: "#fff",
      margin: "0",
      padding: "0",
      "font-family":
        '"Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", arial, sans-serif',
      "%prefix%font-smoothing": "antialiased",
      "-moz-osx-font-smoothing": "grayscale",
      display: "none"
    },
    "*": {
      "%prefix%box-sizing": "border-box"
    },
    "._hd": {
      background:
        "rgba(255,255,255,1) url(data:image/svg+xml;base64,CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjMycHgiIHdpZHRoPSIzMnB4IiB2aWV3Qm94PSIwIDAgMzAgMzAiPjxnPjxwYXRoIGQ9Ik0yOS40NDksMTQuNjYyIEMyOS40NDksMjIuNzIyIDIyLjg2OCwyOS4yNTYgMTQuNzUsMjkuMjU2IEM2LjYzMiwyOS4yNTYgMC4wNTEsMjIuNzIyIDAuMDUxLDE0LjY2MiBDMC4wNTEsNi42MDEgNi42MzIsMC4wNjcgMTQuNzUsMC4wNjcgQzIyLjg2OCwwLjA2NyAyOS40NDksNi42MDEgMjkuNDQ5LDE0LjY2MiIgZmlsbD0iI2ZmZiI+PC9wYXRoPjxwYXRoIGQ9Ik0xNC43MzMsMS42ODYgQzcuNTE2LDEuNjg2IDEuNjY1LDcuNDk1IDEuNjY1LDE0LjY2MiBDMS42NjUsMjAuMTU5IDUuMTA5LDI0Ljg1NCA5Ljk3LDI2Ljc0NCBDOS44NTYsMjUuNzE4IDkuNzUzLDI0LjE0MyAxMC4wMTYsMjMuMDIyIEMxMC4yNTMsMjIuMDEgMTEuNTQ4LDE2LjU3MiAxMS41NDgsMTYuNTcyIEMxMS41NDgsMTYuNTcyIDExLjE1NywxNS43OTUgMTEuMTU3LDE0LjY0NiBDMTEuMTU3LDEyLjg0MiAxMi4yMTEsMTEuNDk1IDEzLjUyMiwxMS40OTUgQzE0LjYzNywxMS40OTUgMTUuMTc1LDEyLjMyNiAxNS4xNzUsMTMuMzIzIEMxNS4xNzUsMTQuNDM2IDE0LjQ2MiwxNi4xIDE0LjA5MywxNy42NDMgQzEzLjc4NSwxOC45MzUgMTQuNzQ1LDE5Ljk4OCAxNi4wMjgsMTkuOTg4IEMxOC4zNTEsMTkuOTg4IDIwLjEzNiwxNy41NTYgMjAuMTM2LDE0LjA0NiBDMjAuMTM2LDEwLjkzOSAxNy44ODgsOC43NjcgMTQuNjc4LDguNzY3IEMxMC45NTksOC43NjcgOC43NzcsMTEuNTM2IDguNzc3LDE0LjM5OCBDOC43NzcsMTUuNTEzIDkuMjEsMTYuNzA5IDkuNzQ5LDE3LjM1OSBDOS44NTYsMTcuNDg4IDkuODcyLDE3LjYgOS44NCwxNy43MzEgQzkuNzQxLDE4LjE0MSA5LjUyLDE5LjAyMyA5LjQ3NywxOS4yMDMgQzkuNDIsMTkuNDQgOS4yODgsMTkuNDkxIDkuMDQsMTkuMzc2IEM3LjQwOCwxOC42MjIgNi4zODcsMTYuMjUyIDYuMzg3LDE0LjM0OSBDNi4zODcsMTAuMjU2IDkuMzgzLDYuNDk3IDE1LjAyMiw2LjQ5NyBDMTkuNTU1LDYuNDk3IDIzLjA3OCw5LjcwNSAyMy4wNzgsMTMuOTkxIEMyMy4wNzgsMTguNDYzIDIwLjIzOSwyMi4wNjIgMTYuMjk3LDIyLjA2MiBDMTQuOTczLDIyLjA2MiAxMy43MjgsMjEuMzc5IDEzLjMwMiwyMC41NzIgQzEzLjMwMiwyMC41NzIgMTIuNjQ3LDIzLjA1IDEyLjQ4OCwyMy42NTcgQzEyLjE5MywyNC43ODQgMTEuMzk2LDI2LjE5NiAxMC44NjMsMjcuMDU4IEMxMi4wODYsMjcuNDM0IDEzLjM4NiwyNy42MzcgMTQuNzMzLDI3LjYzNyBDMjEuOTUsMjcuNjM3IDI3LjgwMSwyMS44MjggMjcuODAxLDE0LjY2MiBDMjcuODAxLDcuNDk1IDIxLjk1LDEuNjg2IDE0LjczMywxLjY4NiIgZmlsbD0iI2U2MDAyMyI+PC9wYXRoPjwvZz48L3N2Zz4=) 20px 50% no-repeat",
      color: "#333",
      height: "65px",
      "line-height": "65px",
      "font-size": "24px",
      "font-weight": "bold",
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      "z-index": "3",
      "text-align": "left",
      "text-indent": "65px",
      "%prefix%transform": "translateZ(0)",
      "._x": {
        "z-index": "4",
        opacity: ".5",
        position: "absolute",
        right: "25px",
        top: "0",
        cursor: "pointer",
        height: "65px",
        width: "15px",
        background:
          "transparent url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTVweCIgd2lkdGg9IjE1cHgiIHZpZXdCb3g9IjAgMCA4MCA4MCI+PGc+PGxpbmUgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiB4MT0iMTAiIHkxPSIxMCIgeDI9IjcwIiB5Mj0iNzAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyMCIvPjxsaW5lIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgeDE9IjcwIiB5MT0iMTAiIHgyPSIxMCIgeTI9IjcwIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMjAiLz48L2c+PC9zdmc+) 50% 50% no-repeat",
        "&:hover": {
          opacity: "1"
        }
      }
    },
    "._grid": {
      display: "block",
      margin: "72px 0 0 58px",
      "z-index": "1",
      "._col": {
        display: "inline-block",
        width: "236px",
        "vertical-align": "top",
        padding: "0 10px",
        "text-align": "left",
        "._thumb": {
          "border-radius": "8px",
          margin: "0 0 0 -10px",
          display: "block",
          width: "220px",
          background: "#eee",
          "vertical-align": "top",
          overflow: "hidden",
          cursor: "pointer",
          background: "#fff",
          position: "relative",
          border: "10px solid #fff",
          "&:hover": {
            background: "#eee",
            "border-color": "#eee"
          },
          "._mask": {
            position: "absolute",
            top: "0",
            left: "0",
            bottom: "0",
            right: "0"
          },
          "._searchButton": {
            position: "absolute",
            top: "8px",
            right: "8px",
            height: "40px",
            width: "40px",
            "border-radius": "20px",
            background:
              "rgba(0,0,0,.4) url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/Pjxzdmcgd2lkdGg9IjI0cHgiIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAwIDI0IDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxtYXNrIGlkPSJtIj48cmVjdCBmaWxsPSIjZmZmIiB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI2IiByeT0iNiIvPjxyZWN0IGZpbGw9IiMwMDAiIHg9IjUiIHk9IjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgcng9IjEiIHJ5PSIxIi8+PHJlY3QgZmlsbD0iIzAwMCIgeD0iMTAiIHk9IjAiIHdpZHRoPSI0IiBoZWlnaHQ9IjI0Ii8+PHJlY3QgZmlsbD0iIzAwMCIgeD0iMCIgeT0iMTAiIHdpZHRoPSIyNCIgaGVpZ2h0PSI0Ii8+PC9tYXNrPjwvZGVmcz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjbSkiLz48L3N2Zz4=) 50% 50% no-repeat",
            "background-size": "24px 24px",
            opacity: "0",
            "z-index": "2"
          },
          "._saveButton": {
            position: "absolute",
            top: "10px",
            left: "10px",
            width: "auto",
            "border-radius": "4px",
            background:
              "#e60023 url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjEwcHgiIGhlaWdodD0iMjBweCIgdmlld0JveD0iMCAwIDEwIDIwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogIDxnPgogICAgPHBhdGggZD0iTTAuNDgzMDc2OSwwIEMwLjQ4MzA3NjksMC43NzIxNDI5IDEuMzI1Mzg0NiwxLjQzMjg1NzEgMi4xMzc2OTIzLDEuNzg0Mjg1NyBMMi4xMzc2OTIzLDcuMzU3MTQyOSBDMC43NTg0NjE1LDguMTQyODU3MSAwLDkuNzUzNTcxNCAwLDExLjQyODU3MTQgTDQuMjAyMzA3NywxMS40Mjg1NzE0IEw0LjIwMTUzODUsMTcuMjEyMTQyOSBDNC4yMDE1Mzg1LDE3LjIxMjE0MjkgNC4zNDE1Mzg1LDE5LjY1OTI4NTcgNSwyMCBDNS42NTc2OTIzLDE5LjY1OTI4NTcgNS43OTc2OTIzLDE3LjIxMjE0MjkgNS43OTc2OTIzLDE3LjIxMjE0MjkgTDUuNzk2OTIzMSwxMS40Mjg1NzE0IEwxMCwxMS40Mjg1NzE0IEMxMCw5Ljc1MzU3MTQgOS4yNDE1Mzg1LDguMTQyODU3MSA3Ljg2MTUzODUsNy4zNTcxNDI5IEw3Ljg2MTUzODUsMS43ODQyODU3IEM4LjY3NDYxNTQsMS40MzI4NTcxIDkuNTE2MTUzOCwwLjc3MjE0MjkgOS41MTYxNTM4LDAgTDAuNDgzMDc2OSwwIEwwLjQ4MzA3NjksMCBaIiBmaWxsPSIjRkZGRkZGIj48L3BhdGg+CiAgPC9nPgo8L3N2Zz4=) 10px 9px no-repeat",
            "background-size": "10px 20px",
            padding: "0 10px 0 0",
            "text-indent": "26px",
            color: "#fff",
            "font-size": "14px",
            "line-height": "36px",
            "font-family": '"Helvetica Neue", Helvetica, Arial, sans-serif',
            "font-style": "normal",
            "font-weight": "bold",
            "text-align": "left",
            "%prefix%font-smoothing": "antialiased",
            "-moz-osx-font-smoothing": "grayscale",
            opacity: "0"
          },
          "&:hover ._saveButton, &:hover ._searchButton, &:hover ._ft ._dimensions": {
            opacity: "1"
          },
          img: {
            display: "block",
            width: "200px",
            "border-radius": "8px"
          },
          "._imageless": {
            display: "block",
            "border-radius": "8px",
            height: "200px",
            width: "200px",
            position: "relative",
            overflow: "hidden",
            "._site, ._text": {
              position: "absolute",
              color: "#fff",
              left: "15px"
            },
            "._site": {
              top: "20px",
              "font-size": "11px"
            },
            "._text": {
              width: "200px",
              "word-wrap": "break-word",
              "font-size": "19px",
              top: "38px",
              "line-height": "22px",
              "padding-right": "22px",
              "font-weight": "bold",
              "letter-spacing": "-1px"
            }
          },
          "._ft": {
            display: "block",
            span: {
              position: "relative",
              display: "block",
              padding: "10px",
              color: "#333",
              "font-size": "12px"
            },
            "._dimensions": {
              "border-bottom-left-radius": "8px",
              "border-bottom-right-radius": "8px",
              padding: "0",
              position: "absolute",
              top: "-24px",
              height: "24px",
              "line-height": "24px",
              left: "0",
              "text-align": "center",
              width: "100%",
              background: "rgba(0,0,0,.2)",
              color: "#fff",
              "font-size": "10px",
              "font-style": "normal",
              "%prefix%font-smoothing": "antialiased",
              "-moz-osx-font-smoothing": "grayscale",
              opacity: "0"
            }
          }
        }
      }
    }
  }
});
