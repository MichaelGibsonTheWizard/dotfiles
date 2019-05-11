// be smarter about checking auth, csrftoken, and pfob cookies
// don't double-log pfob

// our logic version
const VERSION = 2019050301;

((w, d, a) => {
  var $ = (w[a.k] = {
    w,
    d,
    a,
    b: chrome || browser,
    // local global variables
    v: {
      debug: false,
      lang: "en",
      domain: "www",
      hazButton: false,
      nopin: false,
      observer: {},
      meta: {},
      msg: {}
    },
    // Structure: button and iframe overlays will live here
    s: {},
    f: {
      // console.log to background window
      debug: o => {
        if (o && $.v.debug) {
          console.log(o);
        }
      },
      // get a DOM property or text attribute
      get: o => {
        var v = null;
        if (typeof o.el[o.att] === "string") {
          v = o.el[o.tt];
        } else {
          v = o.el.getAttribute(o.att);
        }
        return v;
      },
      // set a DOM property or text attribute
      set: o => {
        if (typeof o.el[o.att] === "string") {
          o.el[o.att] = o.string;
        } else {
          o.el.setAttribute(o.att, o.string);
        }
      },
      // remove a DOM element
      kill: o => {
        if (o.el && o.el.parentNode) {
          o.el.parentNode.removeChild(o.el);
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
      sendMessage: o => {
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
        o.lv = $.a.version;
        if (!o.via) {
          o.via = $.d.URL;
        }
        $.f.sendMessage({
          act: "log",
          data: o
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
      // determine our experimental segment
      getSegment: () => {
        let t = $.v.xuid.split("");
        $.v.segment =
          ($.a.version +
            $.a.digits.indexOf(t[0]) +
            $.a.digits.indexOf(t[1]) +
            $.a.digits.indexOf(t[2])) %
          100;
        $.f.debug("Your segment: " + $.v.segment);
      },
      // if we're right-clicking on an image, save it to $.v.contextEl
      context: e => {
        let t;
        if (e.button === 2) {
          t = e.target;
          if (t && t.tagName && t.tagName === "IMG") {
            $.v.contextEl = t;
          }
        }
      },
      // get the position of a DOM element
      getPos: o => {
        var positionTop = 0,
          positionLeft = 0,
          positionOffsetTop = 0,
          positionOffsetLeft = 0;

        positionOffsetTop =
          $.w
            .getComputedStyle(o.el, null)
            .getPropertyValue("top")
            .replace(/[A-Za-z]/g, "") - 0;
        positionOffsetLeft =
          $.w
            .getComputedStyle(o.el, null)
            .getPropertyValue("left")
            .replace(/[A-Za-z]/g, "") - 0;

        if (o.el.offsetParent) {
          do {
            positionLeft = positionLeft + o.el.offsetLeft;
            positionTop = positionTop + o.el.offsetTop;
          } while ((o.el = o.el.offsetParent));

          if (positionOffsetTop < 0) {
            positionTop = positionTop + positionOffsetTop;
          }
          if (positionOffsetLeft < 0) {
            positionLeft = positionLeft + positionOffsetLeft;
          }

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

      // get image data for save/search
      getImageData: img => {
        let i, r, dataPinId;
        r = {};
        dataPinId = $.f.get({ el: img, att: "data-pin-id" });
        r.media = $.f.get({ el: img, att: "data-pin-media" }) || img.currentSrc;
        r.description =
          $.f.get({ el: img, att: "data-pin-description" }) ||
          img.title ||
          $.d.title;
        if (r.media === $.d.URL) {
          r.description = "";
        }
        if (dataPinId) {
          r.id = dataPinId;
        } else {
          r.url = $.f.get({ el: img, att: "data-pin-url" }) || $.d.URL;
        }
        return r;
      },
      // open the pin create form
      pop: o => {
        let query,
          data,
          logMe,
          dualScreenLeft,
          dualScreenTop,
          height,
          width,
          left,
          top;

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
        data = $.f.getImageData(o.img);
        data.method = o.method;
        // what to log
        logMe = { event: "click", xm: data.method };
        if (data.id) {
          // repin
          query = $.v.rePinCreate.replace(/%s/, data.id);
          // log the pin ID
          logMe.repin = data.id;
        } else {
          query =
            $.v.pinCreate +
            "?url=" +
            encodeURIComponent(data.url) +
            "&media=" +
            encodeURIComponent(data.media) +
            "&xm=" +
            data.method +
            "&xv=" +
            $.v.xv +
            "&xuid=" +
            $.v.xuid +
            "&description=" +
            encodeURIComponent(data.description);
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
        // log it
        $.f.log(logMe);
      },
      // context click will pin this image
      checkImage: o => {
        let r, f, i;
        // an array of functions to be run in order
        f = [
          // be sure we have an image
          () => {
            if (!o.img) {
              return true;
            }
          },
          // be sure our image has a source
          () => {
            if (!o.img.currentSrc) {
              return true;
            }
          },
          // be sure our source comes from a server so we can verify
          () => {
            if (
              !o.img.currentSrc.match(/^http/) &&
              !o.img.currentSrc.match(/^data/)
            ) {
              return true;
            }
          },
          // be sure height AND width are greater than 90px
          () => {
            if (o.img.naturalHeight < 90 || o.img.naturalWidth < 90) {
              return true;
            }
          },
          // if we're at least 90x90, check that height OR width > 119
          () => {
            if (o.img.naturalHeight > 119 || o.img.naturalWidth > 119) {
              return false;
            } else {
              return true;
            }
          },
          // some images are resized using img.height and img.width; don't hover over these if they are too small
          () => {
            if (o.img.height < 90 || o.img.height < 90) {
              return true;
            }
          },
          // if we're at least 90x90, check that height OR width > 119
          () => {
            if (o.img.height > 119 || o.img.height > 119) {
              return false;
            } else {
              return true;
            }
          },
          // don't offer to pin images that are more than 3x wider than they are tall
          () => {
            if (o.img.naturalHeight < o.img.naturalWidth / 3) {
              return true;
            }
          },
          // don't pin if our image has nopin or data-pin-nopin
          () => {
            if (
              o.img.getAttribute("nopin") ||
              o.img.getAttribute("data-pin-nopin")
            ) {
              return true;
            }
          }
        ];

        // assume the image is good
        r = false;

        // if r turns true at any point, quit checking
        for (i = 0; i < f.length; i = i + 1) {
          r = f[i](o);
          if (r) {
            break;
          }
        }

        return r;
      },
      // overlays should only show on top level window OR in iframes that are the same size as window.top
      canHazOverlay: () => {
        let r = false;
        // are we in the top frame?
        if ($.w.self === $.w.top) {
          // we're good
          r = true;
        } else {
          // can we run inside this iframe?
          $.f.debug("We are inside an iframe.");
          // this is in a try/catch block because looking at the parent window's size may trigger a cross-origin frame access warning
          try {
            if (
              $.w.top.innerHeight === $.w.self.innerHeight &&
              $.w.top.innerWidth === $.w.self.innerWidth
            ) {
              $.f.debug(
                "This iframe is the same size as the top window; allowing the extension to run."
              );
              // are we on Naver or Daum?
              if (
                $.w.top.location.href.match(/^https?:\/\/blog\.naver\.com\//) ||
                $.w.top.location.href.match(/^https?:\/\/blog\.daum\.net\//)
              ) {
                r = true;
              }
            } else {
              $.f.debug(
                "This frame's dimensions: " +
                  $.w.self.innerHeight +
                  "x" +
                  $.w.self.innerWidth
              );
              $.f.debug(
                "Top window dimensions: " +
                  $.w.top.innerHeight +
                  "x" +
                  $.w.top.innerWidth
              );
            }
          } catch (err) {
            // $.f.debug('This error message was caught so it doesn\'t clutter up console.log.');
            // $.f.debug(err);
          }
        }
        return r;
      },
      // warn that you can't pin
      warn: o => {
        // don't pop alerts from iframes
        if (!o.msg) {
          o.msg = $.b.i18n.getMessage("errorPin");
        }
        $.w.alert(o.msg);
      },
      // open an iframe overlay
      openOverlay: o => {
        let path,
          postMessageObj = {},
          witnessMe,
          writeStyles;

        // be sure there's an ID; don't open more than one copy of any overlay
        if (o.id && !$.s[o.id]) {
          // save scroll position
          $.v.pageX = $.w.pageXOffset;
          $.v.pageY = $.w.pageYOffset;

          path = "/html/" + o.id + ".html";

          // test Pinterest-hosted iframe overlay
          if (o.id === "create" && $.v.ctrl.canHaz.iframeSave) {
            o.id = "save";
            path = "/html/save.html";
          }

          // id will be grid, create, or search
          $.s[o.id] = $.f.make({
            IFRAME: {
              src: $.b.extension.getURL(path)
            }
          });

          // watch our iframe for attribute changes
          witnessMe = () => {
            // set $.v.observer.grid for the grid, $.v.observer.create for create, etc.
            // IMPORTANT: observer callback function must not use arrow notation, because we need local "this" to disconnect
            $.v.observer[o.id] = new MutationObserver(function(o) {
              // keep an eye on our styles
              if (
                o[0].attributeName === "style" ||
                o[0].attributeName === "class"
              ) {
                // we might want to log document.URL for future analysis
                $.f.debug("overlay styles have changed; rewriting");
                // disconnect the current observer so we don't trigger it again when we rewrite styles
                this.disconnect();
                // rewrite the proper styles back into the iframe
                writeStyles(o[0].target);
                // log this event (only once, in case the page keeps trying)
                if (!$.v.hazWitnessed) {
                  $.v.hazWitnessed = true;
                  $.f.log({
                    event: "witness",
                    via: $.d.URL
                  });
                }
              }
            });
            $.v.observer[o.id].observe($.s[o.id], { attributes: true });
          };

          // style our iframe and make sure nobody has tried to attach a className
          writeStyles = el => {
            // our iframes should never have class names
            el.removeAttribute("class");
            // brute force our styles because we want !important on each item
            el.setAttribute("style", $.a.overlay.style.join("!important;"));
            // connect a mutation observer to watch for changes in iframe styling
            witnessMe();
          };

          // write the original style set
          writeStyles($.s[o.id]);

          // after we load, request data
          $.s[o.id].onload = () => {
            // optional background thing to do after loading
            if (o.act) {
              $.f.sendMessage({ to: "background", act: o.act });
            }
            // populate the overlay with whatever we're showing
            if (o.data) {
              o.data.meta = $.v.meta;
              $.f.sendMessage({
                to: "background",
                act: "populate" + o.id.charAt(0).toUpperCase() + o.id.slice(1),
                data: o.data
              });
            }
            // might be able to combine this with o.act
            if (o.callback) {
              o.callback();
            }
            // always steal focus
            $.s[o.id].focus();
            $.f.log({
              event: "open",
              overlay: o.id
            });
          };
          // append to DOM
          $.d.b.appendChild($.s[o.id]);
        }
      },
      // close an iframe overlay
      closeOverlay: o => {
        if (o.id && $.s[o.id]) {
          $.f.debug("closing " + o.id);
          // shut down iframe style observers
          if ($.v.observer[o.id]) {
            $.v.observer[o.id].disconnect();
            delete $.v.observer[o.id];
          }
          $.f.kill({ el: $.s[o.id] });
          delete $.s[o.id];
          $.f.log({
            event: "close",
            overlay: o.id
          });
          $.w.scrollTo($.v.pageX, $.v.pageY);
        }
      },
      // functions that may be called by messages from the background process
      act: {
        // ask for fresh context menus
        refreshContext: () => {
          // start with the nosearch flag
          let hideSearch = $.v.nosearch;
          // should we hide search because we're not logged in?
          if (!$.v.hazLogin && $.v.ctrl.search.authRequired) {
            hideSearch = true;
          }
          // in case we switch between tabs we need to check this again
          if (!$.f.canHazOverlay()) {
            $.v.nopin = true;
            hideSearch = true;
          }
          $.f.sendMessage({
            to: "background",
            act: "refreshContextMenus",
            data: {
              nopin: $.v.nopin,
              nosearch: hideSearch
            }
          });
        },
        // background process says we've right-clicked and chosen Save
        contextSave: () => {
          let data;
          if ($.v.contextEl) {
            if ($.v.nopin || $.f.checkImage({ img: $.v.contextEl })) {
              $.f.warn({});
            } else {
              if ($.v.hazLogin) {
                data = $.f.getImageData($.v.hoverImage);
                data.method = "r";
                $.f.act.openCreate({ data: data });
              } else {
                $.f.pop({ img: $.v.hoverImage, method: "r" });
              }
            }
          } else {
            $.f.debug("No context element");
          }
        },
        // background has sent us the word on whether we should block features for this domain
        renderFeatureBlock: o => {
          if (o.data) {
            $.f.debug("Shall we block features by domain hash?");
            $.f.debug(o.data);
            if (o.data.nopin === true) {
              $.v.nopin = true;
            }
            if (o.data.nohover === true) {
              $.v.nohover = true;
            }
            if (o.data.nosearch === true) {
              $.v.nosearch = true;
            }
          }
          // always re-flag the browser button and context menus
          $.f.act.refreshContext();
        },
        // open the search form
        openSearch: o => {
          if (o.data) {
            $.f.openOverlay({ id: "search", data: o.data });
          }
        },
        // close the search form
        closeSearch: () => {
          $.f.closeOverlay({ id: "search" });
        },
        // open the pin create form
        openCreate: o => {
          if (o.data) {
            $.f.openOverlay({ id: "create", act: "getBoards", data: o.data });
          }
        },
        // close the pin create form
        closeCreate: () => {
          $.f.closeOverlay({ id: "create" });
        },
        // close the save form
        closeSave: () => {
          $.f.closeOverlay({ id: "save" });
        },
        // open the thumbnail grid
        openGrid: o => {
          if ($.v.nopin) {
            $.f.log({
              event: "click",
              action: "open_grid",
              error: "nopin_domain"
            });
            $.f.warn({
              msg: $.v.customNoPinDomain || $.v.msg.noPinDomain
            });
          } else {
            $.f.openOverlay({
              id: "grid",
              callback: () => {
                if ($.v.pinmarklet) {
                  try {
                    eval($.v.pinmarklet);
                  } catch (err) {
                    $.f.debug(err);
                  }
                }
              }
            });
          }
        },
        // close the thumbnail grid
        closeGrid: () => {
          $.f.closeOverlay({ id: "grid" });
        },
        // digest the results of login (and pfob) cookie check
        pongLogin: o => {
          $.f.debug("Login check has returned!");
          $.v.hazLogin = o.data.auth;
          // check if we can log PFOB
          if ($.v.hazLogin === true) {
            $.f.debug(
              "PFOB: Logged in to Pinterest.  Checking to see if we have PFOB turned off on the back end."
            );
            if ($.v.ctrl.canHaz.pfob) {
              $.f.debug(
                "PFOB: is allowed per global flag.  Checking for specific user permissions."
              );
              if (!$.w.navigator.doNotTrack && !$.w.doNotTrack) {
                $.f.debug("PFOB: Do Not Track flag not found.");
                if (!$.v.nopeList) {
                  $.f.debug("PFOB: Not on a domain mentioned in the Nope List");
                  if (o.data.pfob) {
                    $.f.debug("PFOB: is allowed by user settings.");
                    if ($.d.referrer) {
                      $.f.debug(
                        "PFOB: found document.referrer; logging for PFOB."
                      );
                      // don't double-log pfob
                      if (!$.v.hazLoggedPfob) {
                        $.v.hazLoggedPfob = true;
                        $.f.log({
                          anon: true,
                          event: "pfob",
                          via: $.d.URL.split("/")[2],
                          ref: $.d.referrer.split("/")[2]
                        });
                      }
                    } else {
                      $.f.debug(
                        "PFOB: did NOT find document.referrer; not logging."
                      );
                    }
                  } else {
                    $.f.debug(
                      "PFOB: is either disallowed or not set; not logging."
                    );
                  }
                } else {
                  $.f.debug("PFOB: domain appears on the Nope List.");
                }
              } else {
                $.f.debug("PFOB: Do Not Track is enabled; not logging.");
              }
            } else {
              $.f.debug(
                "PFOB is NOT allowed, because canHaz.pfob = " +
                  $.v.ctrl.canHaz.pfob
              );
            }
          } else {
            $.f.debug(
              "NOT logged in to Pinterest, so not checking on PFOB status."
            );
          }
        }
      },
      // hide hoverbuttons
      hide: () => {
        // this timeout is global, so we can cancel it when we're over the image and we move over the button
        $.v.hazFade = $.w.setTimeout(() => {
          $.s.buttonSave.style.display = "none";
          $.s.buttonSearch.style.display = "none";
          $.v.hazButton = false;
        }, 10);
      },
      // mouse over
      over: e => {
        var p,
          m,
          el = $.f.getEl(e);
        if (el && el.tagName) {
          $.v.hazButtonOver = false;
          if (el === $.s.buttonSave || el === $.s.buttonSearch) {
            // we won't allow our overlays to render unless we have a click AND our mouse is over the button
            $.v.hazButtonOver = true;
            // we've just moved from inside an image to the visible button
            // stop hiding the button and exit
            $.w.clearTimeout($.v.hazFade);
          } else {
            if (el.tagName === "IMG") {
              // should we just show the Search button?
              if (
                !$.v.hazLogin &&
                !el.currentSrc.match(/^((http|https):\/\/)/)
              ) {
                $.s.buttonSave.style.display = "none";
              } else {
                if (!$.v.nopin) {
                  if (!$.f.checkImage({ img: el })) {
                    $.v.hoverImage = el;
                    const getVisibleWidth = o => {
                      // init values on first run
                      if (!o["count"]) {
                        o.count = 0;
                        o.width = $.a.getVisible.initWidth;
                      }
                      if (o.count > $.a.getVisible.maxIterations) {
                        // we're done
                        return o.width;
                      } else {
                        // run again on parent node or document.body
                        return getVisibleWidth({
                          // three levels up may take us above the main HTML element
                          el: o.el.parentNode || $.d.body,
                          // use the smaller of the width we passed in versus our current element's width
                          // although they are not as clear to read, bitwise operators used to be much faster than Math.min
                          // not sure if this is still true; trying to find out now
                          width:
                            o.width < o.el.offsetWidth
                              ? o.width
                              : o.el.offsetWidth,
                          // add to our count so we can quit after three iterations
                          count: o.count + 1
                        });
                      }
                    };
                    const visibleWidth = getVisibleWidth({
                      el: $.v.hoverImage
                    });
                    p = $.f.getPos({ el: el });
                    if (!$.v.nohover) {
                      // append to body on first hover over eligible image
                      if (!$.v.bodyHazButtonSave) {
                        $.d.b.appendChild($.s.buttonSave);
                        $.v.bodyHazButtonSave = true;
                      }
                      $.s.buttonSave.style.top =
                        p.top + $.a.save.offset.top + "px";
                      $.s.buttonSave.style.left =
                        p.left + $.a.save.offset.left + "px";
                      $.s.buttonSave.style.display = "block";
                      $.v.hazButton = true;
                    }
                    // complex dance around showing Search button
                    if (!$.v.nosearch && !$.v.nohover) {
                      if ($.v.hazLogin || !$.v.ctrl.search.authRequired) {
                        // append to body on first hover over eligible image
                        if (!$.v.bodyHazButtonSearch) {
                          $.d.b.appendChild($.s.buttonSearch);
                          $.v.bodyHazButtonSearch = true;
                        }
                        $.s.buttonSearch.style.display = "block";
                        $.s.buttonSearch.style.top =
                          p.top + $.a.save.offset.top - 2 + "px";
                        $.s.buttonSearch.style.left =
                          p.left + (visibleWidth || el.width) - 32 + "px";
                        $.v.hazButton = true;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // mouse out
      out: e => {
        var el = $.f.getEl(e);
        // if we have hoverbuttons
        if ($.v.hazButton) {
          // hide if we did not just exit one of them
          if (el !== $.s.buttonSave && el !== $.s.buttonSearch) {
            $.f.hide();
          }
        }
      },
      // click
      click: e => {
        let el, data;
        el = $.f.getEl(e);
        if (el === $.s.buttonSave && $.v.hazButtonOver) {
          if ($.v.hoverImage) {
            data = $.f.getImageData($.v.hoverImage);
            if ($.v.hazLogin) {
              data.method = "h";
              $.f.act.openCreate({ data: data });
            } else {
              $.f.pop({ img: $.v.hoverImage, method: "h" });
            }
          }
        }
        if (el === $.s.buttonSearch && $.v.hazButtonOver) {
          if ($.v.hoverImage) {
            data = $.f.getImageData($.v.hoverImage);
            $.f.act.openSearch({ data: { method: "h", searchMe: data.media } });
          }
        }
      },
      // check page for reasons we might not want to pin or show hoverbuttons
      check: () => {
        let i, f;
        f = [
          // init $.v.nopin and $.v.nohover
          () => {
            let i;
            for (i in $.a.seek) {
              $.v[$.a.seek[i]] = false;
            }
            // do we have hoverbuttons hidden in preferences?
            if ($.v.hideHoverButtons) {
              $.v.nohover = true;
            }
          },
          // no pinning from Pinterest
          () => {
            let pinterestMatch = /^https?:\/\/(([a-z]{1,3}|latest)\.)?pinterest\.([a-z]{0,2}\.)?([a-z]{1,3})\//;

            /*
            ^ = only look at the beginning of the string
            https? = http or https
            \/\/ = escaped //
            (([a-z]{1,3})\.)? = one to three characters of lowercase letters followed by a dot, OR nothing
            pinterest\. = pinterest followed by an escaped dot
            ([a-z]{0,2}\.)? = zero to two lowercase letters followed by a dot, OR nothing (the co. in co.uk)
            ([a-z]{2,3}) = two or three lower-case characters (br, de, com)
            \/ = trailing forward-slash after top-level domain (so we don't get caught by pinterest.completelybogus.org)
            */

            // important: test document.URL, not document.domain, which won't have the http/https protocol
            if ($.d.URL.match(pinterestMatch)) {
              $.f.debug("Nopin: Pinterest app");
              $.v.nopin = true;
            }
          },
          // check our onboard nopin / nohover lists
          () => {
            let i, n;
            for (i = 0, n = $.a.nopeList.length; i < n; i = i + 1) {
              if ($.d.URL.match($.a.nopeList[i])) {
                $.f.debug(
                  "nopeList: " + $.d.URL + " matches " + $.a.nopeList[i]
                );
                $.v.nopeList = true;
                $.v.nopin = true;
                break;
              }
            }
            for (i = 0, n = $.a.noHoverList.length; i < n; i = i + 1) {
              // we're using $.d.URL because it includes the protocol
              if ($.d.URL.match($.a.noHoverList[i])) {
                $.f.debug(
                  "Nohover: " + $.d.domain + " matches " + $.a.noHoverList[i]
                );
                $.v.nohover = true;
              }
            }
          },
          // gather metadata and set special flags for nopin, hover, and nosearch
          () => {
            let patch,
              mod = {},
              arr = [],
              obj = {},
              meta = $.d.getElementsByTagName("META"),
              key,
              value,
              i,
              j,
              k,
              p,
              q,
              z,
              lkey,
              lvalue;
            // scrape our META tags, looking for keys and values
            for (i = 0; i < meta.length; i = i + 1) {
              value = meta[i].getAttribute("content");
              if (value) {
                // get the property or name
                key =
                  meta[i].getAttribute("property") ||
                  meta[i].getAttribute("name");
                if (key) {
                  // push into an array so we can sort it later
                  arr.push({ k: key, v: value });
                  // if a key is one of the ones we're looking for (nopin, nohover, nosearch) set it
                  lkey = key.toLowerCase();
                  lvalue = value.toLowerCase();
                  if (lkey === "pinterest") {
                    // does the value correspond to nopin, nohover, or nosearch?
                    if ($.a.seek[lvalue]) {
                      // $.v.nopin, $.v.nohover, or $.v.nosearch = true
                      $.v[lvalue] = true;
                    }
                    // shall we add the custom error description?
                    if (lvalue === "nopin") {
                      if (meta[i].getAttribute("description")) {
                        $.v.customNoPinDomain = meta[i].getAttribute(
                          "description"
                        );
                      }
                    }
                  }
                }
              }
            }
            // sort our array so we don't wind up overwriting things as we split on colons
            arr.sort(function(a, b) {
              var r = 0;
              if (a.k > b.k) {
                r = 1;
              } else {
                if (a.k < b.k) {
                  r = -1;
                }
              }
              return r;
            });
            // our array now contains objects with keys and values, sorted by key
            for (i = 0; i < arr.length; i = i + 1) {
              // split each key on the colon
              k = arr[i].k.split(":");
              // start at the root of the object we're working on
              z = obj;
              for (j = 0; j < k.length; j = j + 1) {
                if (typeof z[k[j]] === "undefined") {
                  // make a new sub-object
                  z[k[j]] = {};
                }
                // go again
                z = z[k[j]];
              }
              // see if we've seen this one before
              q = typeof z["~"];
              if (q === "undefined") {
                // key does not exist, so add it
                z["~"] = arr[i].v;
              } else {
                // turn existing duplicate strings into arrays
                if (q === "string") {
                  // convert the existing string into the first element of an array
                  z["~"] = [z["~"]];
                }
                // push the next value onto the array
                z["~"].push(arr[i].v);
              }
            }
            // recursively fix up the naive object so strings show as strings
            // but objects that have both strings and sub-objects aren't lost
            patch = function(o, parentObj, parentKey) {
              for (var k in o) {
                if (typeof o[k] === "object") {
                  // is this member zero of an array?
                  if (typeof o[k][0] === "string") {
                    parentObj[parentKey] = o[k];
                  } else {
                    patch(o[k], o, k);
                  }
                } else {
                  // if we have only one key, it's the ~, so we can set object[key] equal to its string value
                  if (Object.keys(o).length === 1) {
                    parentObj[parentKey] = o[k];
                  }

                  // YOLO ALERT: this will deliver misleading results for situations like this:
                  //
                  //   <meta name="foo" content="woo">
                  //   <meta name="foo" content="yay">
                  //   <meta name="foo:bar" content="baz">
                  //
                  // ... where we will get:
                  //
                  //     foo:["woo","yay"]
                  //
                  // ... instead of:
                  //
                  //     foo:{"~":["woo", "yay"],"bar":"baz"}
                  //
                  // As of right now this is good enough for what we need
                }
              }
              return o;
            };
            // Now that we have $.v.meta, send it with all new pins
            $.v.meta = patch(obj, null, null);
          },
          // don't overwrite hoverbuttons made by pinit.js, which may be customized
          () => {
            if ($.d.b && $.d.b.getAttribute("data-pin-hover")) {
              $.f.debug("data-pin-hover found!");
              $.v.nohover = true;
            }
          },
          // check for feature block (sets $.v.hover, $.v.search, and $.v.pin)
          () => {
            $.f.sendMessage({
              act: "checkFeatureBlock",
              domain: $.d.domain
            });
          }
        ];
        for (let i = 0; i < f.length; i = i + 1) {
          f[i]();
        }
      },
      init: () => {
        // check for logins
        $.f.sendMessage({ to: "background", act: "login" });
        if (!$.f.canHazOverlay()) {
          $.v.nopin = true;
          $.v.nosearch = true;
          // tell the background process to hide context menus
          $.f.act.refreshContext();
        } else {
          // shall we hide search from users who are not signed in to Pinterest?
          if ($.v.ctrl.search.authRequired) {
            // give me a number from 0 to 99, based on $.a.version + $.v.xuid
            $.f.getSegment();
            if ($.v.segment < $.v.ctrl.search.unauthPercent) {
              $.v.ctrl.search.authRequired = false;
            }
          }
          $.d.b = $.d.getElementsByTagName("BODY")[0];
          // identity changes with each page load so we avoid weird conditions such as delayed messages from background
          $.v.me = $.f.random60();
          // pin and repin create pop-ups may have different domains
          $.v.pinCreate = $.a.endpoint.pinCreate;
          $.v.rePinCreate = $.a.endpoint.rePinCreate;
          $.d.addEventListener("mousedown", $.f.context);
          // check for nopin / nohover metas;
          if ($.d.domain) {
            // go look for reasons why we might not want to show hoverbuttons or allow pinning
            $.f.check();
          }
          // make Save button
          $.s.buttonSave = $.f.make({
            SPAN: {
              innerText: $.v.msg.saveAction
            }
          });
          $.s.buttonSave.setAttribute(
            "style",
            $.a.save.style.join("!important;")
          );
          // make Search button
          $.s.buttonSearch = $.d.createElement("SPAN");
          $.s.buttonSearch.setAttribute(
            "style",
            $.a.search.style.join("!important;")
          );
          // if we click, check if we need to pin
          $.d.b.addEventListener("click", $.f.click);
          // if we mouse over an element, check if we need to show hoverbuttons
          $.d.b.addEventListener("mouseover", $.f.over);
          // if we mouse out of an element, check if we need to hide hoverbuttons
          $.d.b.addEventListener("mouseout", $.f.out);
          // if the tab changes, hide hoverbuttons
          $.w.addEventListener("blur", $.f.hide);
        }
      }
    }
  });
  // if an incoming message from script is for us and triggers a function in $.f.act, run it
  $.b.runtime.onMessage.addListener(r => {
    if (r.to && (r.to === $.v.me || r.to === "content")) {
      $.f.debug("Message received.");
      $.f.debug(r);
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
    $.v.msg = $.v.msg.logic;
    $.f.init();
  });
})(window, document, {
  k: "LOGIC",
  version: VERSION,
  // searchAuthRequired: SEARCH_AUTH_REQUIRED,
  // searchUnauthPercent: SEARCH_UNAUTH_PERCENT,
  digits: "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnopqrstuvwxyz",
  endpoint: {
    pinCreate: "https://www.pinterest.com/pin/create/extension/",
    rePinCreate: "https://www.pinterest.com/pin/%s/repin/x/"
  },
  overlay: {
    style: [
      "border: none",
      "display: block",
      "position: fixed",
      "height: 100%",
      "width: 100%",
      "top: 0",
      "right: 0",
      "bottom: 0",
      "left: 0",
      "margin: 0",
      "clip: auto",
      "opacity: 1",
      "z-index: 9223372036854775807"
    ]
  },
  getVisible: {
    initWidth: 2000,
    maxIterations: 3
  },
  search: {
    style: [
      "width: 24px",
      "height: 24px",
      "background: rgba(0,0,0,.4) url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/Pjxzdmcgd2lkdGg9IjI0cHgiIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAwIDI0IDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxtYXNrIGlkPSJtIj48cmVjdCBmaWxsPSIjZmZmIiB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI2IiByeT0iNiIvPjxyZWN0IGZpbGw9IiMwMDAiIHg9IjUiIHk9IjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgcng9IjEiIHJ5PSIxIi8+PHJlY3QgZmlsbD0iIzAwMCIgeD0iMTAiIHk9IjAiIHdpZHRoPSI0IiBoZWlnaHQ9IjI0Ii8+PHJlY3QgZmlsbD0iIzAwMCIgeD0iMCIgeT0iMTAiIHdpZHRoPSIyNCIgaGVpZ2h0PSI0Ii8+PC9tYXNrPjwvZGVmcz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjbSkiLz48L3N2Zz4=) 50% 50% no-repeat",
      "background-size: 14px 14px",
      "position: absolute",
      "opacity: 1",
      "z-index: 8675309",
      "display: none",
      "cursor: pointer",
      "border: none",
      "border-radius: 12px"
    ]
  },
  save: {
    domain: {
      www: true,
      uk: true,
      br: true,
      jp: true,
      fr: true,
      es: true,
      pl: true,
      de: true,
      ru: true,
      it: true,
      au: true,
      nl: true,
      tr: true,
      id: true,
      hu: true,
      pt: true,
      se: true,
      cz: true,
      gr: true,
      kr: true,
      ro: true,
      dk: true,
      sk: true,
      fi: true,
      in: true,
      no: true,
      za: true,
      nz: true
    },
    lookup: {
      // alt location: cs
      cs: {
        d: "cz"
      },
      // alt location: dk
      da: {
        d: "dk"
      },
      // default de / de-de; alt de-at
      de: {
        alt: {
          // Austria
          at: "de"
        }
      },
      // alt locale: gr; Greece also gets requests for el-cy
      el: {
        d: "gr",
        alt: {
          // Cyprus
          cy: "gr"
        }
      },
      // English has many alt domains
      en: {
        alt: {
          // Australia
          au: "au",
          // Great Britain
          gb: "uk",
          // Ireland
          ie: "uk",
          // India
          in: "in",
          // New Zealand
          nz: "nz",
          // United Kingdom
          uk: "uk",
          // South Africa
          za: "za"
        }
      },
      // Spanish also has many alt domains
      es: {
        alt: {
          // Latin America
          "419": "www",
          // Argentina
          ar: "www",
          // Chile
          cl: "www",
          // Columbia
          co: "www",
          // Latin America
          la: "www",
          // Mexico
          mx: "www",
          // Peru
          pe: "www",
          // USA
          us: "www",
          // Uruguay
          uy: "www",
          // Venezuela
          ve: "www",
          // Latin America
          xl: "www"
        }
      },
      // Finnish: fi and fi-fi work; all others go to lang-domain
      fi: true,
      // French: auto-default to France, but do the right things for Belgium and Canada
      fr: {
        alt: {
          be: "fr",
          ca: "www"
        }
      },
      // Hindu: redirect to India (so does en-in)
      hi: {
        d: "in"
      },
      hu: true,
      id: true,
      it: true,
      ja: {
        d: "jp"
      },
      ko: {
        d: "kr"
      },
      // Malaysian: send to WWW
      ms: {
        d: "www"
      },
      nl: {
        alt: {
          be: "nl"
        }
      },
      nb: {
        d: "no"
      },
      pl: true,
      pt: {
        alt: {
          // Brazil
          br: {
            d: "br",
            s: "pt-br"
          }
        }
      },
      ro: true,
      ru: true,
      sk: true,
      sv: {
        d: "se"
      },
      tl: {
        d: "www"
      },
      th: {
        d: "www"
      },
      tr: {
        alt: {
          // Cyprus
          cy: "tr"
        }
      },
      uk: true,
      vi: true
    },
    style: [
      // base rules for all Save buttons
      "border-radius: 3px",
      "text-indent: 20px",
      "width: auto",
      "padding: 0 4px 0 0",
      "text-align: center",
      'font: 11px/20px "Helvetica Neue", Helvetica, sans-serif',
      "font-weight: bold",
      "color: #fff",
      "background: #e60023 url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMzBweCIgd2lkdGg9IjMwcHgiIHZpZXdCb3g9Ii0xIC0xIDMxIDMxIj48Zz48cGF0aCBkPSJNMjkuNDQ5LDE0LjY2MiBDMjkuNDQ5LDIyLjcyMiAyMi44NjgsMjkuMjU2IDE0Ljc1LDI5LjI1NiBDNi42MzIsMjkuMjU2IDAuMDUxLDIyLjcyMiAwLjA1MSwxNC42NjIgQzAuMDUxLDYuNjAxIDYuNjMyLDAuMDY3IDE0Ljc1LDAuMDY3IEMyMi44NjgsMC4wNjcgMjkuNDQ5LDYuNjAxIDI5LjQ0OSwxNC42NjIiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+PHBhdGggZD0iTTE0LjczMywxLjY4NiBDNy41MTYsMS42ODYgMS42NjUsNy40OTUgMS42NjUsMTQuNjYyIEMxLjY2NSwyMC4xNTkgNS4xMDksMjQuODU0IDkuOTcsMjYuNzQ0IEM5Ljg1NiwyNS43MTggOS43NTMsMjQuMTQzIDEwLjAxNiwyMy4wMjIgQzEwLjI1MywyMi4wMSAxMS41NDgsMTYuNTcyIDExLjU0OCwxNi41NzIgQzExLjU0OCwxNi41NzIgMTEuMTU3LDE1Ljc5NSAxMS4xNTcsMTQuNjQ2IEMxMS4xNTcsMTIuODQyIDEyLjIxMSwxMS40OTUgMTMuNTIyLDExLjQ5NSBDMTQuNjM3LDExLjQ5NSAxNS4xNzUsMTIuMzI2IDE1LjE3NSwxMy4zMjMgQzE1LjE3NSwxNC40MzYgMTQuNDYyLDE2LjEgMTQuMDkzLDE3LjY0MyBDMTMuNzg1LDE4LjkzNSAxNC43NDUsMTkuOTg4IDE2LjAyOCwxOS45ODggQzE4LjM1MSwxOS45ODggMjAuMTM2LDE3LjU1NiAyMC4xMzYsMTQuMDQ2IEMyMC4xMzYsMTAuOTM5IDE3Ljg4OCw4Ljc2NyAxNC42NzgsOC43NjcgQzEwLjk1OSw4Ljc2NyA4Ljc3NywxMS41MzYgOC43NzcsMTQuMzk4IEM4Ljc3NywxNS41MTMgOS4yMSwxNi43MDkgOS43NDksMTcuMzU5IEM5Ljg1NiwxNy40ODggOS44NzIsMTcuNiA5Ljg0LDE3LjczMSBDOS43NDEsMTguMTQxIDkuNTIsMTkuMDIzIDkuNDc3LDE5LjIwMyBDOS40MiwxOS40NCA5LjI4OCwxOS40OTEgOS4wNCwxOS4zNzYgQzcuNDA4LDE4LjYyMiA2LjM4NywxNi4yNTIgNi4zODcsMTQuMzQ5IEM2LjM4NywxMC4yNTYgOS4zODMsNi40OTcgMTUuMDIyLDYuNDk3IEMxOS41NTUsNi40OTcgMjMuMDc4LDkuNzA1IDIzLjA3OCwxMy45OTEgQzIzLjA3OCwxOC40NjMgMjAuMjM5LDIyLjA2MiAxNi4yOTcsMjIuMDYyIEMxNC45NzMsMjIuMDYyIDEzLjcyOCwyMS4zNzkgMTMuMzAyLDIwLjU3MiBDMTMuMzAyLDIwLjU3MiAxMi42NDcsMjMuMDUgMTIuNDg4LDIzLjY1NyBDMTIuMTkzLDI0Ljc4NCAxMS4zOTYsMjYuMTk2IDEwLjg2MywyNy4wNTggQzEyLjA4NiwyNy40MzQgMTMuMzg2LDI3LjYzNyAxNC43MzMsMjcuNjM3IEMyMS45NSwyNy42MzcgMjcuODAxLDIxLjgyOCAyNy44MDEsMTQuNjYyIEMyNy44MDEsNy40OTUgMjEuOTUsMS42ODYgMTQuNzMzLDEuNjg2IiBmaWxsPSIjZTYwMDIzIj48L3BhdGg+PC9nPjwvc3ZnPg==) 3px 50% no-repeat",
      "background-size: 14px 14px",
      // extra rules for extensions only
      "position: absolute",
      "opacity: 1",
      "z-index: 8675309",
      "display: none",
      "cursor: pointer",
      "border: none",
      "font-weight: bold",
      "-webkit-font-smoothing: antialiased",
      "-moz-osx-font-smoothing: grayscale"
    ],
    offset: {
      top: 10,
      left: 10
    }
  },
  pop: {
    height: 650,
    width: 800
  },
  // metas to observe
  seek: { nopin: 1, nohover: 1, nosearch: 1 },
  // don't do stuff on these domains
  nopeList: [
    /^https?:\/\/(.*?\.|)craigslist\.org\//,
    /^https?:\/\/(.*?\.|)chase\.com\//,
    /^https?:\/\/(.*?\.|)facebook\.com\//,
    /^https?:\/\/mail\.aol\.com\//,
    /^https?:\/\/(.*?\.|)atmail\.com\//,
    /^https?:\/\/(.*?\.|)contactoffice\.com\//,
    /^https?:\/\/(.*?\.|)fastmail\.fm\//,
    /^https?:\/\/(.*?\.|)webmail\.gandi\.net\//,
    /^https?:\/\/accounts\.google\.com\//,
    /^https?:\/\/myaccount\.google\.com\//,
    /^https?:\/\/mail\.google\.com\//,
    /^https?:\/\/docs\.google\.com\//,
    /^https?:\/\/gmx\.com\//,
    /^https?:\/\/(.*?\.|)hushmail\.com\//,
    /^https?:\/\/(.*?\.|)laposte\.fr\//,
    /^https?:\/\/mail\.lycos\.com\//,
    /^https?:\/\/(.*?\.|)mail\.com\//,
    /^https?:\/\/(.*?\.|)mail\.ru\//,
    /^https?:\/\/(.*?\.|)opolis\.eu\//,
    /^https?:\/\/(.*?\.|)outlook\.com\//,
    /^https?:\/\/(.*?\.|)nokiamail\.com\//,
    /^https?:\/\/apps\.rackspace\.com\//,
    /^https?:\/\/mail\.rediff\.com\//,
    /^https?:\/\/(.*?\.|)runbox\.com\//,
    /^https?:\/\/mail\.sify\.com\//,
    /^https?:\/\/webmail\.thexyz\.com\//,
    /^https?:\/\/login\.yahoo\.com\//,
    /^https?:\/\/mail\.yahoo\.com\//,
    /^https?:\/\/mail\.yandex\.com\//
  ],
  // don't hover on domains matching these
  noHoverList: [
    /^https?:\/\/ramandel\.com\//,
    /^https?:\/\/www\.google\.com\/$/,
    /^https?:\/\/www\.google\.com\/_/
  ]
});
