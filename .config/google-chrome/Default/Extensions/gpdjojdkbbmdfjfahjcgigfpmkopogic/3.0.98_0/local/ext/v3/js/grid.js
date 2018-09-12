// lint cleanup

((w, d, a) => {
  var $ = {
    w: w,
    d: d,
    a: a,
    b: chrome || browser,
    v: {
      debug: false,
      css: '',
      lang: 'en',
      endpoint: {}
    },
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
        var r = null;
        if (typeof o.el[o.att] === 'string') {
          r = o.el[o.tt];
        } else {
          r = o.el.getAttribute('data-' + o.att);
        }
        return r;
      },
      // set a DOM property or text attribute
      set: o =>  {
        if (typeof o.el[o.att] === 'string') {
          o.el[o.att] = o.string;
        } else {
          o.el.setAttribute('data-' + o.att, o.string);
        }
      },
      // create a DOM element
      make: o => {
        var el = false, t, a, k;
        for (t in o) {
          el = $.d.createElement(t);
          for (a in o[t]) {
            if (typeof o[t][a] === 'string') {
              $.f.set({el: el, att: a, string: o[t][a]});
            } else {
              if (a === 'style') {
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
        $.f.debug('Sending message');
        o.via = $.v.me;
        if (!o.to) {
          o.to = 'background';
        }
        $.f.debug(JSON.stringify(o));
        $.b.runtime.sendMessage(o, ()=>{});
      },
      // send a ping from the background process to log.pinterest.com
      log: o => {
        o.lv = $.a.ver;
        o.via = $.d.URL;
        $.f.send({
          act: 'log',
          data: o
        });
      },
      // if we're right-clicking on an image, save it to $.v.contextEl
      context: e => {
        if (e.button === 2) {
          var t = e.target;
          if (t && t.tagName && t.tagName === 'IMG') {
            $.v.contextEl = t;
          }
        }
      },
      // get the position of a DOM element
      getPos: o => {
        var positionTop = 0, positionLeft = 0;
        if (o.el.offsetParent) {
          do {
            positionLeft = positionLeft + o.el.offsetLeft;
            positionTop = positionTop + o.el.offsetTop;
          } while (o.el = o.el.offsetParent);
          return {top: positionTop, left: positionLeft};
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
        let logMe, dualScreenLeft, dualScreenTop, height, width, left, top, query;

        logMe = {event: 'click', xm: o.method};

        dualScreenLeft = $.w.screenLeft != undefined ? $.w.screenLeft : screen.left;
        dualScreenTop = $.w.screenTop != undefined ? $.w.screenTop : screen.top;

        width = $.w.outerWidth ? $.w.outerWidth : $.w.defaultStatus.documentElement.clientWidth ? $.w.defaultStatus.documentElement.clientWidth : screen.width;
        height = $.w.outerHeight ? $.w.outerHeight : $.w.defaultStatus.documentElement.clientHeight ? $.w.defaultStatus.documentElement.clientHeight : screen.height;
        left = ((width - $.a.pop.width) / 2) + dualScreenLeft;
        top = ((height - $.a.pop.height) / 2) + dualScreenTop;

        if (!o.method) {
          // default to hoverbutton method
          o.method = 'h';
        }

        // how to pin
        if (o.id) {
          // repin
          query = $.v.endpoint.rePinCreate.replace(/%s/, o.id);
          // log the pin ID
          logMe.repin = id;
        } else {
          // new pin
          query = $.v.endpoint.pinCreate + '?url=' + encodeURIComponent(o.url);
          if (o.color) {
            // imageless pin
            query = query + '&pinFave=1&color=' + encodeURIComponent(o.color) + '&h=236&w=236';
          } else {
            // regular pin
            query = query + '&media=' + encodeURIComponent(o.media);
          }
          query = query + '&xm=' + o.method + '&xv=' + $.v.xv + '&xuid=' + $.v.xuid + '&description=' + encodeURIComponent(o.description);
        }

        // open pop-up window
        $.w.open(query, 'pin' + new Date().getTime(), 'status=no,resizable=yes,scrollbars=yes,personalbar=no,directories=no,location=no,toolbar=no,menubar=no,height=' + $.a.pop.height + ',width=' + $.a.pop.width + ',left=' + left + ',top=' + top);
        $.f.log(logMe);
      },
      // return moz, webkit, ms, etc
      getVendorPrefix: () => {
        var x = /^(moz|webkit|ms)(?=[A-Z])/i, r = '', p;
      	for (p in $.d.b.style) {
      		if (x.test(p)) {
      			r = '-' + p.match(x)[0].toLowerCase() + '-';
      			break;
      		}
      	}
      	return r;
      },
      // build stylesheet
      buildStyleSheet: () => {
        var css, rules, k, re, repl;
        css = $.f.make({'STYLE': {type: 'text/css'}});
        rules = $.v.css;
        // each rule has our randomly-created key at its root to minimize style collisions
        rules = rules.replace(/\._/g, '.' + a.k + '_')
        // strings to replace in CSS rules
        var repl = {
          '%prefix%': $.f.getVendorPrefix()
        }
        // replace everything in repl throughout rules
        for (k in repl) {
          if (repl[k].hasOwnProperty) {
            // re = new RegExp(k, 'g');
            rules = rules.replace(new RegExp(k, 'g'), repl[k]);
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
        var name, i, k, pad, key, rules = '', selector = o.str || '';
        for (k in o.obj) {
          if (typeof o.obj[k] === 'string') {
            rules = rules + '\n  ' + k + ': ' + o.obj[k] + ';';
          }
          if (typeof o.obj[k] === 'object') {
            key = selector + ' ' + k;
            key = key.replace(/ &/g, '');
            key = key.replace(/,/g, ', ' + selector);
            $.f.presentation({obj: o.obj[k], str: key});
          }
        }
        // add selector and rules to stylesheet
        if (selector && rules) {
          $.v.css = $.v.css + selector + ' { ' + rules + '\n}\n';
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
            'SPAN': {
              className: $.a.k + '_' + key.replace(/ /g, ' ' + $.a.k)
            }
          });
          o.el.appendChild(child);
          if (!$.s[key]) {
            $.s[key] = child;
          }
          $.f.buildOne({obj: o.obj[key], el: child});
        }
      },
      // clean troublesome characters from strings that may be shown onscreen
      clean: o => {
        return new DOMParser().parseFromString(o.str, "text/html").documentElement.textContent;
      },
      // close grid from background process
      close: o => {
        $.f.send({act: 'closeGrid', data: o});
      },
      act: {
        render: r => {
          let cc, i, n, it, thumb, mask, desc, img, ft, ftDesc, parser;

          $.f.debug('rendering the grid');
          $.f.debug(r);

          $.v.endpoint.pinCreate = $.a.endpoint.pinCreate.replace(/www/, r.data.config.domain);
          $.v.endpoint.rePinCreate = $.a.endpoint.rePinCreate.replace(/www/, r.data.config.domain);

          // overwrite $.v.lang with result from pinmarklet
          $.v.lang = r.data.config.lang;

          if ($.a.msg[$.v.lang]) {
            $.v.msg = $.a.msg[$.v.lang];
          } else {
            $.v.msg = $.a.msg['en'];
          }

          if (r.data.hazLogin) {
            $.v.hazLogin = true;
          }

          // close the grid overlay and go right to the pin create form if we only have one thing
          if ($.v.hazLogin && r.data.thumb.length === 1) {
            // we are logged in and we only have one thing (a YouTube video page, for example)
            $.f.send({
              act: 'openCreate',
              data: r.data.thumb[0]
            });
            // log this event
            $.f.close({'event': 'skipGrid', 'url': r.data.thumb[0].url || null});
          } else {
            // avoid the initial flash of header if we are skipping the grid
            $.d.body.style.display = 'block';
            cc = 0;
            $.d.title = $.v.msg.choosePin;
            $.s.hdMsg.innerHTML = $.v.msg.choosePin;
            for (i = 0, n = r.data.thumb.length; i < n; i = i + 1) {
              it = r.data.thumb[i];
              thumb = $.f.make({'DIV': {
                className: `${$.a.k}_thumb`
              }});
              desc = '';
              if (it.src) {
                // only show search button if we're not on a page where search is verboten
                if (!r.data.hideSearch) {
                  thumb.appendChild($.f.make({'SPAN': {
                    className: `${$.a.k}_searchButton`
                  }}));
                }
                img = $.f.make({'IMG': {
                  'src': it.media
                }});
                mask = $.f.make({'DIV': {
                  className: `${$.a.k}_mask`,
                  url: it.url,
                  media: it.media,
                  description: it.description.substr(0, 500),
                  pinId: it.dataPinId || undefined
                }});
              } else {
                // make an imageless thumb
                it = r.data.imageless;
                img = $.f.make({'SPAN': {
                  className: `${$.a.k}_imageless`,
                  style: {
                    backgroundColor: it.color
                  }
                }});
                mask = $.f.make({'DIV': {
                  className: `${$.a.k}_mask`,
                  url: it.url,
                  color: it.color,
                  siteName: it.siteName,
                  description: it.description.substr(0, 500)
                }});
                img.appendChild($.f.make({'SPAN': {
                  className: `${$.a.k}_site`,
                  innerText: it.siteName
                }}));
                img.appendChild($.f.make({'SPAN': {
                  className: `${$.a.k}_text`,
                  innerText: $.f.clean({str: it.description})
                }}));
              }
              thumb.appendChild(img);
              thumb.appendChild($.f.make({'SPAN': {
                className: `${$.a.k}_saveButton`,
                innerHTML: $.v.msg.save
              }}));
              ft = $.f.make({'DIV': {
                className: `${$.a.k}_ft`
              }});
              ftDesc = $.f.make({'SPAN': {
                className: `${$.a.k}_desc`,
                innerText: desc
              }});
              ftDesc.appendChild($.f.make({'SPAN': {
                className: `${$.a.k}_dimensions`,
                innerText: it.height + ' x ' + it.width
              }}));
              ft.appendChild(ftDesc);
              thumb.appendChild(ft);
              thumb.appendChild(mask);
              // add this thumb to the right column
              $.d.getElementById('c_' + cc).appendChild(thumb);
              // next time, use the next column
              cc = (cc + 1) % $.v.columnCount;
            }
          }
        }
      },
      // a click!
      click: e => {
        let children, data, el, i;
        el = $.f.getEl(e);
        if (el === $.s.x) {
          $.f.close({event: 'click'});
        }
        if (el.className === `${$.a.k}_searchButton`) {
          children = el.parentNode.children;
          for (i = 0; i < children.length; i++) {
            if (children[i].className === `${$.a.k}_mask`) {
              $.f.send({
                act: 'openSearchFromGrid',
                data: {
                  searchMe: $.f.get({el: children[i], att:'media'})
                }
              });
              // log the click
              $.f.log({
                event: 'click',
                overlay: 'grid',
                action: 'open_search'
              });
            }
          }
        }
        if (el.className === $.a.k + '_mask') {
          data = {
            url: $.f.get({el: el, att: 'url'}),
            id: $.f.get({el: el, att: 'pinId'}) || null,
            media: $.f.get({el: el, att: 'media'}),
            color: $.f.get({el: el, att: 'color'}),
            siteName: $.f.get({el: el, att: 'siteName'}),
            description: $.f.get({el: el, att: 'description'}),
            method: 'g'
          };
          // log the click
          $.f.log({
            event: 'click',
            overlay: 'grid',
            action: 'open_create'
          });
          // open the form
          if ($.v.hazLogin) {
            // open the inline create form
            $.f.send({
              act: 'openCreate',
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
          $.f.close({event: 'keydown'});
        }
      },
      // start
      init: () => {
        $.d.b = $.d.getElementsByTagName('BODY')[0];
        if ($.d.b) {
          // don't allow right-click menus unless we are in debug mode
          if (!$.v.debug) {
            $.d.addEventListener('contextmenu', event => event.preventDefault());
          }
          $.d.h = $.d.getElementsByTagName('HEAD')[0];
          $.f.presentation({obj: $.a.styles});
          $.f.buildOne({obj: $.a.structure, el: $.d.b});
          $.f.debug('structure rendered');
          $.v.columnCount = ~~($.d.b.offsetWidth / 250);
          if ($.v.columnCount) {
            for (var i = 0; i < $.v.columnCount; i = i + 1) {
              var col = $.d.createElement('DIV');
              col.className =  $.a.k + '_col';
              col.id = 'c_' + i;
              $.s.grid.appendChild(col);
            }
            $.d.b.addEventListener('click', $.f.click);
            // if an incoming message from script is for us and triggers a valid function, run it
            $.b.runtime.onMessage.addListener(r => {
              $.f.debug('message received');
              if (r.to && r.to === $.a.me) {
                if (r.act && typeof $.f.act[r.act] === 'function') {
                  $.f.act[r.act](r);
                }
              }
            });
            $.d.addEventListener('keydown', $.f.keydown);
            // freshen boards
            $.f.send({act: 'getBoards'});
          } else {
            $.f.debug('Not enough room to render grid columns; closing.');
            $.f.close();
          }
        }
      }
    }
  };
  // get everything in local storage and then init
  $.b.storage.local.get(null, r => {
    for (let i in r) {
      $.v[i] = r[i];
    }
    $.f.init();
  });
})(window, document, {
  k: 'GRID_' + new Date().getTime(),
  me: 'grid',
  endpoint: {
    pinCreate: 'https://www.pinterest.com/pin/create/extension/',
    rePinCreate: 'https://www.pinterest.com/pin/%s/repin/x/'
  },
  pop: {
    height:  650,
    width: 800
  },
  iframe: {
    style: {
      'border': 'none',
      'display': 'block',
      'position': 'fixed',
      'height': '100%',
      'width': '100%',
      'top': '0',
      'right': '0',
      'bottom': '0',
      'left': '0',
      'margin': '0',
      'clip': 'auto',
      'zIndex': '9223372036854775807'
    }
  },
  msg: {
    "en": {
      "choosePin": "Choose a Pin to save",
      "save": "Save"
    },
    "cs": {
      "choosePin": "Zvolte pin, kter&#xFD; chcete ulo&#x17E;it",
      "save": "Ulo&#382;it"
    },
    "da": {
      "choosePin": "V&#xE6;lg den pin, du vil gemme",
      "save": "Gem"
    },
    "de": {
      "choosePin": "W&#xE4;hle den Pin, den du merken m&#xF6;chtest",
      "save": "Merken"
    },
    "es": {
      "choosePin": "Elige un Pin que guardar",
      "save": "Guardar"
    },
    "es-mx": {
      "choosePin": "Elige un Pin para guardarlo",
      "save": "Guardar"
    },
    "el": {
      "choosePin": "&#x395;&#x3C0;&#x3B9;&#x3BB;&#x3AD;&#x3BE;&#x3C4;&#x3B5; &#x3AD;&#x3BD;&#x3B1; pin &#x3B3;&#x3B9;&#x3B1; &#x3B1;&#x3C0;&#x3BF;&#x3B8;&#x3AE;&#x3BA;&#x3B5;&#x3C5;&#x3C3;&#x3B7;",
      "save": "&Kappa;&rho;&#940;&tau;&alpha; &tau;&omicron;"
    },
    "fi": {
      "choosePin": "Valitse tallennettava Pin",
      "save": "Tallenna"
    },
    "fr": {
      "choosePin": "Choisissez une &#xE9;pingle &#xE0; enregistrer",
      "save": "Enregistrer"
    },
    "id": {
      "choosePin": "Pilih Pin untuk disimpan",
      "save": "Simpan"
    },
    "it": {
      "choosePin": "Scegli un Pin da salvare",
      "save": "Salva"
    },
    "hi": {
      "choosePin": "&#x938;&#x947;&#x935; &#x915;&#x930;&#x928;&#x947; &#x915;&#x947; &#x932;&#x93F;&#x90F; &#x90F;&#x915; &#x92A;&#x93F;&#x928; &#x915;&#x94B; &#x91A;&#x941;&#x928;&#x947;&#x902;",
      "save": "&#2360;&#2375;&#2357; &#2325;&#2352;&#2375;&#2306;"
    },
    "hu": {
      "choosePin": "V&#xE1;lassz egy menteni k&#xED;v&#xE1;nt pint",
      "save": "Ment&eacute;s"
    },
    "ja": {
      "choosePin": "&#x4FDD;&#x5B58;&#x3059;&#x308B;&#x30D4;&#x30F3;&#x3092;&#x9078;&#x629E;",
      "save": "&#20445;&#23384;"
    },
    "ko": {
      "choosePin": "&#xC800;&#xC7A5;&#xD560; &#xD540;&#xC744; &#xC120;&#xD0DD;&#xD558;&#xC138;&#xC694;.",
      "save": "&#51200;&#51109;"
    },
    "ms": {
      "choosePin": "Pilih Pin untuk disimpan",
      "save": "Simpan"
    },
    "nb": {
      "choosePin": "Velg en Pin &#xE5; lagre",
      "save": "Lagre"
    },
    "nl": {
      "choosePin": "Kies een pin om te bewaren",
      "save": "Bewaren"
    },
    "pl": {
      "choosePin": "Wybierz Pina do zapisania",
      "save": "Zapisz"
    },
    "pt": {
      "choosePin": "Escolhe um Pin para guardar",
      "save": "Guardar"
    },
    "pt-br": {
      "choosePin": "Escolha um Pin para salvar",
      "save": "Salvar"
    },
    "ro": {
      "choosePin": "Alege un Pin pe care s&#x103;-l salvezi",
      "save": "Salveaz&#259;"
    },
    "ru": {
      "choosePin": "&#x412;&#x44B;&#x431;&#x435;&#x440;&#x438;&#x442;&#x435; &#x41F;&#x438;&#x43D;, &#x43A;&#x43E;&#x442;&#x43E;&#x440;&#x44B;&#x439; &#x43D;&#x443;&#x436;&#x43D;&#x43E; &#x441;&#x43E;&#x445;&#x440;&#x430;&#x43D;&#x438;&#x442;&#x44C;.",
      "save": "&#1057;&#1086;&#1093;&#1088;&#1072;&#1085;&#1080;&#1090;&#1100;"
    },
    "sk": {
      "choosePin": "Vyberte si pin, ktor&#xFD; si ulo&#x17E;&#xED;te",
      "save": "Ulo&#382;i&#357;"
    },
    "sv": {
      "choosePin": "V&#xE4;lj en pin som du vill spara",
      "save": "Spara"
    },
    "th": {
      "choosePin": "&#xE40;&#xE25;&#xE37;&#xE2D;&#xE01;&#xE1E;&#xE34;&#xE19;&#xE17;&#xE35;&#xE48;&#xE15;&#xE49;&#xE2D;&#xE07;&#xE01;&#xE32;&#xE23;&#xE1A;&#xE31;&#xE19;&#xE17;&#xE36;&#xE01;",
      "save": "&#3610;&#3633;&#3609;&#3607;&#3638;&#3585;"
    },
    "tl": {
      "choosePin": "Pumili ng Pin na ise-save",
      "save": "I-save"
    },
    "tr": {
      "choosePin": "Saklamak istedi&#x11F;iniz Pini se&#xE7;in",
      "save": "Kaydet"
    },
    "uk": {
      "choosePin": "&#x41E;&#x431;&#x435;&#x440;&#x456;&#x442;&#x44C; &#x43F;&#x456;&#x43D;, &#x44F;&#x43A;&#x438;&#x439; &#x445;&#x43E;&#x442;&#x456;&#x43B;&#x438; &#x431; &#x437;&#x431;&#x435;&#x440;&#x435;&#x433;&#x442;&#x438;",
      "save": "&#1047;&#1073;&#1077;&#1088;&#1077;&#1075;&#1090;&#1080;"
    },
    "vi": {
      "choosePin": "Ch&#x1ECD;n m&#x1ED9;t Ghim &#x111;&#x1EC3; l&#x1B0;u",
      "save": "L&#432;u"
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
    'body': {
      'background': '#fff',
      'margin': '0',
      'padding': '0',
      'font-family': '"Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", arial, sans-serif',
      '%prefix%font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
      'display': 'none'
    },
    '*': {
      '%prefix%box-sizing': 'border-box'
    },
    '._hd': {
      'background': 'rgba(255,255,255,1) url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMzJweCIgd2lkdGg9IjMycHgiIHZpZXdCb3g9IjAgMCAzMCAzMCI+PGc+PHBhdGggZD0iTTI5LjQ0OSwxNC42NjIgQzI5LjQ0OSwyMi43MjIgMjIuODY4LDI5LjI1NiAxNC43NSwyOS4yNTYgQzYuNjMyLDI5LjI1NiAwLjA1MSwyMi43MjIgMC4wNTEsMTQuNjYyIEMwLjA1MSw2LjYwMSA2LjYzMiwwLjA2NyAxNC43NSwwLjA2NyBDMjIuODY4LDAuMDY3IDI5LjQ0OSw2LjYwMSAyOS40NDksMTQuNjYyIiBmaWxsPSIjZmZmIj48L3BhdGg+PHBhdGggZD0iTTE0LjczMywxLjY4NiBDNy41MTYsMS42ODYgMS42NjUsNy40OTUgMS42NjUsMTQuNjYyIEMxLjY2NSwyMC4xNTkgNS4xMDksMjQuODU0IDkuOTcsMjYuNzQ0IEM5Ljg1NiwyNS43MTggOS43NTMsMjQuMTQzIDEwLjAxNiwyMy4wMjIgQzEwLjI1MywyMi4wMSAxMS41NDgsMTYuNTcyIDExLjU0OCwxNi41NzIgQzExLjU0OCwxNi41NzIgMTEuMTU3LDE1Ljc5NSAxMS4xNTcsMTQuNjQ2IEMxMS4xNTcsMTIuODQyIDEyLjIxMSwxMS40OTUgMTMuNTIyLDExLjQ5NSBDMTQuNjM3LDExLjQ5NSAxNS4xNzUsMTIuMzI2IDE1LjE3NSwxMy4zMjMgQzE1LjE3NSwxNC40MzYgMTQuNDYyLDE2LjEgMTQuMDkzLDE3LjY0MyBDMTMuNzg1LDE4LjkzNSAxNC43NDUsMTkuOTg4IDE2LjAyOCwxOS45ODggQzE4LjM1MSwxOS45ODggMjAuMTM2LDE3LjU1NiAyMC4xMzYsMTQuMDQ2IEMyMC4xMzYsMTAuOTM5IDE3Ljg4OCw4Ljc2NyAxNC42NzgsOC43NjcgQzEwLjk1OSw4Ljc2NyA4Ljc3NywxMS41MzYgOC43NzcsMTQuMzk4IEM4Ljc3NywxNS41MTMgOS4yMSwxNi43MDkgOS43NDksMTcuMzU5IEM5Ljg1NiwxNy40ODggOS44NzIsMTcuNiA5Ljg0LDE3LjczMSBDOS43NDEsMTguMTQxIDkuNTIsMTkuMDIzIDkuNDc3LDE5LjIwMyBDOS40MiwxOS40NCA5LjI4OCwxOS40OTEgOS4wNCwxOS4zNzYgQzcuNDA4LDE4LjYyMiA2LjM4NywxNi4yNTIgNi4zODcsMTQuMzQ5IEM2LjM4NywxMC4yNTYgOS4zODMsNi40OTcgMTUuMDIyLDYuNDk3IEMxOS41NTUsNi40OTcgMjMuMDc4LDkuNzA1IDIzLjA3OCwxMy45OTEgQzIzLjA3OCwxOC40NjMgMjAuMjM5LDIyLjA2MiAxNi4yOTcsMjIuMDYyIEMxNC45NzMsMjIuMDYyIDEzLjcyOCwyMS4zNzkgMTMuMzAyLDIwLjU3MiBDMTMuMzAyLDIwLjU3MiAxMi42NDcsMjMuMDUgMTIuNDg4LDIzLjY1NyBDMTIuMTkzLDI0Ljc4NCAxMS4zOTYsMjYuMTk2IDEwLjg2MywyNy4wNTggQzEyLjA4NiwyNy40MzQgMTMuMzg2LDI3LjYzNyAxNC43MzMsMjcuNjM3IEMyMS45NSwyNy42MzcgMjcuODAxLDIxLjgyOCAyNy44MDEsMTQuNjYyIEMyNy44MDEsNy40OTUgMjEuOTUsMS42ODYgMTQuNzMzLDEuNjg2IiBmaWxsPSIjYmQwODFjIj48L3BhdGg+PC9nPjwvc3ZnPg==) 20px 50% no-repeat',
      'color': '#333',
      'height': '65px',
      'line-height': '65px',
      'font-size': '24px',
      'font-weight': 'bold',
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'right': '0',
      'z-index': '3',
      'text-align': 'left',
      'text-indent': '65px',
      '%prefix%transform': 'translateZ(0)',
      '._x': {
        'z-index': '4',
        'opacity': '.5',
        'position': 'absolute',
        'right': '25px',
        'top': '0',
        'cursor': 'pointer',
        'height': '65px',
        'width': '15px',
        'background': 'transparent url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTVweCIgd2lkdGg9IjE1cHgiIHZpZXdCb3g9IjAgMCA4MCA4MCI+PGc+PGxpbmUgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiB4MT0iMTAiIHkxPSIxMCIgeDI9IjcwIiB5Mj0iNzAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyMCIvPjxsaW5lIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgeDE9IjcwIiB5MT0iMTAiIHgyPSIxMCIgeTI9IjcwIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMjAiLz48L2c+PC9zdmc+) 50% 50% no-repeat',
        '&:hover': {
          'opacity': '1'
        }
      }
    },
    '._grid': {
      'display': 'block',
      'margin': '72px 0 0 58px',
      'z-index': '1',
      '._col': {
        'display': 'inline-block',
        'width': '236px',
        'vertical-align': 'top',
        'padding': '0 10px',
        'text-align': 'left',
        '._thumb': {
          'border-radius': '8px',
          'margin': '0 0 0 -10px',
          'display': 'block',
          'width': '220px',
          'background': '#eee',
          'vertical-align': 'top',
          'overflow': 'hidden',
          'cursor': 'pointer',
          'background': '#fff',
          'position': 'relative',
          'border': '10px solid #fff',
          '&:hover': {
            'background': '#eee',
            'border-color': '#eee'
          },
          '._mask': {
            'position': 'absolute',
            'top': '0',
            'left': '0',
            'bottom': '0',
            'right': '0'
          },
          '._searchButton': {
            'position': 'absolute',
            'top': '8px',
            'right': '8px',
            'height': '40px',
            'width': '40px',
            'border-radius': '20px',
            'background': 'rgba(0,0,0,.4) url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/Pjxzdmcgd2lkdGg9IjI0cHgiIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAwIDI0IDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxtYXNrIGlkPSJtIj48cmVjdCBmaWxsPSIjZmZmIiB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI2IiByeT0iNiIvPjxyZWN0IGZpbGw9IiMwMDAiIHg9IjUiIHk9IjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgcng9IjEiIHJ5PSIxIi8+PHJlY3QgZmlsbD0iIzAwMCIgeD0iMTAiIHk9IjAiIHdpZHRoPSI0IiBoZWlnaHQ9IjI0Ii8+PHJlY3QgZmlsbD0iIzAwMCIgeD0iMCIgeT0iMTAiIHdpZHRoPSIyNCIgaGVpZ2h0PSI0Ii8+PC9tYXNrPjwvZGVmcz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjbSkiLz48L3N2Zz4=) 50% 50% no-repeat',
            'background-size': '24px 24px',
            'opacity': '0',
            'z-index': '2'
          },
          '._saveButton': {
            'position': 'absolute',
            'top': '10px',
            'left': '10px',
            'width': 'auto',
            'border-radius': '4px',
            'background': '#bd081c url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjEwcHgiIGhlaWdodD0iMjBweCIgdmlld0JveD0iMCAwIDEwIDIwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogIDxnPgogICAgPHBhdGggZD0iTTAuNDgzMDc2OSwwIEMwLjQ4MzA3NjksMC43NzIxNDI5IDEuMzI1Mzg0NiwxLjQzMjg1NzEgMi4xMzc2OTIzLDEuNzg0Mjg1NyBMMi4xMzc2OTIzLDcuMzU3MTQyOSBDMC43NTg0NjE1LDguMTQyODU3MSAwLDkuNzUzNTcxNCAwLDExLjQyODU3MTQgTDQuMjAyMzA3NywxMS40Mjg1NzE0IEw0LjIwMTUzODUsMTcuMjEyMTQyOSBDNC4yMDE1Mzg1LDE3LjIxMjE0MjkgNC4zNDE1Mzg1LDE5LjY1OTI4NTcgNSwyMCBDNS42NTc2OTIzLDE5LjY1OTI4NTcgNS43OTc2OTIzLDE3LjIxMjE0MjkgNS43OTc2OTIzLDE3LjIxMjE0MjkgTDUuNzk2OTIzMSwxMS40Mjg1NzE0IEwxMCwxMS40Mjg1NzE0IEMxMCw5Ljc1MzU3MTQgOS4yNDE1Mzg1LDguMTQyODU3MSA3Ljg2MTUzODUsNy4zNTcxNDI5IEw3Ljg2MTUzODUsMS43ODQyODU3IEM4LjY3NDYxNTQsMS40MzI4NTcxIDkuNTE2MTUzOCwwLjc3MjE0MjkgOS41MTYxNTM4LDAgTDAuNDgzMDc2OSwwIEwwLjQ4MzA3NjksMCBaIiBmaWxsPSIjRkZGRkZGIj48L3BhdGg+CiAgPC9nPgo8L3N2Zz4=) 10px 9px no-repeat',
            'background-size': '10px 20px',
            'padding': '0 10px 0 0',
            'text-indent': '26px',
            'color': '#fff',
            'font-size': '14px',
            'line-height': '36px',
            'font-family': '"Helvetica Neue", Helvetica, Arial, sans-serif',
            'font-style': 'normal',
            'font-weight': 'bold',
            'text-align': 'left',
            '%prefix%font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale',
            'opacity': '0'
          },
          '&:hover ._saveButton, &:hover ._searchButton, &:hover ._ft ._dimensions': {
            'opacity': '1'
          },
          'img': {
            'display': 'block',
            'width': '200px',
            'border-radius': '8px'
          },
          '._imageless': {
            'display': 'block',
            'border-radius': '8px',
            'height': '200px',
            'width': '200px',
            'position': 'relative',
            'overflow': 'hidden',
            '._site, ._text': {
              'position': 'absolute',
              'color': '#fff',
              'left': '15px'
            },
            '._site': {
              'top': '20px',
              'font-size': '11px'
            },
            '._text': {
              'width': '200px',
              'word-wrap': 'break-word',
              'font-size': '19px',
              'top': '38px',
              'line-height': '22px',
              'padding-right': '22px',
              'font-weight': 'bold',
              'letter-spacing': '-1px'
            }
          },
          '._ft': {
            'display': 'block',
            'span': {
              'position': 'relative',
              'display': 'block',
              'padding': '10px',
              'color': '#333',
              'font-size': '12px'
            },
            '._dimensions': {
              'border-bottom-left-radius': '8px',
              'border-bottom-right-radius': '8px',
              'padding': '0',
              'position': 'absolute',
              'top': '-24px',
              'height': '24px',
              'line-height': '24px',
              'left': '0',
              'text-align': 'center',
              'width': '100%',
              'background': 'rgba(0,0,0,.2)',
              'color': '#fff',
              'font-size': '10px',
              'font-style': 'normal',
              '%prefix%font-smoothing': 'antialiased',
              '-moz-osx-font-smoothing': 'grayscale',
              'opacity': '0'
            }
          }
        }
      }
    }
  }
});
