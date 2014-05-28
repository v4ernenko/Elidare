/**
* @overview A part of Elidare library for legacy browsers support.
* @license MIT
* @version 0.0.1
* @author Vadim Chernenko
* @see {@link https://github.com/v4ernenko/Elidare|Elidare source code repository}
*/

(function (win, doc, util) {
    var toString = {}.toString;

    if (!(''.trim)) {
        util.trim = function (value) {
            return this.isString(value) ? value.replace(/^\s+|\s+$/g, '') : value;
        };
    }

    if (!util.isArray) {
        util.isArray = function (value) {
            return toString.call(value) === '[object Array]';
        };
    }

    if (!doc.addEventListener && win.attachEvent) {
        (function () {
            var storage = [],

                hasListener = function (element, type, listener) {
                    for (var i = 0, item; item = storage[i]; i++) {
                        if (
                            item.type === type &&
                            item.element === element &&
                            item.listener === listener
                        ) {
                            return i;
                        }
                    }

                    return -1;
                };

            util.bind = function (element, type, listener) {
                var wrapper,
                    context,
                    handler;

                if (!this.isObject(listener) && !this.isFunction(listener)) {
                    throw new Error('Invalid listener!');
                }

                if (hasListener(element, type, listener) >= 0) {
                    return;
                }

                if (this.isFunction(listener)) {
                    context = element;
                    handler = listener;
                } else if (this.isFunction(listener.handleEvent)) {
                    context = listener;
                    handler = listener.handleEvent;
                } else {
                    return;
                }

                wrapper = function () {
                    var event = win.event;

                    event.target = event.srcElement || doc;
                    event.currentTarget = element;

                    event.preventDefault = function () {
                        this.returnValue = false;
                    };

                    event.stopPropagation = function () {
                        this.cancelBubble = true;
                    };

                    return handler.call(context, event);
                };

                element.attachEvent('on' + type, wrapper);

                storage.push({
                    type: type,
                    element: element,
                    wrapper: wrapper,
                    listener: listener
                });
            };

            util.unbind = function (element, type, listener) {
                var i = hasListener(element, type, listener);

                if (i < 0) return;

                element.detachEvent('on' + type, storage[i].wrapper);
                storage.splice(i, 1);
            };
        })();
    }

    if (!doc.documentElement.classList) {
        util.hasClass = function (element, name) {
            var className = element.className;

            if (!className) {
                return false;
            }

            className = (' ' + className + ' ').replace(/\s+/g, ' ');

            return className.indexOf(' ' + name + ' ') >= 0;
        };

        util.toggleClass = function (element, name) {
            var hasClass = this.hasClass(element, name),
                className = (' ' + element.className + ' ').replace(/\s+/g, ' ');

            if (hasClass) {
                className = className.replace(' ' + name + ' ', ' ');
            } else {
                className += name;
            }

            element.className = this.trim(className);

            return !hasClass;
        };
    }
})(window, window.document, elidare.util);
