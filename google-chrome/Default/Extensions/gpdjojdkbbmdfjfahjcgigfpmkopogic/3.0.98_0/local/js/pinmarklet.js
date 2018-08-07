/* jshint indent: false, maxlen: false, unused: false */
// look at title attribute before alt attribute for descriptions
(function (w, d, a) {
  var $ = w[a.k] = {
    // window
    w: w,
    // document
    d: d,
    // arguments
    a: a,
    // structure
    s: {},
    // variables
    v: {
      override: {},
      sha: {},
      config: {
        debug: false,
        pinMethod: 'bookmarklet',
        domain: 'www',
        lang: 'en'
      },
      data: {
        img: {},
        link: {},
        meta: {}
      },
      count: {
        imgLoading: 0
      },
      time: {
        start: new Date().getTime()
      }
    },
    // functions
    f: (function () {
      return {
        // an empty array of callbacks to be populated later
        callback: [],
        // return the SHA-1 hash of a string
        hash: function (str) {
          // thank you: Paul "Paj" Johnston
          function rstr2binb (input) {
            var i, output = Array(input.length >> 2);
            for (i = 0; i < output.length; i++) {
              output[i] = 0;
            }
            for (i = 0; i < input.length * 8; i += 8) {
              output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
            }
            return output;
          }
          function binb2rstr (input) {
            var i, output = "";
            for (i = 0; i < input.length * 32; i += 8) {
              output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
            }
            return output;
          }
          function safe_add (x, y) {
            var lsw, msw;
            lsw = (x & 0xFFFF) + (y & 0xFFFF);
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
          }
          function bit_rol (num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
          }
          function binb_sha1 (x, len) {
            var a, b, c, d, e, w, i, j, t, oa, ob, oc, od, oe;
            x[len >> 5] |= 0x80 << (24 - len % 32);
            x[((len + 64 >> 9) << 4) + 15] = len;
            w = Array(80);
            a =  1732584193;
            b = -271733879;
            c = -1732584194;
            d =  271733878;
            e = -1009589776;
            for (i = 0; i < x.length; i += 16) {
              oa = a;
              ob = b;
              oc = c;
              od = d;
              oe = e;
              for (j = 0; j < 80; j++) {
                if (j < 16) {
                  w[j] = x[i + j];
                } else {
                  w[j] = bit_rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
                }
                var t = safe_add(safe_add(bit_rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
                e = d;
                d = c;
                c = bit_rol(b, 30);
                b = a;
                a = t;
              }
              a = safe_add(a, oa);
              b = safe_add(b, ob);
              c = safe_add(c, oc);
              d = safe_add(d, od);
              e = safe_add(e, oe);
            }
            return Array(a, b, c, d, e);
          }
          function sha1_ft (t, b, c, d) {
            if (t < 20) return (b & c) | ((~b) & d);
            if (t < 40) return b ^ c ^ d;
            if (t < 60) return (b & c) | (b & d) | (c & d);
            return b ^ c ^ d;
          }
          function sha1_kt (t) {
            return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 : (t < 60) ? -1894007588 : -899497514;
          }
          function rstr_sha1 (s) {
            return binb2rstr(binb_sha1(rstr2binb(s), s.length * 8));
          }
          function rstr2hex (input) {
            var hex_tab, output, x, i;
            hex_tab = "0123456789abcdef";
            output = "";
            for (i = 0; i < input.length; i++) {
              x = input.charCodeAt(i);
              output = output + hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F);
            }
            return output;
          }
          return rstr2hex(rstr_sha1(str));
        },
        sha: function (o) {
          var h, r;
          if (o.str) {
            // if we have already hashed this string, return the precomputed value
            if ($.v.sha[o.str]) {
              r = $.v.sha[o.str];
            } else {
              r = $.f.hash(o.str);
              $.v.sha[o.str] = r;
            }
          }
          return r;
        },
        // check a domain for a match against hashlist
        checkDisallowedDomain: function (url) {
          var i, j, p, r, t;
          if (!url) {
            url = $.d.URL;
          }
          // what we're returning
          r = false;
          // host components: ['www', 'foo', 'com']

          p = url.split('/');
          if (p[2]) {
            p = p[2].split('.');
            // test all possible domains in this domain
            if (p.length > 1) {
              // start with the top-level domain, .com
              t = p.pop();
              for (i = p.length - 1; i > -1; i = i - 1) {
                // test foo.com, then www.foo.com
                t = p[i] + '.' + t;
                // get the hash
                h = $.f.sha({str: t});
                // do any of our partial hashes match our domain?
                for (j = $.a.hashList.length - 1; j > -1; j = j - 1) {
                  if (h.match($.a.hashList[j])) {
                    // return the domain that failed instead of true,
                    // so we can pop special alerts for special domains
                    return t;
                  }
                }
              }
            }
          }
          return r;
        },
        // console.log only if debug is on
        debug: function (o) {
          if ($.v.config.debug && $.w.console) {
            if ($.w.console.log) {
              console.log(o);
            } else {
              // some sites (Twitter) that disable console.log don't know about console.table
              if ($.w.console.table) {
                $.w.console.table(o);
              }
            }
          }
        },
        // ping the log with info
        log: function (o) {
          var k, q;
          o.url = o.url || $.d.URL;
          q = '?type=pinmarklet&v=' + $.a.ver;
          if (o.reason === 'grid_rendered') {
            // generated by a third party kind enough to tell us who they are
            if ($.v.config.via) {
              o.via = $.v.config.via;
            }
            // generated by pinit.js
            if ($.v.config.guid) {
              o.guid = $.v.config.guid;
            }
          }
          for (k in o) {
            if (k !== 'extras') {
              q = q + '&pm' + k.charAt(0).toUpperCase() + k.slice(1) + '=' + encodeURIComponent(o[k]);
            }
          }
          // append any extra keys and values we may have sent that should NOT start with pM
          if (o.extras) {
            for (k in o.extras) {
              q = q + '&' + k + '=' + o.extras[k];
            }
          }
          new Image().src = $.a.log + q;
          $.f.debug('Logging: ' + q);
        },
        // talk to an outside API
        call: function (o) {
          // we're inside an extension or other client that can't handle JSON-P returns
          if ($.v.doNotCall) {
            return;
          }
          var n, s, id, sep = '?';
          // next available callback
          n = $.f.callback.length;
          // id will help us remove the SCRIPT tag later
          id = $.a.k + '.f.callback[' + n + ']';

          // create the callback
          $.f.callback[n] = function (r) {
            o.func(r, n);
            var s = $.d.getElementById(id);
            s.parentNode.removeChild(s);
          };
          // some calls may come with a query string already set
          if (o.url.match(/\?/)) {
            sep = '&';
          }
          // make and call the new script node
          s = $.d.createElement('SCRIPT');
          s.id = id;
          s.type = 'text/javascript';
          s.charset = 'utf-8';
          s.src = o.url + sep + 'callback=' + id;
          $.d.body.appendChild(s);
          $.f.debug('Calling: ' + s.src);
        },
        // get a DOM property or text attribute
        get: function (o) {
          var v = null;
          if (o.el && o.att) {
            if (typeof o.el[o.att] !== 'undefined') {
              v = o.el[o.att];
            } else {
              v = o.el.getAttribute(o.att);
            }
          }
          return v;
        },
        // set a DOM property or text attribute
        set: function (o) {
          if (o.el && o.att && o.value) {
            if (typeof o.el[o.att] === 'string') {
              o.el[o.att] = o.value;
            } else {
              o.el.setAttribute(o.att, o.value);
            }
          }
        },
        // remove a DOM element
        kill: function (o) {
          if (typeof o === 'string') {
            o = $.d.getElementById(o);
          }
          if (o && o.parentNode) {
            o.parentNode.removeChild(o);
          }
        },
        // return the right string to show as default description
        getDescription: function (o) {
          if (!o) {
            o = {};
          }

          var r, q, srcMatch, filter;

          // don't allow single-word descriptions that appear to be files or URLs
          filter = function (str) {
            // we might get undefined
            if (str) {
              // we might get an array if we are looking at a META
              if (typeof str === 'object' && str.length) {
                str = str[0];
              }
              // trim leading and trailing spaces
              str = str.trim();
              // are there zero spaces in the remaining string?
              if (!str.match(/\s/)) {
                // trim hash and query hash
                str = str.split('#')[0].split('?')[0];
                // does it start with an http protocol or end with a file format we know about?
                if (str.match(/^http?s:\/\//) || str.match(/\.(gif|jpeg|jpeg|png|webp)/)) {
                  // clear it out
                  str = '';
                }
              }
            } else {
              str = '';
            }
            return str;
          }

          // has the reader selected any text?
          r = filter('' + $.w.getSelection());

          if (!r) {
            // should we look at the image
            if (o && o.src) {
              // does the image have a data-pin-description?
              r = filter($.f.get({el: o, att: 'data-pin-description'}));
              // does the image have a title or alt attribute?
              if (!r) {
                r = filter(o.title || o.alt);
              }
              // does the page have document.title?
              if (!r) {
                r = filter($.d.title);
              }
            } else {
              // does the page have a generic meta description or title?
              if (!r) {
                r = filter($.v.data.meta.description || $.v.data.meta.title);
              }
              // does the page have an OG description?
              if (!r) {
                r = filter($.v.ogDescription);
              }
              // does the page have document.title?
              if (!r) {
                // allow filenames for imageless pins
                if (o.imageless) {
                  // split the URL, take last element of path, remove hash, remove query, remove file extension
                  r = $.d.URL.split('/').pop().split('#')[0].split('?')[0].split('.')[0];
                } else {
                  r = filter($.d.title);
                }
              }
            }
          }
          return r;
        },
        // look for special instructions on the last instance of the SCRIPT tag that created us
        getConfig: function () {
          var i, j, s = $.d.getElementsByTagName('SCRIPT');
          // loop through all SCRIPT tags backwards, so we look at the last one first
          for (i = s.length - 1; i > -1; i = i - 1) {
            // are we on one whose source matches ours?
            if (s[i].src.match($.a.me)) {
              // loop through all possible valid config parameters
              for (j = 0; j < $.a.config.length; j = j + 1 ) {
                // if a value is null, $.v.config[value] will be set to null
                $.v.config[$.a.config[j]] = s[i].getAttribute($.a.config[j]);
              }
              // kill the SCRIPT tag
              $.f.kill(s[i]);
              // stop looking for more
              break;
            }
          }
        },
        // return an imageless pin representation
        makeImageless: function () {
          var domain, hsvToRgb;
          // we will pick a background color based on domain
          domain = $.d.URL.split('/')[2];
          // convert HSV color to RGB triple
          hsvToRgb = function (h, s, v) {
            var i, f, p, q, t, r, g, b, format;
            h = h / 60;
            i = Math.floor(h);
            f = h - i;
            p = v * (1 - s);
            q = v * (1 - s * f);
            t = v * (1 - s * (1 - f));
            switch(i) {
              case 0:
                r = v;
                g = t;
                b = p;
                break;
              case 1:
                r = q;
                g = v;
                b = p;
                break;
              case 2:
                r = p;
                g = v;
                b = t;
                break;
              case 3:
                r = p;
                g = q;
                b = v;
                break;
              case 4:
                r = t;
                g = p;
                b = v;
                break;
              case 5:
              default:
                r = v;
                g = p;
                b = q;
            }
            // convert to two-digit hex value
            format = function (n) {
              return ("00" + Math.round(n * 255).toString(16)).substr(-2, 2);
            };
            // format for use on a Web page
            return '#' + format(r) + format(g) + format(b);
          };
          // build and return
          return {
            description: $.f.getDescription({imageless: true}),
            height: $.a.thumbSize,
            width: $.a.thumbSize,
            score: $.a.thumbSize * $.a.thumbSize,
            url: $.d.URL,
            siteName: $.v.ogSiteName || domain,
            color: hsvToRgb(parseInt($.f.sha({str: domain}).substr(0, 3), 16) % 360, .25, .75)
          };
        },
        // helper for when we need to see just a few attributes
        getImgData: function (o) {
          var r = {
            status: 'loaded',
            height: o.naturalHeight || 0,
            width: o.naturalWidth || 0,
            src: o.src
          };
          return r;
        },
        // filter small or unsupported images
        filterImg: function (o) {
          // is either dimension under 90
          if (o.width < 90 || o.height < 90) {
            return ('Image dimensions are both too small.');
          }
          // both dimensions under 120
          if (o.width < 120 && o.height < 120) {
            return('One image dimension is too small.');
          }
          // width is greater than 3x height
          if (o.width > o.height * 3) {
            return('Image is too wide.');
          }
          // most times we don't allow data URIs
          if (!o.src.match(/^https?:\/\//)) {
            return 'Image source does not begin with http.';
          }
          // don't offer to pin webp images
          if (o.src.match(/\.webp(|\?.*|#.*)$/)) {
            return 'Cannot pin .webp images, sorry!';
          }
          return false;
        },
        // return image parameters
        loadImg: function (o) {
          var img, test, hash;
          if (o.src) {
            if (!$.f.checkDisallowedDomain(o.src)) {
              hash = $.f.sha({str: o.src});
              // don't try to load if we've already got this one
              if (!$.v.data.img[hash]) {
                // see if we can find the image extension and bail out if it's SVG
                test = o.src.split('#')[0].split('?')[0].split('.').pop();
                if (test === 'svg') {
                  $.v.data.img[hash] = {
                    src: o.src,
                    status: 'invalid',
                    reason: 'SVG images are not supported on Pinterest'
                  };
                  return;
                }
                // start a new image
                img = new Image();
                // increment image-loading count
                $.v.count.imgLoading = $.v.count.imgLoading + 1;
                $.v.data.img[hash] = {
                  mod: o.mod || {},
                  status: 'loading'
                };
                // did not load property
                img.onerror = function (e) {
                  // decrement image-loading count
                  $.v.count.imgLoading = $.v.count.imgLoading - 1;
                  // do we need to remove data-pin-media from some other image's mod object?
                  for (test in $.v.data.img) {
                    if ($.v.data.img[test].mod && $.v.data.img[test].mod.pinMedia === o.src) {
                      delete $.v.data.img[test].mod.pinMedia;
                    }
                  }
                  $.v.data.img[hash].status = 'error';
                };
                // loaded
                img.onload = function () {
                  // get image attributes
                  var k, data = $.f.getImgData(img), filterReason = $.f.filterImg(data);

                  if (o.override) {
                    for (k = 0; k < o.override.length; k = k + 1) {
                      $.v.override[o.override[k]] = true;
                    }
                  }

                  if (!filterReason) {
                    // prevent imageless pin representations if we have at least one image larger than 237x237
                    if (data.height > $.a.thumbSize && data.width > $.a.thumbSize) {
                      $.v.override.imageless = true;
                    }
                    if (o.mod) {
                      $.v.data.img[hash].mod = o.mod;
                    }
                    for (var k in data) {
                      // set all properties
                      if (data[k]) {
                        $.v.data.img[hash][k] = data[k];
                      }
                    }
                    if (o.src === $.d.URL) {
                      // don't fill in a default description
                      k.description = '';
                      // don't produce an imageless pin
                      $.v.override.imageless = true;
                    }
                    // we need to swap out an image found on the page for an image that's been loaded live
                    if (o.update) {
                      $.f.debug('Image source changed from ' + o.update + ' to ' + o.src);
                      upHash = $.f.sha({str: o.update});
                      if (o.mod) {
                        $.v.data.img[upHash].mod = o.mod;
                      }
                      $.v.data.img[upHash].src = o.src;
                      $.v.data.img[upHash].height = data.height;
                      $.v.data.img[upHash].width = data.width;
                      $.v.data.img[hash] = $.v.data.img[upHash];
                      delete $.v.data.img[upHash];
                    }
                    $.v.data.img[hash].status = 'ok';
                  } else {
                    // update so we know it was filtered and why
                    $.v.data.img[hash] = {
                      status: 'filtered',
                      reason: filterReason,
                      src: o.src.substr(0, 64)
                    }
                    // add an ellipsis if we've truncated the source
                    if (o.src.length > 64) {
                      $.v.data.img[hash].src = $.v.data.img[hash].src + '...';
                    }
                  }
                  // decrement image-loading count
                  $.v.count.imgLoading = $.v.count.imgLoading - 1;
                };
                // setting the source is enough to start modern browsers loading the image
                img.src = o.src;
              }
            }
          }
        },
        // keyed by tag name
        handle: {
          page: function () {
            var k, r, p, q, u;
            r = false;

            // Amazon page on mobile
            if ($.d.URL.match($.a.pattern.page.amazonPage)) {
              // grab all images
              k = $.d.getElementsByTagName('IMG');
              for (q = 0; q < k.length; q = q + 1) {
                // seek the ASIN attribute, currently data-fling-asin
                u = k[q].getAttribute($.a.pattern.att.amazonAsin);
                // if we found it and it's in document.URL, we're done
                if (u && $.d.URL.match(u)) {
                  $.f.loadImg({
                    src: k[q].currentSrc,
                    // if we successfully load this image, don't offer the imageless pin
                    override: ['imageless'],
                    mod: {
                      // hand-whittle the product URL in case we're on a GP page, which has no canonical URL
                      url: 'https://www.amazon.com/dp/' + u + '/',
                      description: $.f.getDescription(k[q])
                    }
                  });
                  r = true;
                  break;
                }
              }
            }

            // desktop Amazon product page
            if (!r && $.d.URL.match($.a.pattern.page.amazonProduct)) {
              var k = $.d.getElementById('imgTagWrapperId');
              if (k) {
                p = k.getElementsByTagName('IMG')[0];
                if (p) {
                  $.f.loadImg({
                    src: p.src,
                    // if we successfully load this image, don't offer the imageless pin
                    override: ['imageless'],
                    mod: {
                      url: $.v.data.link.canonical,
                      description: $.f.getDescription(p)
                    }
                  });
                  r = true;
                }
              }
            }

            // Instagram page - one for canonical/carousel, one for all other pages
            if ($.d.URL.match($.a.pattern.page.instagramPage)) {
              // override on global level, but look at OG within this function as images load successfully
              // yes, sorry, this is pretty awful
              $.v.override.og = true;
              if ($.d.URL.match($.a.pattern.page.instagramPhoto)) {
                // this is brittle and guaranteed to break eventually
                p = $.d.querySelector("[role=dialog]");
                if (p) {
                  // we are in carousel
                  q = p.getElementsByTagName('IMG');
                  if (q) {
                    k = q[q.length - 1];
                    if (k && k.tagName && k.tagName === 'IMG') {
                      $.f.loadImg({
                        src: k.src,
                        override: ['imageless'],
                        mod: {
                          url: $.d.URL.split('?')[0],
                          description: k.alt
                        }
                      });
                    }
                  }
                } else {
                  // we are NOT in carousel, so split OG description and try to remove curly quotes
                  k = $.v.data.meta.og.title.split(': ');
                  if (k[1]) {
                    k = k[1].substr(1, k[1].length - 2);
                  } else {
                    k = $.v.data.meta.og.title;
                  }
                  $.f.loadImg({
                    src: $.v.data.meta.og.image,
                    // if we successfully load this image, don't offer the imageless pin
                    override: ['imageless'],
                    mod: {
                      url: $.v.data.link.canonical,
                      description: k
                    }
                  });
                }
              } else {
                k = $.d.getElementsByTagName('IMG');
                for (u = 0; u < k.length; u = u + 1) {
                  // pin what's currently on the screen
                  if (k[u].currentSrc) {
                    // see if we're in a link
                    q = k[u].parentNode.parentNode.parentNode;
                    if (q.tagName === 'A' && q.href && q.href.match(/^https?:\/\//)) {
                      // we've found the parent link
                      $.f.loadImg({
                        src: k[u].currentSrc,
                        // if we successfully load this image, don't offer the imageless pin
                        override: ['imageless'],
                        mod: {
                          url: q.href.split('?')[0],
                          description: k[u].alt
                        }
                      });
                    }
                  }
                }
              }
              r = true;
            }

            // YouTube video page
            if ($.d.URL.match($.a.pattern.page.youtubeWatch)) {
              p = $.d.URL.split('v=')[1].split('&')[0].split('#')[0];
              if (p) {
                $.f.debug('found a YouTube page: ' + $.d.URL);
                $.f.loadImg({
                  src: 'https://img.youtube.com/vi/' + p + '/hqdefault.jpg',
                  // if we successfully load this image, don't offer the imageless pin
                  override: ['imageless'],
                  mod: {
                    multimedia: true,
                    url: 'https://www.youtube.com/watch/?v=' + p
                  }
                });
                r = true;
              }
            }

            // YouTube mobile page
            // if r is true, we've already found a watch page
            if (!r && $.d.URL.match($.a.pattern.page.youtubeMobile)) {
              k = $.d.getElementsByTagName('A');
              for (u = 0; u < k.length; u = u + 1) {
                if (k[u].href && k[u].href.match($.a.pattern.link.youtubeWatch)) {
                  p = k[u].href.split('v=')[1].split('&')[0].split('#')[0];
                  if (p) {
                    $.f.debug('found a YouTube video: ' + k[u].href);
                    $.f.loadImg({
                      src: 'https://img.youtube.com/vi/' + p + '/hqdefault.jpg',
                      // if we successfully load this image, don't offer the imageless pin
                      override: ['imageless'],
                      mod: {
                        multimedia: true,
                        url: 'https://www.youtube.com/watch/?v=' + p
                      }
                    });
                    r = true;
                  }
                }
              }
            }

            // Google Image Search results: find proper links; allow data:URIs
            if ($.d.URL.match($.a.pattern.page.googleImageSearch)) {
              var ires, a, i, url, media, p, o;
              // find content display area
              ires = $.d.getElementById('ires');
              if (ires) {
                // we're only going to show the images we get from this special process
                $.v.override.img = true;
                // never show the imageless pin
                $.v.override.imageless = true;
                a = ires.getElementsByTagName('A');
                for (i = 0; i < a.length; i = i + 1) {
                  if (a[i].href) {
                    img = a[i].getElementsByTagName('IMG');
                    if (img[0] && img[0].src) {
                      url = '';
                      media = '';
                      p = a[i].href.split('imgrefurl=');
                      if (p[1]) {
                        try {
                          url = decodeURIComponent(p[1].split('&')[0]);
                        } catch (e) {
                          $.f.debug('Could not run decodeURIComponent on ' + p[1]);
                        }
                      }
                      p = a[i].href.split('imgurl=');
                      if (p[1]) {
                        try {
                          media = decodeURIComponent(p[1].split('&')[0]);
                        } catch (e) {
                          $.f.debug('Could not run decodeURIComponent on ' + p[1]);
                        }
                      }
                      if (url && media) {
                        o = {
                          src: media,
                          mod: {
                            url: url
                          }
                        }
                        p = a[i].parentNode.getElementsByTagName('DIV');
                        if (p[2] && p[2].textContent) {
                          try {
                            j = JSON.parse(p[2].textContent);
                            if (typeof j === 'object') {
                              if (j.s || j.pt) {
                                o.mod.description = j.s || j.pt;
                              }
                            }
                          } catch (e) {
                            o.mod.description = p[2].textContent;
                            $.f.debug('Could not run JSON.parse on ' + p[2].textContent);
                          }
                        }
                        $.f.loadImg(o);
                        r = true;
                      }
                    }
                  }
                }
              }
            }
            return r;
          },
          iframe: function () {
            var m, i, c, p, k, q, z, j;
            m = $.d.getElementsByTagName('IFRAME');
            for (i = 0; i < m.length; i = i + 1) {
              // nothing happens if we don't have content
              c = m[i].getAttribute('src');
              if (c && c.match(/^(https?:|)\/\//)) {
                c = c.split('#')[0].split('?')[0];
                // youtube
                if (c.match($.a.pattern.iframe.youtube)) {
                  p = c.split('/');
                  if (p[4]) {
                    $.f.debug('found a YouTube player: ' + m[i].src);
                    $.f.loadImg({
                      src: 'https://img.youtube.com/vi/' + p[4] + '/hqdefault.jpg',
                      mod: {
                        multimedia: true,
                        url: 'https://www.youtube.com/watch/?v=' + p[4]
                      }
                    });
                  }
                  continue;
                }

                // instagram
                if (c.match($.a.pattern.iframe.instagram)) {
                  p = c.split('/');
                  if (p[4]) {
                    $.f.debug('found an Instagram embed: ' + m[i].src);
                    $.f.loadImg({
                      src: 'https://instagram.com/p/' + p[4] + '/media/?size=l',
                      mod: {
                        url: 'https://www.instagram.com/p/' + p[4] + '/',
                        description: $.f.getDescription()
                      }
                    });
                  }
                  continue;
                }

                // vimeo
                if (c.match($.a.pattern.iframe.vimeo)) {
                  p = 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(m[i].src);
                  q = function (r) {
                    if (r.thumbnail_url) {
                      $.f.loadImg({
                        src: r.thumbnail_url.split('_')[0] + '.jpg',
                        mod: {
                          multimedia: true,
                          url: 'https://vimeo.com/' + r.video_id,
                          description: r.title
                        }
                      });
                    }
                  };
                  $.f.call({url: p, func: q});
                  continue;
                }
              }
            }
            $.f.debug($.v.data.iframe);
          },
          img: function () {
            // override.og may have been set by a page-level discovery
            if ($.v.override.og) {
              $.f.debug('og overridden');
            } else {
              // be nice to people who share on Facebook
              if ($.v.data.meta.og && !$.v.override.og) {
                var mod = {};
                $.f.debug('og found');
                if ($.v.data.meta.og.image) {
                  $.f.debug('og:image found');
                  if ($.v.data.meta.og.image.secure_url) {
                    $.f.debug('og:secure_url found');
                    $.v.data.meta.og.image = $.v.data.meta.og.image.secure_url;
                  }
                  if (typeof $.v.data.meta.og.image === 'string') {
                    mod.ogMedia = $.v.data.meta.og.image;
                  } else {
                    $.f.debug('More than one og:image found');
                    mod.ogMedia = $.v.data.meta.og.image[0];
                  }

                  if ($.v.data.meta.og.url) {
                    if (typeof $.v.data.meta.og.url === 'string') {
                       mod.ogUrl = $.v.data.meta.og.url;
                    } else {
                      $.f.debug('More than one og:url found');
                      mod.ogUrl = $.v.data.meta.og.url[0];
                    }
                    $.f.debug('og:url found');
                  }
                  if ($.v.data.meta.og.site_name) {
                    if (typeof $.v.data.meta.og.site_name === 'string') {
                      $.v.ogSiteName = $.v.data.meta.og.site_name;
                    } else {
                      $.f.debug('More than one og:site_name found');
                      $.v.ogSiteName = $.v.data.meta.og.site_name[0];
                    }
                  }
                  if ($.v.data.meta.og.description || $.v.data.meta.og.title) {
                    $.f.debug('og:title or og:description found');
                    mod.ogDescription = $.v.data.meta.og.description || $.v.data.meta.og.title;
                    if (typeof mod.ogDescription === 'string') {
                      $.v.ogDescription = mod.ogDescription;
                    } else {
                      $.f.debug('More than one og:description found');
                      $.v.ogDescription = mod.ogDescription[0];
                    }
                  }
                  $.f.debug('loading og:image');
                  // load the image we placed in mod.ogMedia, not anything we found in $.v.data.meta.og.image, which could be an array
                  $.f.loadImg({src: mod.ogMedia, mod: mod});
                }
              }
            }

            var m, i, v, q, a, mod, order;
            m = $.d.getElementsByTagName('IMG');
            order = 0;
            for (i = 0; i < m.length; i = i + 1) {
              // be sure we have a source
              if (m[i].currentSrc) {
                // save things we want to retain
                mod = {
                  description: $.f.getDescription(m[i]),
                  sourceOrder: order
                }
                order = order + 1;
                // skip images with inline nopin attributes
                v = (m[i].getAttribute('nopin') || m[i].getAttribute('data-pin-nopin'));
                if (v) {
                  continue;
                }
                // don't alter links to point to deep-linked images
                a = m[i].parentNode;
                if (a.tagName === 'A' && a.href) {
                  // are we looking at an image that's deep-linked to another image?
                  if (!a.href.match(/(\.gif|\.jpg|\.jpeg|\.png|\.webp)/)) {
                    mod.url = a.href;
                  }
                }
                // suggested default description
                v = m[i].getAttribute('data-pin-description');
                if (v) {
                  mod.pinDescription = v;
                }
                // URL to pin instead of document.URL
                v = m[i].getAttribute('data-pin-url');
                if (v) {
                  mod.pinUrl = v;
                }
                // load whatever is currently on the screen
                $.f.loadImg({src: m[i].currentSrc, mod: mod});
                // media to pin instead of this image
                v = m[i].getAttribute('data-pin-media');
                if (v) {
                  mod.pinMedia = v;
                  // reload
                  $.f.loadImg({src: v, mod: mod, update: m[i].currentSrc});
                }

                // be nice to Twitter
                if ($.d.URL.match($.a.pattern.page.twitter) && m[i].currentSrc.match($.a.pattern.img.twitter)) {
                  a = m[i].parentNode;
                  while (a.tagName) {
                    q = a.getAttribute('data-permalink-path');
                    if (q) {
                      mod.url = 'https://twitter.com' + q;
                      mod.description = a.parentNode.getElementsByTagName('P')[0].textContent;
                      a = $.d.body;
                    }
                    a = a.parentNode;
                  }
                }

                // be nice to YouTube thumbs
                if (m[i].currentSrc.match($.a.pattern.img.youtube)) {
                  a = m[i].currentSrc.split('/vi/');
                  if (a.length) {
                    q = a[1].split('/')[0];
                    if (q) {
                      $.f.loadImg({
                        mod: {
                          multimedia: true,
                          url: 'https://www.youtube.com/watch?v=' + q
                        },
                        src: 'https://i.ytimg.com/vi/' + q + '/hqdefault.jpg',
                        update: m[i].currentSrc
                      });
                    }
                  }
                }

              }
            }
          },
          link: function () {
            var m, i;
            m = $.d.getElementsByTagName('LINK');
            for (i = 0; i < m.length; i = i + 1) {
              // knowing the canonical link will help us identify products on some pages
              if (m[i].rel && m[i].rel.toLowerCase() === 'canonical' && m[i].href) {
                $.v.data.link.canonical = m[i].href;
                $.v.data.url = m[i].href;
                break;
              }
            }
          },
          meta: function () {
            var patch, mod = {}, arr = [], obj = {}, meta = document.getElementsByTagName('META'), key, value, i, j, p, q, z;
            // scrape our META tags, looking for keys and values
            for (i = 0; i < meta.length; i = i + 1) {
              value = meta[i].getAttribute('content');
              if (value) {
                // get the property or name
                key = meta[i].getAttribute('property') || meta[i].getAttribute('name');
                if (key) {
                  // instantly short-circuit if we find the nopin meta
                  if (key.toLowerCase() === 'pinterest' && value.toLowerCase() === 'nopin') {
                    return meta[i].getAttribute('description') || true;
                  }
                  // push into an array so we can sort it later
                  arr.push({k: key, v: value});
                }
              }
            }
            // sort our array so we don't wind up overwriting things as we split on colons
            arr.sort(function (a, b) {
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
              k = arr[i].k.split(':');
              // start at the root of the object we're working on
              z = obj;
              for (j = 0; j < k.length; j = j + 1) {
                if (typeof z[k[j]] === 'undefined') {
                  // make a new sub-object
                  z[k[j]] = {};
                }
                // go again
                z = z[k[j]];
              }
              // see if we've seen this one before
              q = typeof z['~'];
              if (q === 'undefined') {
                // key does not exist, so add it
                z['~'] = arr[i].v;
              } else {
                // turn existing duplicate strings into arrays
                if (q === 'string') {
                  // convert the existing string into the first element of an array
                  z['~'] = [z['~']];
                }
                // push the next value onto the array
                z['~'].push(arr[i].v);
              }
            }
            // recursively fix up the naive object so strings show as strings
            // but objects that have both strings and sub-objects aren't lost
            patch = function (o, parentObj, parentKey) {
              for (var k in o) {
                if (typeof o[k] === 'object') {
                  // is this member zero of an array?
                  if (typeof o[k][0] === 'string') {
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
            }

            $.v.data.meta = patch(obj, null, null);

            // we have not found the Pinterest nopin meta, so look for special meta spaces (OG and Pinterest)
            mod = {};
            $.f.debug('meta data found');
            $.f.debug($.v.data.meta);
            // load Pinterest image
            if ($.v.data.meta.pin) {
              $.f.debug('data-pin found');
              if ($.v.data.meta.pin.media) {
                $.f.debug('data-pin-media found');
                mod.pinMedia = $.v.data.meta.pin.media;
                if ($.v.data.meta.pin.url) {
                  $.f.debug('data-pin-url found');
                  mod.pinUrl = $.v.data.meta.pin.url;
                }
                if ($.v.data.meta.pin.description) {
                  $.f.debug('data-pin-description found');
                  mod.pinDescription = $.v.data.meta.pin.description;
                }
                if ($.v.data.meta.pin.id) {
                  $.f.debug('data-pin-id found');
                  mod.pinId = $.v.data.meta.pin.id;
                  // don't show the imageless pin if we have a pin ID
                  $.v.override.imageless = true;
                }
                $.f.debug('loading data-pin-media');
                $.f.loadImg({src: $.v.data.meta.pin.media, mod: mod});
              }
            }
            // be nice to Instagram
            if ($.v.data.meta.instapp) {
              if ($.v.data.meta.instapp.owner_user_id) {
                if ($.v.data.meta.al) {
                  if ($.v.data.meta.al.ios) {
                    if ($.v.data.meta.al.ios.url && $.v.data.meta.al.ios.url.match('=')) {
                      $.v.insta = {
                        owner: $.v.data.meta.instapp.owner_user_id,
                        id: $.v.data.meta.al.ios.url.split('=')[1]
                      };
                      if ($.v.data.meta.instapp.hashtags) {
                        // toString works on numbers, strings, and arrays
                        $.v.insta.hashtags = $.v.data.meta.instapp.hashtags.toString();
                      }
                    }
                  }
                }
              }
            }
          }
        },
        // render the unauthed grid
        grid: function () {
          // get the page's current overflow style; we're going to set it to hidden to freeze background scrolling
          $.v.defaultBodyOverflow = '';
          // don't leave "visible" as an inline style; it's the default
          if ($.v.defaultBodyOverflow === 'visible') {
            $.v.defaultBodyOverflow = '';
          }
          // freeze the page underneath the modal
          $.d.body.style.overflow = 'hidden';
          $.f.debug('popping the unauthed grid');
          $.v.data.config = $.v.config;
          $.v.data.hazExtension = $.f.get($.d.body, 'data-pinterest-extension-installed');
          var k = JSON.stringify($.v.data);
          $.s.grid = $.d.createElement('IFRAME');
          $.s.grid.id = $.a.k + '_grid';
          $.s.grid.src = $.a.grid;
          $.s.grid.frameBorder = '0';
          $.s.grid.style = "display:block;position:fixed;height:100%;width:100%;top:0;left:0;bottom:0;right:0;margin:0;clip:auto;opacity:1;z-index:9223372036854775807";
          // when we're done
          var closeGrid = function() {
            $.d.body.style.overflow = $.v.defaultBodyOverflow;
            $.d.body.removeAttribute($.a.hazPinningNow);
            if ($.s.grid && $.s.grid.parentNode && $.s.grid.parentNode === $.d.body) {
              $.d.body.removeChild($.s.grid);
            }
          };
          var startTime = new Date().getTime();
          $.s.grid.onload = function() {
            var renderTime = new Date().getTime() - startTime;
            $.f.debug('Grid render time: ' + renderTime);
            $.f.log({'reason': 'grid_rendered', 'time': renderTime});
            $.v.receiver = $.s.grid.contentWindow;
            $.v.receiver.postMessage(k, $.s.grid.src);
            $.w.addEventListener('message', function (e) {
              $.w.clearTimeout($.v.renderFailed);
              if (e.data === 'x') {
                closeGrid();
              }
            });
            this.focus();
          };
          $.d.body.setAttribute($.a.hazPinningNow, true);
          $.d.body.appendChild($.s.grid);
          // iframe has five seconds to reply with "rendered" or we kill it
          $.v.renderFailed = $.w.setTimeout(function() {
            $.f.log({'reason': 'iframe_timeout'});
            closeGrid();
            $.v.data.close = $.v.config.msg.noPinnablesFound;
            $.f.abort();
          }, $.a.maxWait);
        },
        // special handlers for browser extensions and mobile applications
        extend: {
          browser: function () {
            var b, v, i, p;
            if (typeof chrome !== 'undefined') {
              b = chrome;
            } else {
              if (typeof browser !== 'undefined') {
                b = browser;
              }
            }
            if (b && b.runtime && b.runtime.getManifest && b.runtime.sendMessage) {
              v = b.runtime.getManifest().version;
              p = v.split('.');
              for (var i = 0; i < p.length; i = i + 1) {
                p[i] = p[i] - 0;
              }
              // are we on a v2 extension?
              if (p[0] > 1) {
                // this will be overwritten later by getConfig for other clients
                $.v.config.render = 'openGrid';
                $.w.openGrid = function () {
                  $.v.data.config = $.v.config;
                  $.v.data.config.k = $.a.k;
                  b.runtime.sendMessage({'to': 'background', 'act': 'populateGrid', 'data': $.v.data}, function() {});
                };
                // fire this if $.v.data.close alerts anything
                $.f.extendedClose = function () {
                  b.runtime.sendMessage({'to': 'background', 'act': 'closeGrid'}, function() {});
                };
                $.f.debug('advanced browser extension found');
                // only do extended behaviors for v2 extensions
                $.v.extended = true;
                // don't try to run json-p calls from inside browser extensions
                $.v.doNotCall = true;
              }
            }
          },
          ios: function () {
            // look for IOS callback
            if ($.w.webkit &&
                $.w.webkit.messageHandlers &&
                $.w.webkit.messageHandlers.pinmarkletCompletionHandler &&
                $.w.webkit.messageHandlers.pinmarkletCompletionHandler.postMessage) {
              $.v.config.render = 'openIOSAppShare';
              $.w.openIOSAppShare = function () {
                $.w.webkit.messageHandlers.pinmarkletCompletionHandler.postMessage($.v.data);
              };
              $.v.config.quiet = true;
              // fire this if $.v.data.close alerts anything
              $.f.extendedClose = function () {
                $.w.webkit.messageHandlers.pinmarkletCompletionHandler.postMessage({'pinmarkletClosedReason': $.v.data.close});
              };
              $.f.debug('IOS app found');
              $.v.extended = true;
            }
          },
          android: function () {
            // look for Android callback
            if ($.w.JavaScriptInterface && $.w.JavaScriptInterface.onPinsLoaded) {
              $.v.config.render = 'openAndroidAppShare';
              $.w.openAndroidAppShare = function () {
                $.w.JavaScriptInterface.onPinsLoaded(JSON.stringify($.v.data));
              };
              // fire this if $.v.data.close alerts anything
              $.f.extendedClose = function () {
                $.w.JavaScriptInterface.onPinsLoaded(JSON.stringify({'pinmarkletClosedReason': $.v.data.close}));
              };
              $.f.debug('Android app found');
              $.v.extended = true;
            }
          }
        },
        // ready to send data to client
        render: function () {
          $.f.debug($.v.data);
          // do we need to close instead of pinning
          if ($.v.data.close) {
            $.f.abort();
          } else {
            // are we using the IOS share extension?
            if ($.v.config.share) {
              $.f.debug('sending results to IOS share extension');
              $.d.body.setAttribute($.v.config.share, JSON.stringify($.v.data));
              if (!$.v.data.thumb.length && !$.v.config.quiet) {
                $.f.alert($.v.msg.noPinnablesFound);
              }
            } else {
              // are we using an extension or mobile app?
              if (typeof $.w[$.v.config.render] === 'function') {
                $.f.debug('sending results to ' + $.v.config.render);
                $.w[$.v.config.render]();
              } else {
                // default to the iframed grid overlay
                $.f.debug('sending results to our default iframe grid overlay');
                $.f.grid();
              }
            }
          }
        },
        // look at what we've found
        process: function () {
          var k, ch, cw, ca, mf, item, arr = [], imageless, o;
          for (k in $.v.data.img) {
            item = $.v.data.img[k];
            if (item.status === 'ok') {
              if (!item.mod) {
                item.mod = {};
              }
              // we have successfully loaded and measured this image
              mf = 1;
              ch = item.height;
              cw = item.width;
              if (cw > ch) {
                // trim width on landscape images
                cw = ch;
              } else {
                // trim height on giraffe images
                if (ch > cw * 3) {
                  ch = cw * 3;
                }
              }
              // have we changed the description?
              if (item.mod.description) {
                item.description = item.mod.description;
              }
              if (item.mod.pinDescription) {
                item.description = item.mod.pinDescription;
              }
              // have we changed the URL?
              if (item.mod.url) {
                item.url = item.mod.url;
              }
              if (item.mod.pinUrl) {
                item.url = item.mod.pinUrl;
              }
              // fix up multiplication factor
              if (item.mod.multimedia) {
                mf = mf * 3;
              }

              // any Pinterest-specific mods?
              if (item.mod.pinUrl || item.mod.pinDescription || item.mod.pinMedia) {
                mf = mf * 4;
              }
              // do we have a pin ID?
              if (item.mod.pinId) {
                mf = mf * 4;
                // save this id so we know to repin from the grid
                item.dataPinId = item.mod.pinId;
                // don't show the imageless pin if we have a pin ID
                $.v.override.imageless = true;
              }
              // small images go to the bottom
              if (item.width < $.a.thumbSize) {
                mf = mf / 2;
              }
              if (item.mod.multimedia) {
                // don't show the imageless pin if we have a video
                $.v.override.imageless = true;
                mf = mf * 2;
              }
              // a slight adjustment for source order, so identically-sized images show in the order they appear
              item.score = ch * cw * mf - (item.mod.sourceOrder || 0);
              arr.push(item);
            }
          }
          // add the imageless pin representation
          if (!$.v.override.imageless) {
            imageless = $.f.makeImageless();
            $.v.data.imageless = imageless;
            arr.push(imageless);
          }
          // sort by score, in descending order
          arr.sort(function (a, b) {
            var v = 0;
            if (a.score < b.score) {
              v = 1;
            } else {
              if (a.score > b.score) {
                v = -1;
              }
            }
            return v;
          });

          // filter any array items whose score is less than the top score divided by 10
          arr = arr.filter(function (i) {
            // clients expect media, not src
            i.media = i.src;
            // $.v.data.url could have been affected several times in several ways
            i.url = $.v.data.url;
            // apply mods?
            if (i.mod) {
              if (i.mod.description) {
                i.description = i.mod.description;
              }
              if (i.mod.url) {
                i.url = i.mod.url;
              }
            }
            if (!i.description) {
              i.description = $.f.getDescription();
            }
            // only return if our score is better than the best score divided by our quality minimum
            return i.score > arr[0].score / $.a.quality;
          });

          $.v.data.thumb = arr;

          // log Instagram meta information if found
          if ($.v.insta) {
            o = {'reason': 'insta_found', 'extras': { 'media_id': $.v.insta.id, 'owner_id': $.v.insta.owner }};
            if ($.v.insta.hashtags) {
              o.extras.hashtags = $.v.insta.hashtags
            }
            $.f.log(o);
          }

          $.f.render();
        },
        // given window.navigator.language, return appropriate strings and domain
        getStrings: function () {
          var t, lang, locale;
          t = $.w.navigator.language.toLowerCase();
          t = t.replace(/[^a-z0-9]/g, ' ');
          t = t.replace(/^\s+|\s+$/g, '');
          t = t.replace(/\s+/g, ' ');
          t = t.split(' ');
          // fix three-parters like bs-latn-ba
          if (t.length > 2) {
            for (i = t.length-1; i > -1; i = i - 1) {
              if (t[i].length !== 2) {
                t.splice(i, 1);
              }
            }
          }
          lang = t[0];
          if (t[1]) {
            locale = t[0] + '-' + t[1];
          }
          // is there an immediate match for language in strings?
          if ($.a.msg[locale]) {
            $.v.config.lang = locale;
          } else {
            if ($.a.msg[lang]) {
              $.v.config.lang = lang;
            }
          }
          $.v.config.msg = $.a.msg[$.v.config.lang];
        },
        // close withou
        abort: function () {
          if ($.v.data.close) {
            // if we've rendered the grid from the extension, close it
            if (typeof $.f.extendedClose === 'function') {
              $.f.extendedClose();
            } else {
              // have we been instructed not to say anything?
              if (!$.v.config.quiet) {
                $.w.setTimeout(function () {
                  $.w.alert($.v.data.close);
                }, 10);
              }
            }
          }
        },
        // we have a browser capable of using Pinterest, and are not on a page or domain from which we should not pin
        init: function () {
          // successfully gotten past old IE, disallowed domain, and nopin meta tests
          $.f.debug('Initing');
          // default the URL we're pinning to document.URL
          $.v.data.url = $.d.URL;
          // page handler will return true if we find a canonical thing-to-pin
          if (!$.f.handle.page()) {
            // handle embedded pages and players
            $.f.handle.iframe();
            // handle embedded images, unless we've said not to
            if (!$.v.override.img) {
              $.f.handle.img();
            }
            // check for canonical link before running page handler
            if (!$.v.override.link) {
              $.f.handle.link();
            }
          }
          // all handlers may have added images to loading stack. Here we try to wait until done
          var checkDone = function () {
            $.f.debug('left to load: ' + $.v.count.imgLoading);
            if (!$.v.count.imgLoading) {
              $.f.process();
            } else {
              $.f.debug($.v.count.imgLoading + ' images left to load.');
              if (new Date().getTime() < $.v.time.start + $.a.maxWait) {
                $.w.setTimeout(checkDone, 10);
              } else {
                $.f.debug('Timed out, rendering what we have.');
                $.f.process();
              }
            }
          };
          $.w.setTimeout(checkDone, 100);
        }
      };
    }())
  };
  // don't run if we're already running
  if (!$.d.body.getAttribute($.a.hazPinningNow)) {
    $.f.log({reason: 'init'});
    // do not run on any version of IE below 11
    if ($.w.navigator.userAgent.match(' MSIE ')) {
      // log that we're on an unsupported version of IE
      $.f.log({reason: 'oldIE'});
    } else {
      // see if any config flags were passed
      $.f.getConfig();
      // get our strings
      $.f.getStrings();
      // injected by IOS share extension
      if (typeof DATA_RESULTS_KEY === 'string') {
        $.v.config.share = DATA_RESULTS_KEY;
      }
      // add behaviors for known extensions and apps
      for (xf in $.f.extend) {
        if (typeof $.f.extend[xf] === 'function' && !$.v.extended) {
          $.f.extend[xf]();
        }
      }
      if ($.f.checkDisallowedDomain()) {
        // log that we're on an unpinnable domain
        $.f.log({reason: 'domain_not_allowed'});
        $.v.data.close = $.v.config.msg.noPinDomain;
        // abort will decide whether to pop an alert or not
        $.f.abort();
      } else {
        // short-curcuit if we find meta name=pinterest content=nopin directive
        var msg = $.f.handle.meta();
        if (msg) {
          // log that we're on an unpinnable domain
          $.f.log({reason: 'found_nopin_meta'});
          if (msg === true) {
            $.v.data.close = $.v.config.msg.noPinMeta;
          } else {
            $.v.data.close = msg;
          }
          $.f.abort();
        } else {
          $.f.init();
        }
      }
    }
  }
}(window, document, {
  k: 'PIN_' + new Date().getTime(),
  ver: '2018061201',
  grid: 'https://assets.pinterest.com/ext/grid.html?' + new Date().getTime(),
  me: /\/\/assets\.pinterest\.com\/js\/pinmarklet\.js/,
  log: 'https://log.pinterest.com/',
  maxWait: 5000,
  thumbSize: 237,
  quality: 30,
  hazPinningNow: 'data-pinterest-pinmarklet-rendered',
  config: [
    // send debugging messages to console.log
    'debug',
    // so extensions can send h, g, or r
    'pinMethod',
    // name of a function to call once we have data we want to render
    'render',
    // sent from third-party vendors like addthis, so we can tell it's them
    'via',
    // random user ID generated by pinit.js
    'guid',
    // name of the machine on pinterdev.com we want to test
    'pinbox',
    // don't pop an alert if there's trouble
    'quiet',
    // override $.a.quality if found
    'quality',
    // don't show the X in the header
    'noCancel',
    // don't show the header
    'noHeader',
    // force pinmarklet to run even though we're on pinterest.com
    'force'
  ],
  pattern: {
    // attributes are strings for direct matches
    att: {
      amazonAsin: 'data-fling-asin'
    },
    // all other patterns are regexes
    link: {
      youtubeWatch: /^(https?:|)\/\/(www|m)\.youtube\.com\/watch?/,
    },
    iframe: {
      youtube: /^(https?:|)\/\/www\.youtube\.com\/embed\//,
      instagram: /^https?:\/\/www\.instagram\.com\/p\//,
      vimeo: /^(https?:|)\/\/player\.vimeo\.com\/video\//
    },
    img: {
      twitter: /^https?:\/\/pbs\.twimg\.com\/media\//,
      youtube: /^(https?:|)\/\/i.ytimg.com\/vi\//
    },
    page: {
      instagramPage: /^https?:\/\/www\.instagram\.com\//,
      instagramPhoto: /^https?:\/\/www\.instagram\.com\/p\//,
      twitter: /^https?:\/\/twitter\.com\//,
      amazonPage: /^https?:\/\/www\.amazon\.com\//,
      amazonProduct: /^https?:\/\/www\.amazon\.com((\/|.*)\/dp\/)/,
      youtubeWatch: /^https?:\/\/(www|m)\.youtube\.com\/watch?/,
      youtubeMobile: /^https?:\/\/m\.youtube\.com\//,
      googleImageSearch: /^https?:\/\/www\.google\.com\/search(.*tbm=isch.*)/
    }
  },
  hashList: [
    /08fb2eb6424d/,
    /1529ad2b2cc8/,
    /1847807c0ea1/,
    /1d1d5ffa1d50/,
    /20c46b653b00/,
    /25f7c9982cea/,
    /293aa4f9b3d0/,
    /32aa39d04eb4/,
    /415215dcadbf/,
    /540b2374abf1/,
    /6f145d4255cf/,
    /71c1f4783e6d/,
    /79f57d83d54a/,
    /820a6e7baa0f/,
    /85ae87da6618/,
    /871de03c9980/,
    /8c2d5961f7af/,
    /8de5d416e5d2/,
    /95fa195f8b6a/,
    /9e2089d8b8f2/,
    /a32353817e45/,
    /cefdc93047b7/,
    /dbafdf055617/,
    /eefa602a72ed/,
    /efa3a2deb839/
  ],
  // strings for alerted warnings are double-quoted because some keys have hyphens inside and some values have single-quotes inside
  msg: {
    "en": {
      "noPinDomain": "Sorry, pinning is not allowed from this domain. Please contact the site operator if you have any questions.",
      "noPinMeta": "Sorry, pinning is not allowed from this page. Please contact the site operator if you have any questions.",
      "noPinnablesFound": "Sorry, couldn't find any pinnable things on this page.",
      "noPinningFromPinterest": "Oops! That button doesn't work on Pinterest. Try using the red Save button at the top of any Pin."
    },
    "cs": {
      "noPinDomain": "Je nám líto. Z této domény není možné přidávat piny. S dotazy se obracejte na provozovatele webu.",
      "noPinMeta": "Je nám líto. Z této stránky není možné přidávat piny. S dotazy se obracejte na provozovatele webu.",
      "noPinnablesFound": "Je nám líto. Na této stránce jsme nenalezli žádný obsah, který by bylo možné připnout.",
      "noPinningFromPinterest": "Jejda. Tohle tlačítko na Pinterestu nefunguje. Zkuste použít červené tlačítko Pin It v horní části kteréhokoliv pinu."
    },
    "da": {
      "noPinDomain": "Det er ikke muligt at tilføje pins fra domænet. Kontakt websitets ejer, hvis du har spørgsmål.",
      "noPinMeta": "Det er ikke tilladt at sætte pins op fra denne side. Kontakt websitets ejer, hvis du har spørgsmål.",
      "noPinnablesFound": "Der er ikke rigtigt noget at sætte op på denne side.",
      "noPinningFromPinterest": "Den knap virker desværre ikke på Pinterest. Prøv den røde Pin It-knap øverst på en pin i stedet for."
    },
    "de": {
      "noPinDomain": "Es tut uns leid, aber von dieser Domain kann nichts gepinnt werden. Bitte kontaktiere den Website-Betreiber, falls du weitere Fragen hast.",
      "noPinMeta": "Es tut uns leid, aber von dieser Seite kann nichts gepinnt werden. Bitte kontaktiere den Website-Betreiber, falls du weitere Fragen hast.",
      "noPinnablesFound": "Es tut uns leid, aber wir konnten auf dieser Seite nichts finden, was du pinnen könntest.",
      "noPinningFromPinterest": "Hoppla! Dieser Button funktioniert auf Pinterest nicht. Versuchen Sie es stattdessen mit dem roten „Pin It\"-Button, der sich oberhalb jedes Pins befindet."
    },
    "es": {
      "noPinDomain": "Lo sentimos, no está permitido pinear desde este dominio. Ponte en contacto con el operador del sitio si tienes alguna pregunta.",
      "noPinMeta": "Lo sentimos, no está permitido pinear desde esta página. Ponte en contacto con el operador del sitio si tienes alguna pregunta.",
      "noPinnablesFound": "Lo sentimos, no hemos encontrado ningún elemento que se pueda pinear en esta página.",
      "noPinningFromPinterest": "¡Vaya! Ese botón no funciona en Pinterest.  Usa el botón Pin It rojo que se encuentra en la parte superior de cualquier Pin."
    },
    "es-mx": {
      "noPinDomain": "Lamentablemente, no está permitido pinear desde este dominio. Si quieres hacer consultas, comunícate con el operador del sitio.",
      "noPinMeta": "Lamentablemente, no está permitido pinear desde esta página. Si quieres hacer consultas, comunícate con el operador del sitio.",
      "noPinnablesFound": "Lamentablemente, no se encontraron cosas para pinear en esta página.",
      "noPinningFromPinterest": "¡Uy! Ese botón no funciona en Pinterest. Intenta con el botón rojo de Pin It, ubicado en la parte superior de cualquier Pin."
    },
    "el": {
      "noPinDomain": "Λυπάμαι, δεν επιτρέπεται το καρφίτσωμα από αυτόν τον τομέα. Επικοινωνήστε με το διαχειριστή της ιστοσελίδας αν έχετε απορίες.",
      "noPinMeta": "Λυπάμαι, δεν επιτρέπεται το καρφίτσωμα από αυτήν τη σελίδα. Επικοινωνήστε με το διαχειριστή της ιστοσελίδας αν έχετε απορίες.",
      "noPinnablesFound": "Λυπάμαι, δεν ήταν δυνατή η εύρεση στοιχείων που μπορούν να καρφιτσωθούν σε αυτήν τη σελίδα.",
      "noPinningFromPinterest": "Δυστυχώς, αυτό το κουμπί δεν λειτουργεί στο Pinterest. Δοκιμάστε να χρησιμοποιήσετε το κόκκινο κουμπί Pin It στο επάνω μέρος οποιουδήποτε pin."
    },
    "fi": {
      "noPinDomain": "Et voi tehdä Pin-lisäyksiä tästä verkkotunnuksesta. Jos sinulla on kysyttävää, ota yhteyttä sivuston ylläpitäjään.",
      "noPinMeta": "Et voi tehdä Pin-lisäyksiä tältä sivulta. Jos sinulla on kysyttävää, ota yhteyttä sivuston ylläpitäjään.",
      "noPinnablesFound": "Sivulta ei valitettavasti löydy sisältöä, jota voi lisätä.",
      "noPinningFromPinterest": "Hups! Painike ei toimi Pinterestissä. Käytä Pin-lisäyksen yläosassa näkyvää punaista Pin it -painiketta."
    },
    "fr": {
      "noPinDomain": "Désolé, mais vous ne pouvez pas épingler les contenus de ce domaine. Pour toute question, veuillez contacter l'administrateur du site.",
      "noPinMeta": "Désolé, mais vous ne pouvez pas épingler les contenus de cette page. Pour toute question, veuillez contacter l'administrateur du site.",
      "noPinnablesFound": "Désolé, mais aucun contenu susceptible d'être épinglé n'a été trouvé sur cette page.",
      "noPinningFromPinterest": "Oups… Ce bouton ne fonctionne pas sur Pinterest. Essayez d'utiliser le bouton rouge Pin It en haut de chaque épingle."
    },
    "id": {
      "noPinDomain": "Maaf, Anda tidak diizinkan mengepin dari domain ini. Hubungi operator situs jika Anda memiliki pertanyaan.",
      "noPinMeta": "Maaf, Anda tidak diizinkan mengepin dari halaman ini. Silakan hubungi operator situs jika Anda memiliki pertanyaan.",
      "noPinnablesFound": "Maaf, tidak ada yang bisa dipin dari halaman ini.",
      "noPinningFromPinterest": "Duh! Tombol itu tidak bisa berfungsi di Pinterest. Cobalah menggunakan tombol Pin It di Pin mana saja"
    },
    "it": {
      "noPinDomain": "Ci dispiace, ma l'aggiunta di Pin non è consentita da questo dominio. Se hai domande, contatta il gestore del sito.",
      "noPinMeta": "Ci dispiace, ma l'aggiunta di Pin non è consentita da questa pagina. Se hai domande, contatta il gestore del sito.",
      "noPinnablesFound": "Spiacenti, impossibile trovare immagini o video che è possibile aggiungere ai Pin in questa pagina.",
      "noPinningFromPinterest": "Spiacenti! Questo pulsante non funziona su Pinterest. Prova a utilizzare il pulsante rosso Pin It nella parte superiore di qualsiasi Pin."
    },
    "hi": {
      "noPinDomain": "क्षमा करें, इस डोमेन से पिन लगाने की अनुमति नहीं है। अगर आपका कोई प्रश्न हैं, तो कृपया साइट ऑपरेटर से संपर्क करें।",
      "noPinMeta": "क्षमा करें, इस पेज से पिन लगाने की अनुमति नहीं है। अगर आपका कोई प्रश्न हैं, तो कृपया साइट ऑपरेटर से संपर्क करें।",
      "noPinnablesFound": "क्षमा करें, इस पेज पर कोई भी पिन लगाने वाली चीज़ नहीं मिल सकी।",
      "noPinningFromPinterest": "ओह! वह बटन Pinterest पर काम नहीं करता। किसी भी पिन के टॉप पर लाल पिन इट बटन का इस्तेमाल करने की कोशिश करें।"
    },
    "hu": {
      "noPinDomain": "Sajnáljuk, ebből a tartományból nem lehet pinelni. Kérjük, kérdéseiddel fordulj az oldal üzemeltetőjéhez.",
      "noPinMeta": "Sajnáljuk, erről az oldalról nem lehet pinelni. Kérjük, kérdéseiddel fordulj az oldal üzemeltetőjéhez.",
      "noPinnablesFound": "Sajnáljuk, ezen az oldalon nem található semmilyen pinelhető dolog.",
      "noPinningFromPinterest": "Hoppá! Ez a gomb nem működik a Pinteresten. Próbáld meg a pinek bal felső sarkában lévő piros Pin It gombot használni."
    },
    "ja": {
      "noPinDomain": "し訳ありません。HTML 以外のページでピンすることはできません。画像をアップロードしようと試みている場合は、pinterest.com にアクセスしてください。",
      "noPinMeta": "このページからのピンは許可されていません。ご質問がある場合は、サイト運営者にお問い合わせください。",
      "noPinnablesFound": "申し訳ございません、このページでピンできるアイテムは見つかりませんでした。",
      "noPinningFromPinterest": "Pinterest ではこのボタンは使えません。 ピンの上部にある赤い [ピン] ボタンをお使いください。"
    },
    "ko": {
      "noPinDomain": "죄송합니다. 이 도메인에서는 핀하기가 허용되지 않습니다. 질문이 있으시면 사이트 운영자에게 문의하시기 바랍니다.",
      "noPinMeta": "죄송합니다. 이 페이지에서는 핀하기가 허용되지 않습니다. 질문이 있으시면 사이트 운영자에게 문의하시기 바랍니다.",
      "noPinnablesFound": "죄송합니다. 이 페이지에서 핀할 수 있는 것을 찾지 못했습니다.",
      "noPinningFromPinterest": "죄송합니다. Pinterest에서 사용할 수 없는 버튼입니다. 핀 상단에 있는 빨간색 Pin It 버튼을 사용해 보세요."
    },
    "ms": {
      "noPinDomain": "Maaf, mengepin tidak dibenarkan dari domain ini. Sila hubungi pengendali laman jika anda ada sebarang solan.",
      "noPinMeta": "Maaf, mengepin tidak dibenarkan dari halaman ini. Sila hubungi pengendali laman jika anda ada sebarang soalan.",
      "noPinnablesFound": "Maaf, tidak dapat mencari sebarang imej yang boleh dipin pada halaman ini.",
      "noPinningFromPinterest": "Alamak! Butang itu tidak berfungsi di Pinterest. Sila cuba menggunakan butang Pin It merah di atas mana-mana Pin."
    },
    "nb": {
      "noPinDomain": "Beklager, pinning er ikke tillatt fra dette domenet. Ta kontakt med webmasteren hvis du har spørsmål.",
      "noPinMeta": "Beklager, pinning er ikke tillatt fra denne siden. Ta kontakt med webmasteren hvis du har spørsmål.",
      "noPinnablesFound": "Beklager, kunne ikke finne noen ting som kunne pinnes på denne siden.",
      "noPinningFromPinterest": "Oops! Den knappen fungerer ikke på Pinterest. Prøv å bruke den røde Pin It-knappen som er på toppen av alle Pins."
    },
    "nl": {
      "noPinDomain": "Sorry, het is niet toegestaan om vanaf dit domein te pinnen. Neem contact op met de beheerder van deze website als je vragen hebt.",
      "noPinMeta": "Sorry, het is niet toegestaan om vanaf dit domein te pinnen. Neem contact op met de beheerder van deze website als je vragen hebt.",
      "noPinnablesFound": "Sorry, er is niets wat je kunt pinnen op deze pagina.",
      "noPinningFromPinterest": "Oeps! Die knop werkt niet op Pinterest. Probeer de rode Pin It-knoppen die boven pins zweven."
    },
    "pl": {
      "noPinDomain": "Niestety przypinanie z tej domeny jest niedozwolone. Skontaktuj się z operatorem witryny, jeśli masz pytania.",
      "noPinMeta": "Niestety przypinanie z tej strony jest niedozwolone. Skontaktuj się z operatorem witryny, jeśli masz pytania.",
      "noPinnablesFound": "Niestety na tej stronie nie ma żadnych rzeczy do przypinania.",
      "noPinningFromPinterest": "Ups! Ten przycisk nie działa na Pintereście. Spróbuj użyć czerwonego przycisku Pin It u góry dowolnego Pina."
    },
    "pt": {
      "noPinDomain": "Lamentamos, mas não é permitido afixar pins a partir deste domínio. Em caso de dúvidas, contacta o operador do site.",
      "noPinMeta": "Lamentamos, mas não é permitido afixar pins a partir desta página. Em caso de dúvidas, contacta o operador do site.",
      "noPinnablesFound": "Lamentamos, mas não foi possível encontrar nesta página nenhum conteúdo que possa ser afixado.",
      "noPinningFromPinterest": "Ups!  Esse botão não funciona no Pinterest.  Tenta utilizar o botão vermelho Pin It, que se encontra na parte superior de cada Pin."
    },
    "pt-br": {
      "noPinDomain": "Não é possível pinar a partir deste domínio. Entre em contato com o operador do site se tiver dúvidas.",
      "noPinMeta": "Não é possível pinar a partir desta página. Entre em contato com o operador do site se tiver dúvidas.",
      "noPinnablesFound": "Não foi possível encontrar nesta página conteúdo que possa ser pinado.",
      "noPinningFromPinterest": "Opa! Este botão não funciona no Pinterest. Tente usar o botão vermelho Pin It, localizado na parte superior de qualquer Pin."
    },
    "ro": {
      "noPinDomain": "Ne pare rău, nu se pot adăuga Pinuri de pe acest site. Te rugăm să-l contactezi pe operatorul site-ului dacă ai întrebări.",
      "noPinMeta": "Ne pare rău, nu se pot adăuga Pinuri de pe această pagină. Te rugăm să-l contactezi pe operatorul site-ului dacă ai întrebări.",
      "noPinnablesFound": "Ne pare rău, nu am putut găsi conținut pentru adăugat ca Pinuri pe această pagină.",
      "noPinningFromPinterest": "Oops! Acest buton nu funcționează pe Pinterest. Încearcă să folosești butonul roșu Pin It din partea de sus a oricărui Pin."
    },
    "ru": {
      "noPinDomain": "К сожалению, прикалывание Пинов в данном домене невозможно. Со всеми вопросами обращайтесь к администратору веб-сайта.",
      "noPinMeta": "К сожалению, прикалывание Пинов с данной страницы невозможно. Со всеми вопросами обращайтесь к администратору веб-сайта.",
      "noPinnablesFound": "На этой странице нет ничего, что можно было бы приколоть.",
      "noPinningFromPinterest": "К сожалению, данная кнопка не работает в Pinterest. Попробуйте использовать красную кнопку Pin It, находящуюся в верхней части любого Пина."
    },
    "sk": {
      "noPinDomain": "Prepáčte, z tejto domény si nemôžete pripínať piny. Kontaktujte prevádzkovateľa stránky, ak máte nejaké otázky.",
      "noPinMeta": "Prepáčte, z tejto stránky si nemôžete pripínať piny. Kontaktujte prevádzkovateľa stránky, ak máte nejaké otázky.",
      "noPinnablesFound": "Prepáčte, na tejto stránke sme nenašli nič na pripnutie.",
      "noPinningFromPinterest": "Hopla! To tlačidlo nefunguje na Pintereste. Skúste použiť červené tlačidlo Pin It navrchu hociktorého pinu."
    },
    "sv": {
      "noPinDomain": "Tyvärr går det inte att pinna från den här domänen. Kontakta webbplatsoperatören om du har frågor.",
      "noPinMeta": "Det går inte att pinna från den här sidan. Kontakta webbplatsoperatören om du har frågor.",
      "noPinnablesFound": "Det gick inte att hitta något på den här sidan som går att pinna.",
      "noPinningFromPinterest": "Hoppsan! Den knappen fungerar inte på Pinterest. Försök använda den röda Pin It-knappen överst på varje pin."
    },
    "th": {
      "noPinDomain": "ขออภัย โดเมนนี้ไม่อนุญาตให้ปักพิน กรุณาติดต่อผู้ดูแลเว็บไซต์หากมีข้อสงสัย",
      "noPinMeta": "ขออภัย เพจนี้ไม่อนุญาตให้ปักพิน กรุณาติดต่อผู้ดูแลเว็บไซต์หากมีข้อสงสัย",
      "noPinnablesFound": "ขออภัย ไม่พบอะไรที่ปักพินได้ในเพจนี้",
      "noPinningFromPinterest": "โอ๊ะ! ปุ่มนั้นใช้ไม่ได้กับ Pinterest ลองใช้ปุ่ม Pin It สีแดงด้านบนของพินสิ"
    },
    "tl": {
      "noPinDomain": "Sorry, hindi allowed ang pinning sa domain na 'to. Paki-contact ang site operator kung may tanong ka.",
      "noPinMeta": "Sorry, hindi allowed ang pinning mula sa page na 'to. Paki-contact ang site operator kung may tanong ka.",
      "noPinnablesFound": "Sorry, walang makitang puwedeng i-pin sa page na 'to.",
      "noPinningFromPinterest": "Ay, teka! Hindi gumagana ang button na 'yan sa Pinterest. Subukan ang pulang Pin It button sa itaas ng anumang Pin."
    },
    "tr": {
      "noPinDomain": "Üzgünüz, bu alan adından pinlemeye izin verilmiyor. Sorularınız varsa, lütfen site operatörüne başvurun.",
      "noPinMeta": "Üzgünüz, bu sayfadan pinlemeye izin verilmiyor. Sorularınız varsa, lütfen site operatörüne başvurun.",
      "noPinnablesFound": "Üzgünüz, bu sayfada pinlenebilecek bir şey bulunamadı.",
      "noPinningFromPinterest": "Dikkat! Bu düğme Pinterest'te çalışmaz. Herhangi bir Pinin üst tarafındaki kırmızı Pin It düğmesini kullanmayı deneyin."
    },
    "uk": {
      "noPinDomain": "На жаль, приколювати піни з цього домену не можна. Якщо у вас виникли запитання, зв'яжіться з оператором веб-сайту.",
      "noPinMeta": "На жаль, приколювати піни з цієї сторінки не можна. Якщо у вас виникли запитання, зв'яжіться з оператором веб-сайту.",
      "noPinnablesFound": "На жаль, ми не змогли знайти на цій сторінці зображень, які можна було б приколоти.",
      "noPinningFromPinterest": "Ой! Ця кнопка не працює у Pinterest. Спробуйте скористатися червоною кнопкою «Pin It», що знаходиться у верхній частині кожного піна."
    },
    "vi": {
      "noPinDomain": "Rất tiếc, không cho phép ghim từ miền này. Vui lòng liên hệ người điều hành trang web nếu bạn có thắc mắc.",
      "noPinMeta": "Rất tiếc, không cho phép ghim từ trang này. Vui lòng liên hệ người điều hành trang web nếu bạn có thắc mắc.",
      "noPinnablesFound": "Rất tiếc, không thể tìm thấy thứ gì ghim được trên trang này.",
      "noPinningFromPinterest": "Rất tiếc! Nút đó không hoạt động trên Pinterest. Hãy thử sử dụng nút Pin It màu đỏ ở phía trên bất kỳ Ghim nào."
    }
  }
}));
