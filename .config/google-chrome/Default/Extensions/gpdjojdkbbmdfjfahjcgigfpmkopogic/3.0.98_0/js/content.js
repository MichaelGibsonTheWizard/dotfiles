// allow rendering inside iframes if they are parents of window.top and are 100% by 100% in size.

((w, d) => {
  var $ = {
    w,
    d,
    b: chrome || browser,
    v: {},
    f: {
      // console.log to background window
      debug: o => {
        if (o && $.v.debug) {
          console.log(o);
        }
      },
      // are we in the top frame?
      canHazLogic: () => {
        let r = false;
        // are we in the top frame?
        if ($.w.self === $.w.top) {
          // we're good
          r = true;
        } else {
          // can we run inside this iframe?
          $.f.debug('We are inside an iframe.');
          // this is in a try/catch block because looking at the parent window's size may trigger a cross-origin frame access warning
          try {
            if ($.w.top.innerHeight === $.w.self.innerHeight && $.w.top.innerWidth === $.w.self.innerWidth) {
              $.f.debug('This iframe is the same size as the top window; allowing the extension to run.');
              r = true;
            } else {
              $.f.debug('This frame\'s dimensions: ' + $.w.self.innerHeight + 'x' + $.w.self.innerWidth);
              $.f.debug('Top window dimensions: ' + $.w.top.innerHeight + 'x' + $.w.top.innerWidth);
            }
          } catch (err) {
            $.f.debug('This error message was caught so it doesn\'t clutter up console.log.');
            $.f.debug(err);
          }
        }
        return r;
      },
      // tag window, write logic
      init: () => {
        var t;
        $.d.b = $.d.getElementsByTagName('BODY')[0];
        // are we on a page?
        if ($.d.b && $.d.URL) {
          // get our domain
          t = $.d.URL.split('/');
          if (t[2]) {
            // are we on Pinterest?
            if (t[2].match(/pinterest\.com$/)) {
              // tag so Pinterest knows the extension is installed
              $.f.debug('Setting tag on Pinterest domain.');
              $.d.b.setAttribute('data-pinterest-extension-installed', $.v.xv);
            } else {
              $.f.debug('Not on Pinterest; no tag set.');
            }
          }
          // we're injecting into all iframes because the bookmarklet grid comes up inside one and we need to tag it if it's a Pinterest domain
          // but we don't want to execute our business logic inside iframes, because there are potentially millions of them on a page
          // finally: be nice to sites that use framesets where one frame is a direct descendant of window.top and is 100% of the size of the window
          if ($.f.canHazLogic()) {
            // do we have our business logic?
            if ($.v.logic) {
              // attempt to run
              try {
                eval($.v.logic);
              } catch (err) {
                $.f.debug('Logic could not eval.');
              }
            }
          }
        }
      } 
    }
  };
  // get everything in local storage and then init
  $.b.storage.local.get(null, function(data) {
    for (var i in data) {
      $.v[i] = data[i];
    }
    $.f.init();
  });
})(window, document);
