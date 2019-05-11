// separate rendering of pin preview from boards
// add X closers to success and fail overlays
// send and receive session time check

((w, d, a) => {
  let $ = (w[a.k] = {
    w,
    d,
    a,
    b: chrome || browser,
    v: {
      css: "",
      lastDescription: "",
      hashtags: {},
      hashtagViewed: false,
      hashtagElements: [],
      selectedHashtag: null,
      filterable: [],
      back: [],
      lastFilterValue: "a",
      msg: {}
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
        let r = null;
        if (typeof o.el[o.att] === "string") {
          r = o.el[o.tt];
        } else {
          r = o.el.getAttribute($.a.dataAttributePrefix + o.att);
        }
        return r;
      },
      // set a DOM property or text attribute
      set: o => {
        if (typeof o.el[o.att] === "string") {
          o.el[o.att] = o.string;
        } else {
          o.el.setAttribute($.a.dataAttributePrefix + o.att, o.string);
        }
      },
      // create a DOM element
      make: o => {
        let el = false,
          t,
          a,
          k;
        for (t in o) {
          el = $.d.createElement(t);
          for (a in o[t]) {
            if (typeof o[t][a] === "string") {
              $.f.set({
                el: el,
                att: a,
                string: o[t][a]
              });
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
        o.via = $.v.me;
        o.to = "background";
        $.b.runtime.sendMessage(o);
      },
      // send a ping from the background process to log.pinterest.com
      log: o => {
        o.lv = $.a.ver;
        $.f.send({
          act: "log",
          data: o
        });
      },
      // remove a DOM element
      kill: o => {
        if (o.el && o.el.parentNode) {
          o.el.parentNode.removeChild(o.el);
        }
      },
      // return an event's target element
      getEl: e => {
        let r = e.target;
        // text node; return parent
        if (r.targetNodeType === 3) {
          r = r.parentNode;
        }
        return r;
      },
      // return moz, webkit, ms, etc
      getVendorPrefix: () => {
        let x = /^(moz|webkit|ms)(?=[A-Z])/i,
          r = "",
          p;
        for (p in $.d.b.style) {
          if (x.test(p)) {
            r = `-${p.match(x)[0].toLowerCase()}-`;
            break;
          }
        }
        return r;
      },
      // build stylesheet
      buildStyleSheet: () => {
        let css, rules, k, re, repl;
        css = $.f.make({ STYLE: { type: "text/css" } });
        rules = $.v.css;
        // each rule has our randomly-created key at its root to minimize style collisions
        rules = rules.replace(/\._/g, "." + a.k + "_");
        // strings to replace in CSS rules
        repl = {
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
        let name,
          i,
          k,
          pad,
          key,
          rules = "",
          selector = o.str || "";
        for (k in o.obj) {
          if (typeof o.obj[k] === "string") {
            rules = `${rules}\n ${k}: ${o.obj[k]};`;
          }
          if (typeof o.obj[k] === "object") {
            key = selector + " " + k;
            key = key.replace(/ &/g, "");
            key = key.replace(/,/g, `, ${selector}`);
            $.f.presentation({ obj: o.obj[k], str: key });
          }
        }
        // add selector and rules to stylesheet
        if (selector && rules) {
          $.v.css = `${$.v.css}${selector} { ${rules}\n}\n`;
        }
        // if this is our root, remove from current context and make stylesheet
        if (o.obj === $.a.styles) {
          $.w.setTimeout(() => {
            $.f.buildStyleSheet();
          }, 1);
        }
      },
      // build complex structure from a JSON template
      buildOne: o => {
        let key, classNames, i, container, child, text, value;
        for (key in o.obj) {
          value = o.obj[key];
          if (typeof value === "string") {
            // addClass may contain more than one selector
            if (key === "addClass") {
              classNames = value.split(" ");
              for (i = 0; i < classNames.length; i = i + 1) {
                o.el.className = `${o.el.className} ${$.a.k}_${classNames[i]}`;
              }
            } else {
              if (key !== "tag") {
                $.f.set({
                  el: o.el,
                  att: key,
                  string: value
                });
              }
            }
          } else {
            // create a new container
            container = {
              [value.tag || "SPAN"]: {
                className: `${$.a.k}_${key}`
              }
            };
            child = $.f.make(container);
            o.el.appendChild(child);
            if (!$.s[key]) {
              $.s[key] = child;
              // fill with translated text if needed
              if ($.v.msg[key]) {
                text = $.v.msg[key];
                if (child.tagName === "INPUT") {
                  // placeholder
                  child.placeholder = text;
                } else {
                  // string in non-input element
                  child.innerText = $.f.clean({ str: text });
                }
              }
            }
            // recurse
            $.f.buildOne({ obj: value, el: child });
          }
        }
      },
      // clean troublesome characters and extra whitespace from strings that may be shown onscreen
      clean: o => {
        return new DOMParser()
          .parseFromString(o.str, "text/html")
          .documentElement.textContent.replace(/(\n|\r)/g, "")
          .replace(/ +(?= )/g, "");
      },
      changeClass: o => {
        let i, applyThis;
        if (o.el) {
          if (!o.el.length) {
            o.el = [o.el];
          }
          for (i = 0; i < o.el.length; i = i + 1) {
            // do your adds and removes
            if (o.el[i] && o.el[i].classList) {
              if (o.add) {
                if (typeof o.add !== "object") {
                  o.add = [o.add];
                }
                // add OURGLOBAL_ to supplied class names
                applyThis = o.add.map(e => {
                  return `${$.a.k}_${e}`;
                });
                o.el[i].classList.add.apply(o.el[i].classList, applyThis);
              }
              if (o.remove) {
                if (typeof o.remove !== "object") {
                  o.remove = [o.remove];
                }
                applyThis = o.remove.map(e => {
                  return `${$.a.k}_${e}`;
                });
                o.el[i].classList.remove.apply(o.el[i].classList, applyThis);
              }
            }
            if (o.el[i].classList && !o.el[i].classList.length) {
              o.el[i].removeAttribute("class");
            }
          }
        }
      },
      // fulfill internal requests from DOM objects
      cmd: {
        // close the create form
        close: str => {
          if (typeof str === "string") {
            $.w.alert(str);
          }
          $.f.send({
            to: "background",
            act: "closeCreate"
          });
          return;
        },
        // add hashtag to description
        addHashtag: (el, evt) => {
          let addToEndOfDescription,
            cursorIndex,
            hashtag,
            idx,
            splitDescription;
          hashtag = el.dataset.hashtag;
          $.f.log({
            event: evt || "click",
            action: "add_hashtag",
            hashtag: hashtag,
            url: $.v.data.url
          });
          // if a hashtag is added anywhere in the middle of the description
          cursorIndex = $.s.description.selectionStart;
          splitDescription = $.s.description.value.split(" ");
          if (
            (cursorIndex < $.s.description.value.length && cursorIndex > 1) ||
            cursorIndex === 1
          ) {
            idx = splitDescription.indexOf($.v.hashtagSearchWord);
            if (idx !== -1) {
              splitDescription.splice(idx, 1, hashtag);
            }
            $.s.description.value = splitDescription.join(" ");
            if (idx === splitDescription.length - 1) {
              $.s.description.value = `${splitDescription.join(" ")} `;
            } else {
              $.s.description.value = splitDescription.join(" ");
            }
          }
          // if a hashtag was added at the end of the description
          if (cursorIndex === $.s.description.value.length) {
            splitDescription[splitDescription.length - 1] = hashtag;
            $.s.description.value = `${splitDescription.join(" ")} `;
          }

          $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
          if ($.v.hashtagViewed) {
            $.s.preview.style.justifyContent = "flex-start";
          }
          $.s.description.focus();
        },
        // select text within an element
        select: el => {
          // only select full text in default description once
          if (!el.getAttribute("hazSelected")) {
            el.setAttribute("hazSelected", true);
            el.select();
          }
          return;
        },
        // close overlay
        closeOverlayOpenNewPage: o => {
          let url;
          if (o.dataset.url) {
            url = o.dataset.url;
          } else {
            url = o;
          }
          $.f.send({
            to: "background",
            act: "closeCreate",
            url: url
          });
        },
        // open the Help article about saving
        getSaveHelp: () => {
          $.w.open($.a.url.helpSaving);
          $.f.cmd.close();
        },
        // get sections for a board
        fetchSections: el => {
          $.f.send({
            to: "background",
            act: "getSections",
            data: {
              timeCheck: $.v.data.timeCheck,
              board: el.dataset.board
            }
          });
        },
        // show sections for a board
        showSections: el => {
          let board, data, li, i;
          $.v.sectionParentBoard = el.parentNode;
          $.f.changeClass({ el: $.v.sectionParentBoard, add: "canHazSave" });
          data = $.v.board[el.dataset.board];
          // hide all list items in the picker
          $.f.hide($.s.items);
          // hide all list items in the picker
          $.f.hide([$.s.topChoices, $.s.allBoards]);
          // show the parent board
          $.f.show($.v.sectionParentBoard);
          // loop through this board's sections and show them
          $.v.filterable = [$.v.sectionParentBoard];
          // add sections
          for (i = 0; i < data.sections.length; i = i + 1) {
            li = $.d.getElementById("section_" + data.sections[i].id);
            $.v.filterable.push(li);
          }
          $.f.changeClass({
            el: $.v.filterable,
            remove: ["hidden", "filtered"]
          });
          el.dataset.cmd = "save";
          // set the main nav indicator
          $.f.changeClass({ el: $.s.x, add: "back", remove: "close" });
          $.s.x.dataset.cmd = "hideSections";
          $.s.innerAddFormOpener.dataset.via = "section";
          $.s.outerAddFormOpener.dataset.via = "section";
          $.s.innerAddFormOpener.innerText = $.v.msg.addSection;
          $.s.outerAddFormOpener.innerText = $.v.msg.addSection;
          $.s.hd.innerText = $.v.msg.chooseSection;
          $.v.mainFilter = $.s.filter.value;
          $.s.filter.value = "";
          $.s.filter.focus();
          // hide all section arrows
          $.f.hide($.d.getElementsByClassName($.a.k + "_sectionArrow"));
          $.f.itemSelect($.v.sectionParentBoard, true);
          $.v.mode = "chooseSection";
        },
        // hide sections for a board
        hideSections: () => {
          // show all boards
          $.f.show($.s.items);
          // hide all sections
          $.f.hide($.d.getElementsByClassName($.a.k + "_section"));
          // hide all list items in the picker
          $.f.show($.s.allBoards);
          if ($.v.boardNames.length > 3) {
            // show top choices and top three picker
            $.f.show([$.s.topChoices, $.s.pickerTop]);
            $.v.sectionParentBoard.scrollIntoView(true);
          }
          // hide save button
          $.f.changeClass({ el: $.v.sectionParentBoard, remove: "canHazSave" });
          $.f.itemSelect($.v.sectionParentBoard, true);
          // change the current board's command back to show
          $.v.sectionParentBoard.lastChild.dataset.cmd = "showSections";
          $.v.sectionParentBoard = null;
          // set the main nav indicator
          $.f.changeClass({ el: $.s.x, add: "close", remove: "back" });
          $.s.x.dataset.cmd = "close";
          $.s.innerAddFormOpener.dataset.via = "board";
          $.s.outerAddFormOpener.dataset.via = "board";
          $.s.innerAddFormOpener.innerText = $.v.msg.outerAddFormOpener;
          $.s.outerAddFormOpener.innerText = $.v.msg.outerAddFormOpener;
          $.s.hd.innerText = $.v.msg.chooseBoard;
          $.v.filterable = $.s.items;
          $.s.filter.value = $.v.mainFilter;
          $.s.filter.focus();
          // show all section arrows
          $.f.show($.d.getElementsByClassName($.a.k + "_sectionArrow"));
          $.v.mode = "chooseBoard";
        },
        // save a pin: pass the mask as el
        save: el => {
          let q;
          // no pinning without board and don't react to clicks on item list while save is in progress
          if (el.dataset.board && !$.v.hazSelectBlock) {
            // find the button in the element
            $.v.button = el.parentNode.getElementsByClassName(
              `${$.a.k}_button`
            )[0];
            // lock button on
            $.v.button.style.display = "block";
            // spin the button
            $.v.button.className = `${$.v.button.className} ${$.a.k}_active`;
            // disable mouse/keyboard interactions while we're spinning and pinning
            $.v.hazSelectBlock = true;
            // use these later for success messages
            $.v.savedTo = el.dataset.savedTo;
            q = {
              url: $.v.data.url,
              via: $.v.data.via || $.v.data.url,
              method: $.v.data.method,
              description: $.s.description.value.substr(0, 500),
              board: el.dataset.board
            };
            if ($.v.data.meta && typeof $.v.data.meta === "object") {
              q.found_metadata = JSON.stringify($.v.data.meta);
            }
            // if we're pinning to a section, specify it
            if (el.dataset.section) {
              q.section = el.dataset.section;
            }
            // are we repinning?
            if ($.v.data.id) {
              q.id = $.v.data.id;
            } else {
              // are we making an imageless pin?
              if ($.v.data.color) {
                q.color = $.v.data.color;
              } else {
                // are we making a pin from a remote URL?
                if ($.v.data.media) {
                  q.media = $.v.data.media;
                } else {
                  // are we making a pin from a data:URI?
                  if ($.v.canvasData) {
                    q.dataURI = $.v.canvasData;
                  }
                }
              }
            }
            q.timeCheck = $.v.data.timeCheck;
            $.f.send({
              to: "background",
              act: "save",
              data: q
            });
          }
        },
        // close the add form
        closeAddForm: el => {
          // recover opening state
          let v = $.v.back.pop();
          $.f.show($.s.pickerContainer);
          $.f.hide($.s.addForm);
          $.s.hd.innerText = v.hd;
          $.s.x.className = v.className;
          $.s.x.dataset.cmd = v.cmd;
          $.v.mode = v.mode;
          $.s.innerAddFormOpener.innerText = `${$.v.msg.submitAddForm} ${
            v.opener
          }`;
          $.s.filter.value = v.opener;
          if ($.s.filter.value) {
            $.f.show($.s.innerAddFormOpener);
          } else {
            $.f.show($.s.outerAddFormOpener);
          }
          $.v.adding = false;
          $.s.filter.placeholder = $.v.msg.filter;
          $.f.changeClass({ el: $.s.filter, add: ["search"] });
          $.s.filter.focus();
        },
        // open the add form
        openAddForm: el => {
          let i,
            parentBoard,
            via = el.dataset.via;
          // deselect selectedItem or Enter will save there rather than making new section
          $.f.changeClass({ el: $.v.selectedItem, remove: "selected" });
          $.v.selectedItem = "";
          // save existing go-back command
          $.f.hide($.s.innerAddFormOpener);
          $.f.hide($.s.outerAddFormOpener);
          // save so we can go back
          $.v.back.push({
            className: $.s.x.className,
            cmd: $.s.x.dataset.cmd,
            opener: $.s.filter.value,
            hd: $.s.hd.innerText,
            mode: $.v.mode
          });
          $.f.changeClass({ el: $.s.filter, remove: ["search"] });
          if (via === "section") {
            // adding a new section
            $.f.hide($.s.addFormSecretContainer);
            $.s.hd.innerText = $.v.msg.addSection;
            $.s.filter.placeholder = $.v.msg.placeholderFilterAddSection;
            $.v.mode = "newSection";
          } else {
            // adding a new board
            $.f.show($.s.addFormSecretContainer);
            $.s.hd.innerText = $.v.msg.outerAddFormOpener;
            $.s.filter.placeholder = $.v.msg.placeholderFilterAddBoard;
            $.v.mode = "newBoard";
          }
          $.f.changeClass({ el: $.s.x, add: "back", remove: "close" });
          // enable the button if we have something in filter
          if ($.s.filter.value) {
            $.f.changeClass({ el: $.s.submitAddForm, remove: "disabled" });
            $.s.submitAddForm.dataset.disabled = "";
          }
          $.s.x.dataset.cmd = "closeAddForm";
          $.f.hide($.s.pickerContainer);
          $.f.show($.s.addForm);
          // so we can disable the Add button when we need to
          $.v.adding = via;
          $.s.filter.focus();
        },
        // submit the add form
        submitAddForm: el => {
          let o, v, newName;
          newName = $.s.filter.value.trim();
          if (newName && $.s.submitAddForm.dataset.disabled !== "disabled") {
            if ($.v.mode === "newBoard" || $.v.mode === "newSection") {
              // deselect all items
              $.f.changeClass({ el: $.s.items, remove: "selected" });
              o = {
                to: "background",
                act: $.v.mode,
                data: {}
              };
              if ($.v.mode === "newBoard") {
                o.data.name = newName;
                o.data.secret = $.s.addFormSecret.checked;
              }
              if ($.v.mode === "newSection") {
                o.data.title = newName;
                o.data.board = $.v.sectionParentBoard.id.split("_")[1];
              }
              o.data.timeCheck = $.v.data.timeCheck;
              $.f.send(o);
              // close add form after send, not as part of callback
              $.s.filter.value = "";
              $.s.closeAddForm.dataset.clearFilter = true;
              v = $.v.back.pop();
              v.opener = "";
              $.v.back.push(v);
              $.f.runCmd($.s.closeAddForm);
            }
          }
        }
      },
      // unstick the keyboard cursor when the mouse moves
      mousemove: e => {
        $.v.hazKeyboardNav = false;
      },
      mouseover: e => {
        let el, cmd;
        el = $.f.getEl(e);
        if (el.className === $.a.k + "_mask") {
          if (!$.v.hazKeyboardNav) {
            $.f.itemSelect(el.parentNode);
          }
        }
        if (e.target.dataset.hashtag) {
          if ($.v.selectedHashtag) {
            $.v.selectedHashtag.parentNode.classList.remove(
              `${$.a.k}_selectorClass`
            );
            $.v.selectedHashtag = null;
          }
          $.v.selectedHashtag = e.target.parentNode.firstChild;
          $.v.selectedHashtag.parentNode.classList.add(
            `${$.a.k}_selectorClass`
          );
        }
      },
      // programatically run the command set on an element (such as the Back button)
      runCmd: el => {
        let cmd = el.dataset.cmd;
        if (cmd && typeof $.f.cmd[cmd] === "function") {
          // always pass the element that was clicked to its handler
          $.f.cmd[cmd](el);
          return;
        }
      },
      // return the previous and next visible siblings of an element
      getNav: el => {
        let r = {},
          i,
          n,
          allSibs,
          visibleSibs = [];
        // we need all list items including top choices and all boards
        allSibs = $.s.pickerContainer.getElementsByTagName("LI");
        for (i = 0; i < allSibs.length; i = i + 1) {
          if (
            !allSibs[i].classList.contains($.a.k + "_filtered") &&
            !allSibs[i].classList.contains($.a.k + "_hidden")
          ) {
            visibleSibs.push(allSibs[i]);
          }
        }
        for (i = 0, n = visibleSibs.length; i < n; i = i + 1) {
          if (visibleSibs[i] === el) {
            if (i) {
              r.prev = visibleSibs[i - 1];
            }
            if (i < n - 1) {
              r.next = visibleSibs[i + 1];
            }
            break;
          }
        }
        return r;
      },
      keydown: e => {
        let i, k, idx;
        k = e.keyCode || null;
        switch (k) {
          // tab
          case 9:
            switch ($.d.activeElement) {
              case $.s.description:
                $.s.filter.focus();
                break;
              case $.s.filter:
                $.s.description.focus();
                break;
              default:
                break;
            }
            e.preventDefault();
            break;

          // enter
          case 13:
            // are we hashtagging?
            if ($.s.main.classList.contains(`${$.a.k}_hazHashtags`)) {
              $.s.description.blur();
              for (i = 0; i < $.v.hashtagElements.length; i++) {
                if (
                  $.v.hashtagElements[i].parentNode.classList.contains(
                    `${$.a.k}_selectorClass`
                  )
                ) {
                  $.f.cmd.addHashtag(
                    $.v.hashtagElements[i].nextSibling.nextSibling,
                    "keypress"
                  );
                  // prevents adding newline in description when hashtag is added on keypress
                  $.s.description.blur();
                }
              }
              return;
            }
            // are we filtering?
            if ($.d.activeElement === $.s.filter) {
              if ($.v.selectedItem) {
                // save to section or board
                $.f.runCmd($.v.selectedItem.lastChild);
              } else {
                if ($.v.mode === "newBoard" || $.v.mode === "newSection") {
                  $.f.runCmd($.s.submitAddForm);
                } else {
                  // open the add form
                  $.f.runCmd($.s.innerAddFormOpener);
                }
              }
            }
            break;

          // escape
          case 27:
            if ($.s.main.classList.contains(`${$.a.k}_hazHashtags`)) {
              $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
            } else {
              if ($.s.filter.value) {
                // clear filter
                $.s.filter.value = "";
              } else {
                // escape: pretend we tapped $.s.x
                $.f.runCmd($.s.x);
              }
            }
            break;

          // up
          case 38:
            // are we hashtagging?
            if ($.s.main.classList.contains(`${$.a.k}_hazHashtags`)) {
              $.s.description.blur();
              if ($.v.selectedHashtag) {
                idx = $.v.hashtagElements.indexOf($.v.selectedHashtag);
                if (idx === 0) {
                  return;
                } else if (idx > 0) {
                  $.v.selectedHashtag.parentNode.classList.remove(
                    `${$.a.k}_selectorClass`
                  );
                  $.v.selectedHashtag = $.v.hashtagElements[idx - 1];
                  $.v.selectedHashtag.parentNode.classList.add(
                    `${$.a.k}_selectorClass`
                  );
                  return;
                }
              } else {
                $.v.selectedHashtag = $.v.hashtagElements[0];
                $.v.selectedHashtag.parentNode.classList.add(
                  `${$.a.k}_selectorClass`
                );
              }
              return;
            }
            // are we filtering?
            if ($.d.activeElement === $.s.filter) {
              $.v.hazKeyboardNav = true;
              if ($.v.selectedItem) {
                let sibs = $.f.getNav($.v.selectedItem);
                if (sibs.prev) {
                  $.f.itemSelect(sibs.prev, true);
                }
              }
            }
            break;

          // right
          case 39:
            if ($.d.activeElement === $.s.filter) {
              if (
                $.v.selectedItem &&
                ($.v.selectedItem.lastChild.dataset.cmd === "fetchSections" ||
                  $.v.selectedItem.lastChild.dataset.cmd === "showSections")
              ) {
                $.f.runCmd($.v.selectedItem.lastChild);
              } else {
                return;
              }
            }
            break;

          // down
          case 40:
            // are we hashtagging?
            if ($.s.main.classList.contains(`${$.a.k}_hazHashtags`)) {
              $.s.description.blur();
              if ($.v.selectedHashtag) {
                idx = $.v.hashtagElements.indexOf($.v.selectedHashtag);
                if (idx === $.v.hashtagElements.length - 1) {
                  return;
                } else {
                  $.v.selectedHashtag.parentNode.classList.remove(
                    `${$.a.k}_selectorClass`
                  );
                  $.v.hashtagElements[idx + 1].parentNode.classList.add(
                    `${$.a.k}_selectorClass`
                  );
                  $.v.selectedHashtag = $.v.hashtagElements[idx + 1];
                }
              } else {
                $.v.selectedHashtag = $.v.hashtagElements[0];
                $.v.selectedHashtag.parentNode.classList.add(
                  `${$.a.k}_selectorClass`
                );
              }
              return;
            }
            // are we filtering?
            if ($.d.activeElement === $.s.filter) {
              $.v.hazKeyboardNav = true;
              if ($.v.selectedItem) {
                let sibs = $.f.getNav($.v.selectedItem);
                if (sibs.next) {
                  $.f.itemSelect(sibs.next, true);
                }
              }
            }
            break;

          default:
        }
      },
      // watch for click events
      click: e => {
        let el, cmd;
        // only show hashtag container when we're focused on the description
        if ($.d.activeElement.tagName !== "TEXTAREA") {
          $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
        }
        // close the overlay when user clicks outside of it
        if (e.target === document.body) {
          $.f.cmd.close();
        }
        el = $.f.getEl(e);
        cmd = $.f.get({ el: el, att: "cmd" });
        if (cmd && typeof $.f.cmd[cmd] === "function") {
          // always pass the element that was clicked to its handler
          $.f.cmd[cmd](el);
          return;
        }
      },
      // render imageless thumbnail
      renderImagelessThumb: () => {
        $.s.thumb.className = `${$.a.k}_thumb ${$.a.k}_imageless`;
        $.s.thumb.style.backgroundColor = $.v.data.color;
        // kill DOM nodes inside thumb and start over
        $.s.thumb.textContent = "";
        // site name
        $.s.thumb.appendChild(
          $.f.make({
            SPAN: {
              innerText: $.f.clean({ str: $.v.data.siteName }),
              className: `${$.a.k}_site`
            }
          })
        );
        // text pin
        $.s.thumb.appendChild(
          $.f.make({
            SPAN: {
              innerText: $.f
                .clean({ str: $.s.description.value })
                .substr(0, 100),
              className: `${$.a.k}_text`
            }
          })
        );
      },
      // render a pin or board create error
      fail: o => {
        // rig up the Fail message
        $.f.set({
          el: $.s.failButtonHelp,
          att: "cmd",
          string: o.buttonHelpCmd
        });
        $.s.failButtonClose.innerText = o.buttonClose;
        $.s.failButtonHelp.innerText = o.buttonHelp;
        $.s.failMsg.innerText = o.failMsg;
        $.s.failBody.innerText = o.failBody;
        $.s.main.className = $.s.main.className + " " + $.a.k + "_hazFail";
      },
      // request hashtags from background
      requestHashtags: query => {
        $.f.send({
          to: "background",
          act: "getHashtags",
          data: query
        });
      },
      // create a list item for pickers
      makePickerItem: o => {
        // requires: title, boardId
        // optional: sectionId, hazSections
        let li,
          info,
          cover,
          a,
          i,
          id,
          helpers,
          helpersFound,
          className = undefined;
        // have we just made a new section
        if (o["type"] === "board_section") {
          // munge the ID
          o.sectionId = o.id;
          o.boardId = o.board.id;
        } else {
          if (!o.boardId) {
            if (o.board && o.board.id) {
              o.boardId = o.board.id;
            } else {
              o.boardId = o.id;
            }
          }
        }
        if (o.sectionId) {
          id = "section_" + o.sectionId;
          className = $.a.k + "_section";
        } else {
          id = "board_" + o.boardId;
          className = $.a.k + "_board";
        }
        li = $.f.make({
          LI: {
            id: id,
            pid: id,
            className: className
          }
        });
        if (o["type"] === "board") {
          cover = $.f.make({
            SPAN: {
              className: $.a.k + "_cover"
            }
          });
          if (o.image_cover_url) {
            // we have the image cover URL
            cover.style.backgroundImage = "url(" + o.image_cover_url + ")";
          } else {
            if (o.image_thumbnail_url) {
              cover.style.backgroundImage =
                "url(" +
                o.image_thumbnail_url.replace(/^http:\/\//, "https://s-") +
                ")";
            }
          }
          li.appendChild(cover);
        }
        // the board or section title
        info = $.f.make({
          SPAN: {
            className: $.a.k + "_info",
            innerText: o.name || o.title
          }
        });
        li.appendChild(info);
        helpersFound = 0;
        helpers = $.f.make({
          SPAN: {
            className: `${$.a.k}_helpers`
          }
        });
        if (o.privacy === "secret") {
          helpersFound++;
          helpers.appendChild(
            $.f.make({
              SPAN: {
                className: `${$.a.k}_icon ${$.a.k}_secret`
              }
            })
          );
        }
        if (o.is_collaborative === true) {
          helpersFound++;
          helpers.appendChild(
            $.f.make({
              SPAN: {
                className: `${$.a.k}_icon ${$.a.k}_collaborative`
              }
            })
          );
        }
        if (o.section_count) {
          helpersFound++;
          helpers.appendChild(
            $.f.make({
              SPAN: {
                className: `${$.a.k}_icon ${$.a.k}_sectionArrow`
              }
            })
          );
        }
        if (helpersFound) {
          li.appendChild(helpers);
          info.className = `${info.className} ${$.a.k}_helpers_${helpersFound}`;
        }
        // the visible thing that says save
        i = $.f.make({
          I: {
            innerText: $.v.msg.saveAction,
            className: $.a.k + "_button " + $.a.k + "_save"
          }
        });
        if (o.section_count) {
          $.f.changeClass({ el: i, add: "itemHazSections" });
        } else {
          $.f.changeClass({ el: li, add: "canHazSave" });
        }
        li.appendChild(i);
        // the clickable mask
        a = $.f.make({
          A: {
            className: $.a.k + "_mask",
            board: o.boardId
          }
        });
        a.dataset.savedTo = o.name || o.title;
        a.dataset.title = a.dataset.savedTo.toLowerCase();
        if (o.section_count) {
          a.dataset.cmd = "fetchSections";
        } else {
          // this is a section
          if (o.sectionId) {
            a.dataset.section = o.sectionId;
          }
          a.dataset.cmd = "save";
        }
        if (o.test) {
          // force pin to fail because of bad section
          if (o.test.failSection) {
            a.dataset.section = "NO_SUCH_SECTION";
          }
          // force pin to fail because of bad board
          if (o.test.failBoard) {
            a.dataset.section = "NO_SUCH_BOARD";
          }
          // force pin to fail because of no URL
          if (o.test.failPin) {
            delete $.v.data.url;
          }
        }
        li.appendChild(a);
        return li;
      },
      // fulfill requests made by the background process
      act: {
        // background sends back a list of sections and the selected board
        renderSectionsWin: r => {
          let i, li, parent, mask;
          if (r.data && r.data.sections.length) {
            // sort sections by title
            r.data.sections = r.data.sections.sort((a, b) => {
              if (a.title.toLowerCase() > b.title.toLowerCase()) return -1;
              if (a.title.toLowerCase() < b.title.toLowerCase()) return 1;
              return 0;
            });
            // change mask command to showSections
            parent = $.d.getElementById("board_" + r.data.data.board);
            mask = parent.getElementsByTagName("A")[0];
            mask.dataset.cmd = "showSections";
            $.v.board[r.data.data.board].sections = r.data.sections;
            // render our sections
            for (i = 0; i < r.data.sections.length; i = i + 1) {
              li = $.f.makePickerItem({
                name: r.data.sections[i].title,
                sectionId: r.data.sections[i].id,
                boardId: r.data.sections[i].board.id,
                // uncomment to fail section pin
                // test: { failSection: true },
                isSection: true
              });
              $.s.pickerAll.insertBefore(li, parent.nextSibling);
            }
            $.f.runCmd(mask);
            // if the same board is in pickerTop, fix its mask cmd too
            li = $.s.pickerTop.getElementsByTagName("LI");
            for (i = 0; i < li.length; i = i + 1) {
              if (li[i].dataset.pid === "board_" + r.data.data.board) {
                mask = li[i].getElementsByTagName("A")[0];
                mask.dataset.cmd = "showSections";
                break;
              }
            }
          }
        },
        // background sends a note saying it couldn't get sections for the selected board
        renderSectionsFail: o => {
          $.f.fail({
            buttonClose: $.v.msg.msgClose,
            buttonHelp: $.v.msg.msgHelp,
            buttonHelpCmd: "getSaveHelp",
            failMsg: o.data.message || $.v.msg.msgOops,
            failBody: o.data.message_detail || $.v.msg.msgBoardFail
          });
        },
        // backgrounds sends back list of hashtags
        renderHashtags: r => {
          let count, el, hashtagCount, hashtagItem, i, li, mask, targetWord;
          targetWord = $.v.hashtagSearchWord.slice(1);
          if (r.data) {
            $.v.hashtags[targetWord] = [];
            // remove any results that don't have an URL (these are not hashtags)
            for (i = r.data.length - 1; i > -1; i = i - 1) {
              if (!r.data[i].url) {
                r.data.splice(i, 1);
              }
            }
            if (r.data.length < 5) {
              count = r.data.length;
            } else {
              count = 5;
            }
            for (i = 0; i < count; i++) {
              $.v.hashtags[targetWord].push(r.data[i]);
            }
          }
          // clear all previous hashtags
          el = $.d.b.getElementsByClassName(`${$.a.k}_hashtagSelection`)[0];
          el.textContent = "";
          $.s.main.classList.add(`${$.a.k}_hazHashtags`);
          $.s.preview.style.justifyContent = "flex-start";
          // know when hashtag conatiner has already been visible once to prevent image from jumping
          $.v.hashtagViewed = true;
          // check image height and change if necessary
          if (
            +$.s.thumb.style.height.slice(
              0,
              $.s.thumb.style.height.length - 2
            ) > 250
          ) {
            $.s.main.classList.add(`${$.a.k}_changeThumb`);
          }
          if ($.v.hashtags[targetWord].length === 0) {
            $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
          }
          if ($.v.hashtags[targetWord]) {
            $.v.hashtagElements = [];
            $.v.hashtags[targetWord].forEach(hashtag => {
              li = $.f.make({ LI: {} });
              hashtagItem = $.f.make({
                SPAN: {
                  className: `${$.a.k}_hashtagItem`,
                  innerText: `${hashtag.query}`,
                  cmd: "addHashtag"
                }
              });
              hashtagCount = $.f.make({
                SPAN: {
                  className: `${$.a.k}_hashtagCount`,
                  innerText: $.f.clean({ str: `${hashtag.pin_count} pins` })
                }
              });
              mask = $.f.make({
                SPAN: {
                  className: `${$.a.k}_mask`,
                  hashtag: hashtag.query,
                  cmd: "addHashtag"
                }
              });
              $.v.hashtagElements.push(hashtagItem);
              li.appendChild(hashtagItem);
              li.appendChild(hashtagCount);
              li.appendChild(mask);
              el.appendChild(li);
            });
          } else {
            $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
          }
        },
        // show pin create results
        newPinWin: r => {
          let frag, splitMsg;
          // default Close button
          $.s.feedbackButtonClose.innerText = $.v.msg.msgClose;
          $.s.thumb.className = `${$.s.thumb.className} ${$.a.k}_inFeedback`;
          frag = $.d.createDocumentFragment();
          frag.appendChild($.s.thumb.cloneNode(true));
          $.s.feedbackBody.appendChild(frag);

          if ($.v.button) {
            $.v.button.className = `${$.v.button.className} ${$.a.k}_checked`;
          }
          // to open later
          $.v.newPinId = r.data.id;

          // partners see a Promote Your Pin button instead of Close
          if (r.data.promote_button) {
            if (r.data.promote_button.show_promote_button) {
              if (
                r.data.promote_button.promote_button_destination &&
                r.data.promote_button.promote_button_text
              ) {
                $.s.feedbackButtonClose.innerText =
                  r.data.promote_button.promote_button_text;
                $.s.feedbackButtonClose.dataset.cmd = "closeOverlayOpenNewPage";
                $.s.feedbackButtonClose.dataset.url =
                  r.data.promote_button.promote_button_destination;
              }
            }
          }
          // we set $.v.boardName when we make the pin OR make the board
          if (r.data.title) {
            $.s.feedbackMsg.innerText = $.f.clean({
              str: $.v.msg.msgPinSavedTo.replace("%", `${r.data.title}`)
            });
          } else {
            $.s.feedbackMsg.innerText = $.f.clean({
              str: $.v.msg.msgPinSavedTo.replace("%", `${$.v.savedTo}`)
            });
          }

          $.s.feedbackButtonSeeItNow.innerText = $.v.msg.msgSeeItNow;
          $.s.feedbackButtonSeeItNow.dataset.url = `https://pinterest.com/pin/${
            $.v.newPinId
          }/`;

          //close feedback after 5 seconds
          $.w.setTimeout(() => {
            $.f.send({
              to: "background",
              act: "closeCreate"
            });
          }, $.a.delay.afterPinCreate + $.a.delay.afterPinResults);

          // wait a bit so we see our checked button
          $.w.setTimeout(() => {
            $.s.main.className = `${$.s.main.className} ${$.a.k}_hazFeedback`;
          }, $.a.delay.afterPinResults);
        },
        // save to the new section we just made
        newSectionWin: o => {
          $.f.debug("New section results");
          $.f.debug(o);
          let newSection = $.f.makePickerItem(o.data);
          $.v.sectionParentBoard.parentNode.insertBefore(
            newSection,
            $.v.sectionParentBoard.nextElementSibling
          );
          $.f.itemSelect(newSection);
          $.f.cmd.save(newSection.lastChild);
          // freeze selector
          $.v.hazSelectBlock = true;
        },
        // save to the new section we just made
        newBoardWin: o => {
          $.f.debug("New board results");
          $.f.debug(o);
          let newBoard = $.f.makePickerItem(o.data);
          $.f.hide($.s.pickerTop);
          let li = $.s.pickerAll.getElementsByTagName("LI");
          if (!li[0]) {
            $.s.pickerAll.appendChild(newBoard);
          } else {
            $.s.pickerAll.insertBefore(newBoard, li[0]);
          }
          $.f.itemSelect(newBoard);
          $.f.cmd.save(newBoard.lastChild);
          // freeze selector
          $.v.hazSelectBlock = true;
        },
        // show board error
        newBoardFail: o => {
          $.f.fail({
            buttonClose: $.v.msg.msgClose,
            buttonHelp: $.v.msg.msgHelp,
            buttonHelpCmd: "getSaveHelp",
            failMsg: o.data.message || $.v.msg.msgOops,
            failBody: o.data.message_detail || $.v.msg.msgBoardFail
          });
        },
        // show pin error
        newPinFail: o => {
          $.f.fail({
            buttonClose: $.v.msg.msgClose,
            buttonHelp: $.v.msg.msgHelp,
            buttonHelpCmd: "getSaveHelp",
            failMsg: o.data.message || $.v.msg.msgOops,
            failBody: o.data.message_detail || $.v.msg.msgPinFail
          });
          // patch until next background update ships
          let image = $.v.data.media;
          if (!image) {
            image = "unknown";
          }
          $.f.log({
            event: "pin_create_fail_foreground",
            url: $.v.data.url,
            media: image
          });
        },
        // show section error
        newSectionFail: o => {
          $.f.fail({
            buttonClose: $.v.msg.msgClose,
            buttonHelp: $.v.msg.msgHelp,
            buttonHelpCmd: "getSaveHelp",
            failMsg: o.data.message || $.v.msg.msgOops,
            failBody: o.data.message_detail || $.v.msg.msgPinFail
          });
        },
        renderBoards: o => {
          if (typeof o.data.boards === "undefined") {
            // we need to close due to new login without page refresh; next time we open we'll have boards
            $.f.cmd.close();
          } else {
            $.f.hide([
              $.s.topChoices,
              $.s.pickerTop,
              $.s.allBoards,
              $.s.pickerAll
            ]);
            $.f.changeClass({ el: $.s.main, remove: "loading" });
            $.f.show($.s.where);

            // uncomment to test: less than three boards, no boards
            // o.data.boards = [o.data.boards[0]];
            // o.data.boards = null;
            $.s.hd.innerText = $.v.msg.chooseBoard;
            if (o.data.boards && o.data.boards.length) {
              // dump boards to a central source of knowledge
              for (i = 0; i < o.data.boards.length; i = i + 1) {
                $.v.board[o.data.boards[i].id] = o.data.boards[i];
              }
              // sort boards by timestamp
              o.data.boards.sort((a, b) => {
                if (a.ts > b.ts) return -1;
                if (a.ts < b.ts) return 1;
                return 0;
              });
              if (o.data.boards.length > 3) {
                // show top choices (recently pinned) and all boards
                $.f.show([
                  $.s.topChoices,
                  $.s.pickerTop,
                  $.s.allBoards,
                  $.s.pickerAll
                ]);
                // show most recent boards
                for (i = 0; i < 3; i = i + 1) {
                  li = $.f.makePickerItem(o.data.boards[i]);
                  li.id = "";
                  $.s.pickerTop.appendChild(li);
                  if (!i) {
                    $.f.itemSelect(li);
                  }
                  $.s.items.push(li);
                }
                // sort by name
                o.data.boards.sort((a, b) => {
                  if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
                  if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
                  return 0;
                });
                for (i = 0; i < o.data.boards.length; i = i + 1) {
                  $.v.boardNames.push(o.data.boards[i].name.toLowerCase());
                  li = $.f.makePickerItem(o.data.boards[i]);
                  $.s.pickerAll.appendChild(li);
                  $.s.items.push(li);
                }
              } else {
                // since there are less than 4, just show all boards
                $.f.show([$.s.allBoards, $.s.pickerAll]);
                for (i = 0; i < o.data.boards.length; i = i + 1) {
                  $.v.boardNames.push(o.data.boards[i].name.toLowerCase());
                  // uncomment to test board fail message
                  // o.data.boards[i].test = { failBoard: true };
                  li = $.f.makePickerItem(o.data.boards[i]);
                  $.s.pickerAll.appendChild(li);
                  if (!i) {
                    $.f.itemSelect(li);
                  }
                  $.s.items.push(li);
                }
              }
              $.v.filterable = $.s.items;
            } else {
              // we have no boards, so jump straight to the board create form, and don't let them out
              $.s.allBoards.textContent = "";
              $.f.hide($.s.closeAddForm);
              $.f.runCmd($.s.outerAddFormOpener);
            }

            // render pin create
            $.s.description.value =
              $.f.clean({ str: $.v.data.description }) || "";

            $.s.description.placeholder = $.v.msg.placeholderDescription;
            // we are checking to see if description is changing and looking for any hashtags
            $.w.setInterval(() => {
              if ($.v.lastDescription !== $.s.description.value) {
                $.v.lastDescription = $.s.description.value;
                if ($.v.hashtagViewed) {
                  $.s.preview.style.justifyContent = "flex-start";
                  $.s.description.focus();
                }
                $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
                $.s.hashtagContainer.className = `${$.a.k}_hashtagContainer`;
                if ($.s.description.value && $.s.description.selectionStart) {
                  let cursorIdxStart = $.s.description.selectionStart - 1;
                  let cursorIdxEnd = cursorIdxStart + 1;
                  $.v.hashtagSearchWord = "";
                  while (cursorIdxStart >= 0) {
                    if ($.s.description.value[cursorIdxStart] !== " ") {
                      $.v.hashtagSearchWord =
                        $.s.description.value[cursorIdxStart] +
                        $.v.hashtagSearchWord;
                      cursorIdxStart--;
                    } else {
                      break;
                    }
                  }
                  while (cursorIdxEnd < $.s.description.value.length) {
                    if ($.s.description.value[cursorIdxEnd] !== " ") {
                      $.v.hashtagSearchWord =
                        $.v.hashtagSearchWord +
                        $.s.description.value[cursorIdxEnd];
                      cursorIdxEnd++;
                    } else {
                      break;
                    }
                  }
                  targetWord = $.v.hashtagSearchWord.slice(1);
                  // checking to make sure hashtagContainer is not visible if there is a newline
                  if (
                    $.v.hashtagSearchWord[0] === "#" &&
                    $.v.hashtagSearchWord.indexOf("\n") === -1
                  ) {
                    if (!$.v.hashtags[targetWord]) {
                      $.f.requestHashtags(targetWord);
                    } else {
                      $.f.act.renderHashtags(targetWord);
                    }
                  }
                }
                if (!$.v.data.media) {
                  $.f.renderImagelessThumb();
                }
              }
            }, 500);
            if ($.v.data.media) {
              // pinning a data: URI
              preview = new Image();
              preview.onload = () => {
                // scale and center the thumbnail
                h = preview.height;
                w = preview.width;
                // scale thumbnail image to fit in pin create form
                scaledHeight = Math.floor((237 * h) / w);
                if (scaledHeight > $.a.values.scaledHeight) {
                  scaledHeight = $.a.values.scaledHeight;
                }
                $.s.thumb.style.height = `${scaledHeight}px`;
                $.v.imageHeight = `${scaledHeight}px`;
                $.s.thumb.style.backgroundImage = `url('${preview.src}')`;
              };
              preview.src = $.v.data.media;
            }
            // we need to be sure we have boards before we do this
            $.w.setTimeout(() => {
              $.s.filter.focus();
              $.f.filter();
            }, 10);
          }
        },
        // populate the pin create form
        populateCreateForm: o => {
          const renderCreateForm = () => {
            let preview,
              h,
              hashtagSearchWord,
              w,
              word,
              scaledHeight,
              targetWord;
            $.v.data = o.data;
            $.v.boardNames = [];
            $.v.board = {};
            $.s.items = [];
            // hide board area
            $.f.hide($.s.where);
            // show the spinning loader
            $.f.changeClass({ el: $.s.main, add: "loading" });

            // render pin create
            $.s.description.value =
              $.f.clean({ str: $.v.data.description }) || "";

            $.s.description.placeholder = $.v.msg.placeholderDescription;
            // we are checking to see if description is changing and looking for any hashtags
            $.w.setInterval(() => {
              if ($.v.lastDescription !== $.s.description.value) {
                $.v.lastDescription = $.s.description.value;
                if ($.v.hashtagViewed) {
                  $.s.preview.style.justifyContent = "flex-start";
                  $.s.description.focus();
                }
                $.s.main.classList.remove(`${$.a.k}_hazHashtags`);
                $.s.hashtagContainer.className = `${$.a.k}_hashtagContainer`;
                if ($.s.description.value && $.s.description.selectionStart) {
                  let cursorIdxStart = $.s.description.selectionStart - 1;
                  let cursorIdxEnd = cursorIdxStart + 1;
                  $.v.hashtagSearchWord = "";
                  while (cursorIdxStart >= 0) {
                    if ($.s.description.value[cursorIdxStart] !== " ") {
                      $.v.hashtagSearchWord =
                        $.s.description.value[cursorIdxStart] +
                        $.v.hashtagSearchWord;
                      cursorIdxStart--;
                    } else {
                      break;
                    }
                  }
                  while (cursorIdxEnd < $.s.description.value.length) {
                    if ($.s.description.value[cursorIdxEnd] !== " ") {
                      $.v.hashtagSearchWord =
                        $.v.hashtagSearchWord +
                        $.s.description.value[cursorIdxEnd];
                      cursorIdxEnd++;
                    } else {
                      break;
                    }
                  }
                  targetWord = $.v.hashtagSearchWord.slice(1);
                  // checking to make sure hashtagContainer is not visible if there is a newline
                  if (
                    $.v.hashtagSearchWord[0] === "#" &&
                    $.v.hashtagSearchWord.indexOf("\n") === -1
                  ) {
                    if (!$.v.hashtags[targetWord]) {
                      $.f.requestHashtags(targetWord);
                    } else {
                      $.f.act.renderHashtags(targetWord);
                    }
                  }
                }
                if (!$.v.data.media) {
                  $.f.renderImagelessThumb();
                }
              }
            }, 500);
            if ($.v.data.media) {
              // pinning a data: URI
              preview = new Image();
              preview.onload = () => {
                // scale and center the thumbnail
                h = preview.height;
                w = preview.width;
                // scale thumbnail image to fit in pin create form
                scaledHeight = Math.floor((237 * h) / w);
                if (scaledHeight > $.a.values.scaledHeight) {
                  scaledHeight = $.a.values.scaledHeight;
                }
                $.s.thumb.style.height = `${scaledHeight}px`;
                $.v.imageHeight = `${scaledHeight}px`;
                $.s.thumb.style.backgroundImage = `url('${preview.src}')`;
              };
              preview.src = $.v.data.media;
            }
            // we need to be sure we have boards before we do this
            $.w.setTimeout(() => {
              $.s.filter.focus();
              $.f.filter();
            }, 10);
            // }

            $.s.main.style.display = "block";
          };

          // we have data but we might not have structure ready to show yet
          const waitForCreateForm = function() {
            if ($.s.main) {
              renderCreateForm();
            } else {
              $.f.debug(
                "Data arrived before structure was ready, trying again in a bit."
              );
              $.w.setTimeout(waitForCreateForm, 10);
            }
          };

          waitForCreateForm();
        }
      },
      // show an element or elements
      show: el => {
        $.f.changeClass({ el: el, remove: "hidden" });
      },
      // hide an element or elements
      hide: el => {
        $.f.changeClass({ el: el, add: "hidden" });
      },
      // highlight selected item and scroll to it
      itemSelect: (el, shouldScroll) => {
        if (!$.v.hazSelectBlock) {
          $.f.changeClass({ el: $.v.selectedItem, remove: "selected" });
          $.f.changeClass({ el: el, add: "selected" });
          $.v.selectedItem = el;
          if (shouldScroll) {
            $.v.selectedItem.scrollIntoView(false);
          }
        }
      },
      // watch the input box and do the right thing
      filter: () => {
        let fv, re, i, title, select, firstVisibleItem, dupeCheck;
        if (!$.v.hazSelectBlock) {
          // don't run any of this if we are in the process of saving a new board, section, or pin
          $.s.filter.disabled = false;
          fv = $.s.filter.value.trim();
          re = new RegExp(fv, "i");
          dupeCheck = () => {
            let data,
              mustNotMatch = [],
              hazDupe = false;
            if ($.v.sectionParentBoard) {
              // we're adding a section
              data =
                $.v.board[$.v.sectionParentBoard.dataset.pid.split("_")[1]];
              mustNotMatch.push(data.name.toLowerCase());
              for (i = 0; i < data.sections.length; i = i + 1) {
                mustNotMatch.push(data.sections[i].title.toLowerCase());
              }
            } else {
              // we're adding a board
              for (i = 0; i < $.v.boardNames.length; i = i + 1) {
                mustNotMatch.push($.v.boardNames[i]);
              }
            }
            if (mustNotMatch.filter(item => item === fv.toLowerCase()).length) {
              hazDupe = true;
            }
            return hazDupe;
          };
          if (fv !== $.v.lastFilterValue) {
            if (fv) {
              // filter has value
              if ($.v.adding) {
                // if the value we enter here matches the value of any
                // board name or section name, disable the add button
                if (dupeCheck()) {
                  $.f.changeClass({ el: $.s.submitAddForm, add: "disabled" });
                  $.s.submitAddForm.dataset.disabled = "disabled";
                } else {
                  $.f.changeClass({
                    el: $.s.submitAddForm,
                    remove: "disabled"
                  });
                  $.s.submitAddForm.dataset.disabled = "";
                }
              } else {
                $.f.hide([$.s.topChoices, $.s.pickerTop, $.s.allBoards]);
                // show inner form opener
                if (dupeCheck()) {
                  $.f.hide($.s.innerAddFormOpener);
                } else {
                  $.f.show($.s.innerAddFormOpener);
                }
                $.s.innerAddFormOpener.innerText = `${$.v.msg.submitAddForm} ${
                  $.s.filter.value
                }`;
                $.f.hide($.s.outerAddFormOpener);
                // show filtered items
                for (i = 0; i < $.v.filterable.length; i = i + 1) {
                  title = $.v.filterable[i].lastChild.dataset.title;
                  if (title.match(re)) {
                    $.f.changeClass({
                      el: $.v.filterable[i],
                      remove: "filtered"
                    });
                    if (!firstVisibleItem) {
                      firstVisibleItem = $.v.filterable[i];
                    }
                    if (fv === title) {
                      // that's a duplicate; don't show form opener
                      $.f.hide($.s.innerAddFormOpener);
                    }
                  } else {
                    $.f.changeClass({ el: $.v.filterable[i], add: "filtered" });
                  }
                }
                if (firstVisibleItem) {
                  $.f.itemSelect(firstVisibleItem, true);
                } else {
                  $.v.selectedItem = null;
                }
              }
            } else {
              // no filter value; disable the button in the add form
              $.f.changeClass({ el: $.s.submitAddForm, add: "disabled" });
              $.s.submitAddForm.dataset.disabled = "disabled";
              $.f.hide($.s.innerAddFormOpener);
              $.f.show([$.s.outerAddFormOpener]);
              if (!$.v.sectionParentBoard) {
                // exiting board search
                $.f.show($.s.allBoards);
                if ($.v.boardNames.length > 3) {
                  $.f.show([$.s.topChoices, $.s.pickerTop]);
                }
              } else {
                // exiting section search
                $.f.show($.v.sectionParentBoard);
              }
              $.f.changeClass({ el: $.v.filterable, remove: "filtered" });
            }
            $.v.lastFilterValue = fv;
          }
        } else {
          $.s.filter.disabled = true;
        }
        $.w.setTimeout($.f.filter, 100);
      },
      // start here
      init: () => {
        $.d.b = $.d.getElementsByTagName("BODY")[0];
        // don't do anything if you can't find document.body
        if ($.d.b) {
          // don't allow right-click menus unless we are in debug mode
          if (!$.v.debug) {
            $.d.addEventListener("contextmenu", event =>
              event.preventDefault()
            );
          }
          // we'll add CSS to document.head
          $.d.h = $.d.getElementsByTagName("HEAD")[0];
          // build stylesheets
          $.f.presentation({ obj: $.a.styles });
          // listen for clicks, keystrokes, and mouseover
          $.d.b.addEventListener("click", $.f.click);
          $.d.addEventListener("keydown", $.f.keydown);
          $.d.addEventListener("mouseover", $.f.mouseover);
          $.d.addEventListener("mousemove", $.f.mousemove);
          $.w.setTimeout(() => {
            // build structure
            $.f.buildOne({ obj: $.a.structure, el: $.d.b });
          }, 10);
        }
      }
    }
  });
  $.w.addEventListener("load", () => {
    // if an incoming message from script is for us and triggers a valid function, run it
    $.b.runtime.onMessage.addListener(r => {
      if (r.to && r.to === $.a.me) {
        if (r.act && typeof $.f.act[r.act] === "function") {
          $.f.act[r.act](r);
        }
      }
    });
    // load messages and debug flag, then init
    $.b.storage.local.get(["debug", "msg"], ({ debug, msg }) => {
      $.v.debug = debug;
      $.v.msg = msg.create;
      $.f.init();
    });
  });
})(window, document, {
  k: "CREATE",
  me: "create",
  delay: {
    afterPinResults: 1000,
    afterPinCreate: 5000
  },
  url: {
    helpSaving:
      "https://help.pinterest.com/articles/trouble-pinterest-browser-button"
  },
  values: {
    scaledHeight: 350
  },
  dataAttributePrefix: "data-",
  // our structure
  structure: {
    main: {
      preview: {
        thumb: {
          imagelessSite: {},
          imagelessText: {}
        },
        description: {
          tag: "textarea",
          cmd: "select"
        },
        hashtagContainer: {
          hashtagSelection: {
            addClass: "hashtagSelection",
            tag: "ul",
            cmd: "addHashtag"
          }
        }
      },
      where: {
        x: {
          cmd: "close"
        },
        hd: {},
        filter: {
          tag: "input",
          addClass: "search"
        },
        pickerContainer: {
          topChoices: {
            addClass: "divider"
          },
          pickerTop: {
            tag: "ul"
          },
          allBoards: {
            addClass: "divider"
          },
          pickerAll: {
            tag: "ul"
          },
          innerAddFormOpener: {
            addClass: "addFormOpener hidden",
            cmd: "openAddForm",
            via: "board"
          }
        },
        outerAddFormOpener: {
          addClass: "addFormOpener",
          cmd: "openAddForm",
          via: "board"
        },
        addForm: {
          addClass: "hidden",
          addFormSecretContainer: {
            addFormSecretLabel: {
              tag: "label",
              addFormSecret: {
                tag: "input",
                type: "checkbox"
              },
              toggle: {
                knob: {},
                optNo: {},
                optYes: {}
              }
            }
          },
          addFormFt: {
            closeAddForm: {
              addClass: "button cancel",
              cmd: "closeAddForm"
            },
            submitAddForm: {
              addClass: "button create",
              cmd: "submitAddForm"
            }
          }
        }
      },
      fail: {
        failHeader: {
          failMsg: {},
          x: {
            cmd: "close"
          }
        },
        failBody: {},
        failFooter: {
          failButtonHelp: {
            addClass: "button cancel",
            cmd: "getSaveHelp"
          },
          failButtonClose: {
            addClass: "button create",
            cmd: "close"
          }
        }
      },
      feedback: {
        feedbackHeader: {
          feedbackMsg: {
            // API message (hopefully "pin created successfully")
          },
          feedbackClose: {
            addClass: "x",
            cmd: "close"
          }
        },
        feedbackBody: {},
        feedbackFooter: {
          // buttons (see it now, close)
          feedbackButtonClose: {
            addClass: "button cancel",
            cmd: "close"
          },
          feedbackButtonSeeItNow: {
            addClass: "button create active",
            cmd: "closeOverlayOpenNewPage"
          }
        }
      }
    }
  },
  // a SASS-like object to be turned into stylesheets
  styles: {
    body: {
      height: "100%",
      width: "100%",
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(0, 0, 0, .7)",
      color: "#555",
      "font-family":
        '"Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", arial, sans-serif',
      "%prefix%font-smoothing": "antialiased",
      "-moz-osx-font-smoothing": "grayscale"
    },
    "*": {
      "%prefix%box-sizing": "border-box"
    },
    "._main": {
      position: "absolute",
      top: "50%",
      left: "50%",
      "margin-left": "-330px",
      "margin-top": "-270px",
      width: "660px",
      height: "540px",
      "border-radius": "6px",
      background: "#fff",
      overflow: "hidden",
      display: "none",
      "&._loading": {
        background:
          // why yes, this is an animated SVG image
          "#fff url('data:image/svg+xml;base64,PHN2ZwogICAgICAgIHZlcnNpb249IjEuMSIKICAgICAgICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgICAgICAgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiCiAgICAgICAgaGVpZ2h0PSI0MCIKICAgICAgICB3aWR0aD0iNDAiCiAgICAgICAgdmlld0JveD0iMCAwIDI0IDI0IgogICAgICA+CiAgICAgICAgPGc+CiAgICAgICAgICA8cGF0aAogICAgICAgICAgICBmaWxsPSIjYWFhIgogICAgICAgICAgICBkPSJNMTUgMTAuNWMtLjgzIDAtMS41LS42Ny0xLjUtMS41cy42Ny0xLjUgMS41LTEuNSAxLjUuNjcgMS41IDEuNS0uNjcgMS41LTEuNSAxLjVtMCA2Yy0uODMgMC0xLjUtLjY3LTEuNS0xLjVzLjY3LTEuNSAxLjUtMS41IDEuNS42NyAxLjUgMS41LS42NyAxLjUtMS41IDEuNW0tNi02Yy0uODMgMC0xLjUtLjY3LTEuNS0xLjVTOC4xNyA3LjUgOSA3LjVzMS41LjY3IDEuNSAxLjUtLjY3IDEuNS0xLjUgMS41bTAgNmMtLjgzIDAtMS41LS42Ny0xLjUtMS41cy42Ny0xLjUgMS41LTEuNSAxLjUuNjcgMS41IDEuNS0uNjcgMS41LTEuNSAxLjVNMTIgMEM1LjM3IDAgMCA1LjM3IDAgMTJzNS4zNyAxMiAxMiAxMiAxMi01LjM3IDEyLTEyUzE4LjYzIDAgMTIgMCIKICAgICAgICAgID48L3BhdGg+CiAgICAgICAgICA8YW5pbWF0ZVRyYW5zZm9ybQogICAgICAgICAgICBhdHRyaWJ1dGVUeXBlPSJ4bWwiCiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIKICAgICAgICAgICAgdHlwZT0icm90YXRlIgogICAgICAgICAgICBmcm9tPSIwIDEyIDEyIgogICAgICAgICAgICB0bz0iMzYwIDEyIDEyIgogICAgICAgICAgICBkdXI9IjEuMnMiCiAgICAgICAgICAgIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIgogICAgICAgICAgLz4KICAgICAgICA8L2c+CiAgICAgIDwvc3ZnPgoK') 75% 50% no-repeat"
      },
      "._preview": {
        height: "540px",
        "border-right": "1px solid #eaeaea",
        width: "330px",
        background: "#fff",
        "line-height": "0",
        display: "flex",
        "flex-direction": "column",
        "justify-content": "center",
        "align-items": "center",
        "._description": {
          "font-family":
            '"Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", arial, sans-serif',
          "border-radius": "5px",
          padding: "10px",
          height: "100px",
          width: "237px",
          overflow: "auto",
          border: "none",
          outline: "none",
          resize: "none",
          "font-size": "13px",
          color: "#333",
          cursor: "pointer",
          "margin-top": "55px",
          background:
            "#fff url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/Pjxzdmcgd2lkdGg9IjE0cHgiIGhlaWdodD0iMTRweCIgdmlld0JveD0iMCAwIDI4IDI4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxnIGZpbGw9IiNBQUEiPjxwYXRoIGQ9Ik0xOCw2TDIzLDExTDksMjVMMSwyOEw0LDIwWiIvPjxwYXRoIGQ9Ik0yMCw0TDI1LDlMMjcsN0ExLDEgMCAwIDAgMjIsMloiLz48L2c+PC9zdmc+) 217px 90% no-repeat",
          "&:focus": {
            "background-image": "none",
            cursor: "text"
          },
          "&:hover": {
            "background-color": "#e7e7e7"
          }
        }
      },
      "&._hazHashtags": {
        "._hashtagContainer": {
          display: "block"
        }
      },
      "&._changeThumb": {
        "._preview": {
          "._thumb": {
            height: "220px!important",
            transition: ".5s height"
          }
        }
      },
      "._hashtagContainer": {
        display: "none",
        "margin-top": "10px",
        position: "relative",
        width: "237px",
        background: "white",
        border: "1px solid #eee",
        "border-radius": "5px",
        "font-family":
          '"Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", arial, sans-serif',
        "._hashtagSelection": {
          padding: "0",
          margin: "0",
          li: {
            display: "flex",
            "justify-content": "space-between",
            "list-style": "none",
            "padding-left": "3px",
            "padding-right": "3px",
            position: "relative",
            "line-height": "25px",
            "&._selectorClass": {
              background: "#eee"
            },
            "._hashtagItem": {
              height: "100%",
              color: "#004B91",
              "font-size": "14px",
              width: "146px",
              overflow: "hidden",
              "text-overflow": "ellipsis",
              "white-space": "pre"
            },
            "._hashtagCount": {
              height: "100%",
              color: "#555",
              "font-size": "12px"
            },
            // click collector over entire line item
            "._mask": {
              position: "absolute",
              top: "0",
              left: "0",
              bottom: "0",
              right: "0",
              height: "100%",
              width: "100%",
              cursor: "pointer"
            }
          }
        }
      },
      "._hashtagContainer::before": {
        content: '""',
        height: "0px",
        width: "0px",
        position: "absolute",
        top: "-21px",
        left: "50%",
        "margin-left": "-10px",
        border: "10px solid #eee",
        "border-color": "transparent transparent #eee transparent"
      },
      "._hashtagContainer::after": {
        content: '""',
        height: "0px",
        width: "0px",
        position: "absolute",
        top: "-20px",
        left: "50%",
        "margin-left": "-10px",
        border: "10px solid white",
        "border-color": "transparent transparent white transparent"
      },
      "._feedback": {
        display: "none",
        "._feedbackMsg": {
          display: "block",
          "font-weight": "bold",
          "font-size": "20px",
          height: "65px",
          padding: "20px 20px 20px 20px",
          margin: "0",
          "border-bottom": "1px solid #e7e7e7"
        },
        "._feedbackBody": {
          height: "400px",
          background: "#fff",
          display: "flex",
          "flex-direction": "column",
          "justify-content": "center",
          "align-items": "center",
          "._thumb": {
            top: "0"
          }
        },
        "._feedbackFooter": {
          display: "block",
          height: "75px",
          "border-top": "1px solid #e7e7e7",
          position: "absolute",
          width: "100%",
          bottom: "0",
          overflow: "hidden",
          "background-color": "white",
          "&_button": {
            cursor: "pointer"
          }
        }
      },
      "._thumb": {
        top: "50px",
        transition: "0s height",
        "border-radius": "5px",
        display: "block",
        width: "237px",
        height: "237px",
        background: "#555 url() 50% 50% no-repeat",
        "background-size": "cover",
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        "&._imageless": {
          "._site, ._text": {
            position: "absolute",
            color: "#fff",
            "font-size": "22px",
            left: "20px"
          },
          "._site": {
            top: "20px",
            left: "20px",
            "font-size": "12px"
          },
          "._text": {
            width: "200px",
            "word-wrap": "break-word",
            top: "38px",
            "line-height": "28px",
            "padding-right": "22px",
            "font-weight": "bold",
            "letter-spacing": "-1px"
          }
        },
        "&._inFeedback": {
          "margin-top": "10px",
          "border-radius": "5px"
        }
      },
      "._fail": {
        display: "none",
        "._failHeader": {
          display: "block",
          "font-weight": "bold",
          "font-size": "20px",
          height: "65px",
          padding: "20px 20px 20px 20px",
          margin: "0",
          "border-bottom": "1px solid #e7e7e7"
        },
        "._failBody": {
          "font-size": "14px",
          "line-height": "20px",
          height: "95px",
          padding: "20px",
          display: "block"
        },
        "._failFooter": {
          display: "block",
          height: "55px",
          "border-top": "1px solid #e7e7e7",
          position: "absolute",
          width: "100%",
          bottom: "0",
          overflow: "hidden",
          "&_button": {
            display: "block",
            cursor: "pointer"
          }
        }
      },
      // show feedback
      "&._hazFeedback": {
        top: "50%",
        left: "50%",
        "margin-left": "-330px",
        "margin-top": "-270px",
        width: "660px",
        height: "540px",
        "border-radius": "6px",
        background: "#fff",
        overflow: "hidden",
        "._preview, ._where": {
          display: "none"
        },
        "._feedback": {
          display: "block"
        }
      },
      // show error message
      "&._hazFail": {
        top: "50%",
        left: "50%",
        "margin-left": "-220px",
        "margin-top": "-90px",
        width: "380px",
        height: "210px",
        "border-radius": "6px",
        background: "#fff",
        overflow: "hidden",
        "._button._create": {
          top: "10px",
          right: "20px"
        },
        "._button._cancel": {
          top: "10px",
          left: "20px"
        },
        "._preview, ._where, ._feedback": {
          display: "none"
        },
        "._fail": {
          display: "block"
        }
      },
      "._x": {
        position: "absolute",
        top: "25px",
        right: "25px",
        cursor: "pointer",
        height: "16px",
        width: "16px",
        opacity: ".5",
        // background defaults to X for 'cancel'
        background:
          "transparent url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0iIzg4OCIgZD0iTTggNS41MDZMMy4wMTUuNTJBMS43NjUgMS43NjUgMCAxIDAgLjUyMSAzLjAxNUw1LjUwNiA4IC41MiAxMi45ODVBMS43NjUgMS43NjUgMCAwIDAgMS43NjYgMTZhMS43NiAxLjc2IDAgMCAwIDEuMjQ4LS41Mkw4IDEwLjQ5M2w0Ljk4NSA0Ljk4NWExLjc2NyAxLjc2NyAwIDAgMCAyLjQ5OC4wMDQgMS43NjIgMS43NjIgMCAwIDAtLjAwNC0yLjQ5OEwxMC40OTQgOGw0Ljk4NS00Ljk4NWExLjc2NyAxLjc2NyAwIDAgMCAuMDA0LTIuNDk4IDEuNzYyIDEuNzYyIDAgMCAwLTIuNDk4LjAwNEw4IDUuNTA2eiI+PC9wYXRoPjwvc3ZnPgo=) 0 0 no-repeat",
        // change background to < for 'back'
        "&._back": {
          "background-image":
            "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0iIzg4OCIgZD0iTTIuNSA4LjAwMWw3Ljg0IDcuNDgxYTEuOTE0IDEuOTE0IDAgMCAwIDIuNjE4LjAwMyAxLjcwNSAxLjcwNSAwIDAgMC0uMDA0LTIuNDk3TDcuNzMgOC4wMDFsNS4yMjUtNC45ODZjLjcyNC0uNjkuNzI2LTEuODA5LjAwNC0yLjQ5N2ExLjkxIDEuOTEgMCAwIDAtMi42MTkuMDAzTDIuNSA4LjAwMXoiPjwvcGF0aD48L3N2Zz4K)"
        },
        "&:hover": {
          opacity: "1"
        }
      },
      "._where": {
        position: "absolute",
        top: "0",
        right: "0",
        width: "330px",
        height: "540px",
        color: "#444",
        "text-align": "left",
        "%prefix%scrollbar": "none",
        "._hd": {
          display: "block",
          "font-weight": "bold",
          "font-size": "20px",
          height: "65px",
          padding: "20px 20px 20px 20px",
          margin: "0"
        },
        "._filter": {
          "font-family":
            '"Helvetica Neue", Helvetica, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", メイリオ, Meiryo, "ＭＳ Ｐゴシック", arial, sans-serif',
          width: "284px",
          "border-radius": "4px",
          padding: "13px",
          "background-color": "#f6f6f6",
          "-webkit-appearance": "none",
          border: "1px solid #eaeaea",
          margin: "0 0 15px 20px",
          "font-size": "14px",
          "font-weight": "bold",
          outline: "none",
          "&._search": {
            "text-indent": "30px",
            background:
              "#f6f6f6 url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0iIzg4OCIgZD0iTTYuMTYyIDEwLjAzNWEzLjg3NyAzLjg3NyAwIDAgMS0zLjg3My0zLjg3M0EzLjg3NyAzLjg3NyAwIDAgMSA2LjE2MiAyLjI5YTMuODc3IDMuODc3IDAgMCAxIDMuODczIDMuODcyIDMuODc3IDMuODc3IDAgMCAxLTMuODczIDMuODczbTkuMzYzIDMuMTk2bC0zLjA4MS0zLjA4YTEuNjE0IDEuNjE0IDAgMCAwLTEuMjMtLjQ2OCA2LjEyNyA2LjEyNyAwIDAgMCAxLjExLTMuNTIxIDYuMTYyIDYuMTYyIDAgMSAwLTYuMTYyIDYuMTYyIDYuMTMgNi4xMyAwIDAgMCAzLjUyMS0xLjEwOWMtLjAyMi40NDIuMTMuODkxLjQ2NyAxLjIyOWwzLjA4MSAzLjA4MWMuMzE3LjMxNy43MzIuNDc1IDEuMTQ3LjQ3NWExLjYyMiAxLjYyMiAwIDAgMCAxLjE0Ny0yLjc2OSIgZmlsbC1ydWxlPSJldmVub2RkIj48L3BhdGg+PC9zdmc+) 12px 50% no-repeat"
          }
        },
        "._pickerContainer": {
          "border-top": "1px solid #eee",
          height: "340px",
          width: "330px",
          position: "absolute",
          top: "125px",
          left: "0",
          overflow: "auto",
          margin: "0",
          padding: "0",
          "._divider": {
            display: "block",
            color: "#555",
            height: "30px",
            padding: "8px 0 8px 20px",
            "font-size": "14px"
          },
          ul: {
            margin: "0",
            padding: "0",
            li: {
              outline: "none",
              "text-align": "left",
              "list-style": "none",
              margin: "0",
              height: "52px",
              padding: "8px 0 8px 20px",
              color: "#aaa",
              "background-color": "transparent",
              position: "relative",
              "&._board": {
                "._cover": {
                  background: "#555 url() 50% 50% no-repeat",
                  "background-size": "cover",
                  display: "inline-block",
                  height: "36px",
                  width: "36px",
                  "border-radius": "3px",
                  "box-shadow": "0 0 1px #eee inset",
                  "vertical-align": "top",
                  "margin-right": "10px"
                }
              },
              "&._selected": {
                "background-color": "#eee",
                "._button": {
                  display: "block",
                  "&._itemHazSections": {
                    display: "none"
                  },
                  "._info": {
                    width: "165px"
                  }
                },
                "&._canHazSave": {
                  "._button": {
                    display: "block"
                  },
                  "._info": {
                    width: "165px"
                  }
                }
              },
              "&._canHazSave": {
                "._helpers": {
                  "._icon": {
                    "&._sectionArrow": {
                      display: "none"
                    }
                  }
                }
              },
              // contains text
              "._info": {
                display: "inline-block",
                height: "36px",
                "line-height": "36px",
                "font-size": "16px",
                "font-weight": "bold",
                width: "230px",
                color: "#555",
                overflow: "hidden",
                "white-space": "pre",
                "text-overflow": "ellipsis",
                "&._helpers_1": {
                  width: "220px"
                },
                "&._helpers_2": {
                  width: "200px"
                },
                "&._helpers_3": {
                  width: "180px"
                }
              },
              // helpful icons: lock, collaborators, section
              "._helpers": {
                position: "absolute",
                height: "36px",
                "line-height": "36px",
                right: "20px",
                "._icon": {
                  display: "inline-block",
                  height: "inherit",
                  background: "transparent url() 50% 50% no-repeat",
                  "background-size": "contain",
                  "margin-left": "8px",
                  "&._secret": {
                    width: "14px",
                    "background-image":
                      "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE0IiB3aWR0aD0iMTQiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0iIzg4OCIgZD0iTTEyLjggNi43OTFoLS4wNFY0LjU2NkMxMi43NiAyLjA0OCAxMC42MjUgMCA4IDBTMy4yNCAyLjA0OCAzLjI0IDQuNTY2djIuMjI1SDMuMmMtLjc3Ny45ODQtMS4yIDIuMi0xLjIgMy40NTRDMiAxMy40MjMgNC42ODYgMTYgOCAxNnM2LTIuNTc3IDYtNS43NTVjMC0xLjI1My0uNDIzLTIuNDctMS4yLTMuNDU0em0tMi4zNiAwSDUuNTZWNC41NjZjMC0xLjI5IDEuMDk1LTIuMzQgMi40NC0yLjM0czIuNDQgMS4wNSAyLjQ0IDIuMzR2Mi4yMjV6Ij48L3BhdGg+PC9zdmc+)"
                  },
                  "&._collaborative": {
                    width: "14px",
                    "background-image":
                      "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE0IiB3aWR0aD0iMTQiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0iIzg4OCIgZD0iTTkuMTQzIDEwLjJBNCA0IDAgMCAxIDE2IDEzdjFIMHYtMWE1IDUgMCAwIDEgOS4xNDMtMi44ek0xMiA4YTIgMiAwIDEgMCAuMDktMy45OTlBMiAyIDAgMCAwIDEyIDh6TTUgN2EyLjUgMi41IDAgMSAwIDAtNSAyLjUgMi41IDAgMCAwIDAgNXoiPjwvcGF0aD48L3N2Zz4=)"
                  },
                  "&._sectionArrow": {
                    width: "14px",
                    "background-image":
                      "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgdmVyc2lvbj0iMS4xIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0iIzg4OCIgZD0iTTEzLjUgOGwtNy44NCA3LjQ4MWExLjkxNCAxLjkxNCAwIDAgMS0yLjYxOC4wMDMgMS43MDUgMS43MDUgMCAwIDEgLjAwNC0yLjQ5N0w4LjI3IDggMy4wNDYgMy4wMTVBMS43MDkgMS43MDkgMCAwIDEgMy4wNDIuNTE4IDEuOTEgMS45MSAwIDAgMSA1LjY2LjUyTDEzLjUgOHoiLz48L3N2Zz4=)"
                  }
                }
              },
              // click collector over entire line item
              "._mask": {
                position: "absolute",
                top: "0",
                left: "0",
                bottom: "0",
                right: "0",
                height: "100%",
                width: "100%",
                cursor: "pointer"
              }
            }
          }
        },
        // there are two add form openers, one inside the picker container and one outside, so this needs to live outside ._pickerContainer
        "._addFormOpener": {
          "font-size": "16px",
          "font-weight": "normal",
          "text-indent": "65px",
          display: "block",
          cursor: "pointer",
          color: "#555",
          left: "0",
          width: "330px",
          height: "60px",
          "line-height": "60px",
          background:
            "#fff url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/Pjxzdmcgd2lkdGg9IjM2cHgiIGhlaWdodD0iMzZweCIgdmlld0JveD0iMCAwIDcyIDcyIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxnPjxjaXJjbGUgY3g9IjM2IiBjeT0iMzYiIHI9IjM2IiBmaWxsPSIjZTYwMDIzIi8+PHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTTMyLDMyTDMyLDIwQTEsMSwwIDAgMSA0MCwyMEw0MCwzMkw1MywzMkExLDEsMCAwIDEgNTIsNDBMNDAsNDBMNDAsNTJBMSwxLDAgMCAxIDMyLDUyTDMyLDQwTDIwLDQwQTEsMSwwIDAgMSAyMCwzMloiLz48L2c+PC9zdmc+Cg==) 20px 50% no-repeat",
          "&._outerAddFormOpener": {
            position: "absolute",
            bottom: "0",
            height: "75px",
            "line-height": "75px",
            "border-top": "1px solid #eee"
          }
        },
        "._addForm": {
          height: "415px",
          width: "330px",
          position: "absolute",
          top: "125px",
          left: "0",
          "z-index": "10",
          background: "#fff",
          "._addFormSecretLabel": {
            display: "block",
            color: "#c2c2c2",
            "font-size": "11px",
            padding: "10px 0 10px 20px",
            "font-weight": "normal",
            "text-transform": "uppercase",
            "border-top": "1px solid #eee",
            width: "100%",
            cursor: "pointer",
            "input[type=checkbox]": {
              display: "block",
              height: "1px",
              margin: "7px 0 0 0",
              padding: "0",
              opacity: ".01",
              "&:checked": {
                "~ ._toggle": {
                  background: "#e60023",
                  "._knob": {
                    float: "right"
                  },
                  "._optYes": {
                    display: "block"
                  },
                  "._optNo": {
                    display: "none"
                  }
                }
              }
            },
            // yes/no toggle with sliding knob
            "._toggle": {
              display: "inline-block",
              position: "relative",
              background: "#f8f8f8",
              "border-radius": "16px",
              border: "1px solid #eee",
              height: "32px",
              "._knob": {
                display: "inline-block",
                margin: "0",
                padding: "0",
                background: "#fff",
                "border-radius": "16px",
                "box-shadow": "0 0 1px #eee",
                width: "30px",
                height: "30px"
              },
              "._optNo, ._optYes": {
                display: "inline-block",
                "line-height": "30px",
                padding: "0 10px",
                "font-weight": "bold"
              },
              "._optNo": {
                color: "#000",
                float: "right"
              },
              "._optYes": {
                color: "#fff",
                float: "left",
                display: "none"
              }
            }
          },
          "._addFormFt": {
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "330px",
            height: "75px",
            "line-height": "75px"
          }
        }
      },
      "._button": {
        height: "36px",
        "line-height": "36px",
        "border-radius": "3px",
        display: "inline-block",
        "font-size": "16px",
        "font-weight": "bold",
        "text-align": "center",
        padding: "0 10px",
        cursor: "pointer",
        "font-style": "normal",
        "&._save": {
          "vertical-align": "top",
          color: "#fff",
          background:
            "#e60023 url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIxMHB4IiBoZWlnaHQ9IjIwcHgiIHZpZXdCb3g9IjAgMCAxMCAyMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48Zz48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMSwwTDksMEEzLDMsMCAwIDEgNy41LDJMNy41LDdBNCw1LDAgMCAxIDEwLDExTDYsMTFMNiwxNUE2LDksMCAwIDEgNSwyMEE2LDksMCAwIDEgNCwxNUw0LDExTDAsMTFBNCw1LDAgMCAxIDIuNSw3TDIuNSwyQTMsMywwIDAgMSAxLDBaIj48L3BhdGg+PC9nPjwvc3ZnPg==) 10px 9px no-repeat",
          padding: "0 10px 0 28px",
          "margin-left": "20px",
          position: "absolute",
          right: "20px",
          top: "7px",
          display: "none",
          "&._active": {
            color: "transparent",
            background:
              "#e60023 url(data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIAoJeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiAKCXhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiAKCWhlaWdodD0iMzIiCgl3aWR0aD0iMzIiCgl2aWV3Qm94PSIwIDAgMTYgMTYiIAoJeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+Cgk8cGF0aCBmaWxsPSIjZmZmIiBkPSIKICAJTSA4LCAwCiAgICBBIC41LCAuNSwgMCwgMCwgMCwgOCwgMQogICAgQSA2LCA3LCAwLCAwLCAxLCAxNCwgOAogICAgQSA2LCA2LCAwLCAwLCAxLCA4LCAxNAogICAgQSA1LCA2LCAwLCAwLCAxLCAzLCA4CiAgICBBIDEsIDEsIDAsIDAsIDAsIDAsIDgKICAgIEEgOCwgOCwgMCwgMCwgMCwgOCwgMTYKICAgIEEgOCwgOCwgMCwgMCwgMCwgMTYsIDgKICAgIEEgOCwgOCwgMCwgMCwgMCwgOCwgMAogICAgWiIgPgogICAgPGFuaW1hdGVUcmFuc2Zvcm0KCQkJYXR0cmlidXRlVHlwZT0ieG1sIgoJCQlhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iCgkJCXR5cGU9InJvdGF0ZSIKCQkJZnJvbT0iMCA4IDgiCgkJCXRvPSIzNjAgOCA4IgoJCQlkdXI9IjAuNnMiCgkJCXJlcGVhdENvdW50PSJpbmRlZmluaXRlIgoJCS8+Cgk8L3BhdGg+Cjwvc3ZnPgo=) 50% 50% no-repeat",
            "background-size": "20px 20px"
          },
          "&._checked": {
            color: "transparent",
            background:
              "#e60023 url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIxN3B4IiBoZWlnaHQ9IjEzcHgiIHZpZXdCb3g9IjAgMCAxNyAxMyIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48Zz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMyw0TDcsOEwxNCwxQTEsMSAwIDAgMSAxNiwzTDcsMTJMMSw2QTEsMSAwIDAgMSAzLDRaIi8+PC9nPjwvc3ZnPg==) 50% 50% no-repeat"
          }
        },
        "&._create": {
          position: "absolute",
          top: "20px",
          right: "20px",
          color: "#fff",
          "background-color": "#e60023",
          "&._disabled": {
            color: "#eee",
            "background-color": "#aaa",
            cursor: "default"
          }
        },
        "&._cancel": {
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "#555",
          "background-color": "#f6f6f6",
          border: "1px solid #eaeaea"
        }
      },
      "._filtered, ._hidden": {
        display: "none!important"
      }
    }
  }
});
