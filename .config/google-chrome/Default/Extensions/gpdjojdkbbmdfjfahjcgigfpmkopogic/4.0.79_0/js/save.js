// fix runtime.sendMessage console spew

((w, d, a) => {
  var $ = {
    w: w,
    d: d,
    a: a,
    b: chrome || browser,
    v: {
      start: new Date().getTime()
    },
    f: {
      // console.log to background window
      debug: o => {
        if (o && $.v.debug) {
          console.log(o);
        }
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
        // we should get some perf data here
        $.f.send({
          act: "log",
          data: o
        });
      },
      // things that the save iframe might ask us to do
      cmd: {
        // close this overlay from background process
        close: o => {
          $.f.send({ act: "closeSave", data: o });
        },
        // this will run closeSave and open a new tab with the url specified in o
        seeItNow: o => {
          // right here is where we debug Firefox's problem opening See It now
          $.f.send({ act: "seeItNow", data: { pinId: o.pinId } });
        }
      },
      act: {
        populateSave: r => {
          if (!$.v.data) {
            $.v.data = r.data;
          }
          if ($.v.ready === true) {
            let postMessageObj = {
              act: "populateCreatePin",
              pinnable: {
                link: $.v.data.url,
                url: $.v.data.media,
                description: $.v.data.description
              }
            };
            $.s.contentWindow.postMessage(postMessageObj, $.s.src);
          } else {
            $.w.setTimeout($.f.act.populateSave, 10);
          }
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
          // if an incoming message from script is for us and triggers a valid function, run it
          $.b.runtime.onMessage.addListener(r => {
            $.f.debug("message received");
            $.f.debug(r);
            if (r.to && r.to === $.a.me) {
              if (r.act && typeof $.f.act[r.act] === "function") {
                $.f.act[r.act](r);
              }
            }
          });
          $.d.addEventListener("keydown", $.f.keydown);
          $.s = $.d.createElement("IFRAME");
          $.s.setAttribute("style", $.a.overlay.style.join("!important;"));
          $.s.onload = e => {
            // hide our background overlay
            $.f.debug("iframe Save overlay has rendered");
            $.v.ready = true;
          };
          $.s.src = $.v.ctrl.endpoint.save;
          $.d.b.appendChild($.s);
        }
        $.f.debug("save container has rendered");
      }
    }
  };
  // if an incoming message from script is for us and triggers a valid function, run it
  $.w.addEventListener("message", e => {
    if (e.data) {
      if (e.data.act) {
        if (typeof $.f.cmd[e.data.act] === "function") {
          $.f.cmd[e.data.act](e.data);
        }
      }
    }
  });
  // get everything in local storage and then init
  $.b.storage.local.get(null, r => {
    for (let i in r) {
      $.v[i] = r[i];
    }
    $.f.init();
  });
})(window, document, {
  k: "SAVE_" + new Date().getTime(),
  me: "save",
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
  }
});
