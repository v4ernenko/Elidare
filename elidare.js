/**
* @overview A library for building modular applications in JavaScript.
* @license MIT
* @version 0.3.7
* @author Vadim Chernenko
* @see {@link https://github.com/v4ernenko/Elidare|Elidare source code repository}
*/

var elidare = (function (win, doc, undefined) {
    'use strict';

    var slice = [].slice,
        toString = {}.toString;

    // Utilities

    var util = {
        trim: (function () {
            if (''.trim) {
                return function (value) {
                    return String(value).trim();
                };
            }

            return function (value) {
                return String(value).replace(/^\s+|\s+$/g, '');
            };
        })(),

        clone: function (value) {
            if (this.isArray(value)) {
                return value.slice(0);
            }

            if (this.isObject(value)) {
                return this.extend({}, value);
            }

            return value;
        },

        extend: function (target) {
            var i, n, prop, item,
                args = slice.call(arguments, 1);

            n = args.length;
            target = target || {};

            for (i = 0; i < n; i++) {
                item = args[i];

                if (item) for (prop in item) {
                    target[prop] = item[prop];
                }
            }

            return target;
        },

        isEqual: Object.is || function (x, y) {
            if (x === y) {
                return x !== 0 || 1 / x === 1 / y;
            }

            return x !== x && y !== y;
        },

        isArray: Array.isArray || function (value) {
            return toString.call(value) === '[object Array]';
        },

        getList: function (value) {
            var key, list = [];

            if (this.isString(value)) {
                list = this.trim(value).split(/\s+/);
            } else if (this.isArray(value)) {
                list = value;
            } else if (this.isObject(value)) {
                for (key in value) {
                    list.push(key);
                }
            }

            return list;
        },

        generateId: (function () {
            var index = 0;

            return function (prefix) {
                prefix = prefix || '';

                return prefix + ++index;
            };
        })(),

        isString: function (value) {
            return typeof value === 'string';
        },

        isObject: function (value) {
            return typeof value === 'object' && value !== null;
        },

        isNumber: function (value) {
            return typeof value === 'number' && !win.isNaN(value);
        },

        isFunction: function (value) {
            return typeof value === 'function';
        },

        escapeHTML: function (value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        isNullOrUndefined: function (value) {
            return (value === null || value === undefined);
        }
    };

    if (doc.addEventListener) {
        util.bind = function (element, type, listener) {
            element.addEventListener(type, listener, false);
        };

        util.unbind = function (element, type, listener) {
            element.removeEventListener(type, listener, false);
        };
    } else if (win.attachEvent) {
        (function () {
            var storage = [],

                detachAll = function () {
                    for (var i = 0, item; item = storage[i]; i++) {
                        item.element.detachEvent('on' + item.type, item.wrapper);
                    }
                },

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

                if (i < 0) {
                    return;
                }

                element.detachEvent('on' + type, storage[i].wrapper);
                storage.splice(i, 1);
            };

            win.attachEvent('onunload', detachAll);
        })();
    }

    if (doc.documentElement.classList) {
        util.hasClass = function (element, name) {
            return element.classList.contains(name);
        };

        util.toggleClass = function (element, name) {
            return element.classList.toggle(name);
        };
    } else {
        util.hasClass = function (element, name) {
            var className = element.className && this.trim(element.className);

            if (!className) {
                return false;
            }

            className = ' ' + className.replace(/\s+/g, ' ') + ' ';

            return className.indexOf(' ' + name + ' ') >= 0;
        };

        util.toggleClass = function (element, name) {
            var i,
                hasClass = this.hasClass(element, name),
                className = this.trim(element.className),
                classNames = className ? className.split(/\s+/) : [];

            if (hasClass) {
                for (i = 0; className = classNames[i]; i++) {
                    if (className === name) {
                        classNames.splice(i, 1);

                        break;
                    }
                }
            } else {
                classNames.push(name);
            }

            element.className = classNames.join(' ');

            return !hasClass;
        };
    }

    // Base

    var Base = function () {};

    Base.extend = function (props) {
        var Dummy,
            Child;

        Dummy = function () {
            this.constructor = Child;
        };

        Child = function () {
            if (Child.__parentProto__) {
                Child.__parentProto__.constructor.apply(this, arguments);
            }

            if (Child.prototype.hasOwnProperty('init')) {
                Child.prototype.init.apply(this, arguments);
            }
        };

        Child.extend = this.extend;

        Dummy.prototype = Child.__parentProto__ = this.prototype;
        Child.prototype = new Dummy();

        if (props) {
            util.extend(Child.prototype, props);
        }

        return Child;
    };

    // Emitter

    var Emitter = Base.extend({
        init: function () {
            this._handlers = {};
        },

        on: function (type, handler, context) {
            if (!util.isFunction(handler)) {
                return this;
            }

            (this._handlers[type] = this._handlers[type] || []).push({
                handler: handler,
                context: context
            });

            return this;
        },

        off: function (type, handler, context) {
            var i, item, handlers;

            if (arguments.length === 0) {
                this._handlers = {};

                return this;
            }

            handlers = this._handlers[type];

            if (!handlers) {
                return this;
            }

            if (arguments.length === 1) {
                delete this._handlers[type];

                return this;
            }

            for (i = 0; item = handlers[i]; i++) {
                if (
                    item.context === context && (
                        item.handler === handler ||
                        item.handler.sourceHandler === handler
                )) {
                    handlers.splice(i, 1);

                    break;
                }
            }

            return this;
        },

        once: function (type, handler, context) {
            var that = this,
                onceHandler;

            if (!util.isFunction(handler)) {
                return this;
            }

            onceHandler = function () {
                that.off(type, onceHandler, context);
                handler.apply(this, arguments);
            };

            onceHandler.sourceHandler = handler;

            return this.on(type, onceHandler, context);
        },

        emit: function (type) {
            var i,
                item,
                args = slice.call(arguments, 1),
                handlers = this._handlers[type],
                allHandlers = this._handlers['*'];

            if (type !== '*' && handlers) {
                handlers = handlers.slice(0);

                for (i = 0; item = handlers[i]; i++) {
                    item.handler.apply(item.context || this, args);
                }
            }

            if (allHandlers) {
                allHandlers = allHandlers.slice(0);

                for (i = 0; item = allHandlers[i]; i++) {
                    item.handler.apply(item.context || this, arguments);
                }
            }

            return this;
        }
    });

    // View

    var View = Emitter.extend({
        init: function (params) {
            params = params || {};

            var element = this._element = params.element || doc.createElement('div');

            this._id = element.id || util.generateId('vid');
            this._DOMEvents = {};
            this._statePrefix = params.statePrefix || 'state-';
            this._contentElement = params.contentElement || element;

            if (params.DOMEvents) {
                this.bindDOMEvents(params.DOMEvents);
            }
        },

        getId: function () {
            return this._id;
        },

        destroy: function () {
            var element = this._element;

            if (!element) {
                return this;
            }

            this.unbindDOMEvents().off();

            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }

            this._element = this._contentElement = null;

            return this;
        },

        hasState: function (name) {
            var element = this._element;

            if (!name || !element) {
                return false;
            }

            return util.hasClass(element, this._statePrefix + name);
        },

        setState: function (name, enable) {
            var key, element = this._element;

            if (util.isObject(name)) {
                for (key in name) {
                    this.setState(key, name[key]);
                }

                return this;
            }

            if (!name || !element) {
                return this;
            }

            enable = !!enable;

            if (enable === this.hasState(name)) {
                return this;
            }

            util.toggleClass(element, this._statePrefix + name);

            this
                .emit('stateChanged', name, enable)
                .emit('stateChanged:' + name, enable);

            return this;
        },

        isVisible: function () {
            return !this.hasState('hidden');
        },

        isEnabled: function () {
            return !this.hasState('disabled');
        },

        getElement: function () {
            return this._element;
        },

        setContent: function (content, escapeHTML) {
            var contentElement = this._contentElement;

            if (contentElement) {
                contentElement.innerHTML = escapeHTML ?
                    util.escapeHTML(content) : content;
            }

            return this;
        },

        setVisible: function (visible) {
            return this.setState('hidden', !visible);
        },

        setEnabled: function (enabled) {
            return this.setState('disabled', !enabled);
        },

        handleEvent: function (DOMEvent) {
            this.emit(DOMEvent.type, DOMEvent);
        },

        bindDOMEvents: function (types) {
            var i, type, list,
                element = this._element,
                DOMEvents = this._DOMEvents;

            if (!element) {
                return this;
            }

            list = util.getList(types);

            for (i = 0; type = list[i]; i++) {
                if (DOMEvents[type]) continue;

                DOMEvents[type] = true;
                util.bind(element, type, this);
            }

            return this;
        },

        unbindDOMEvents: function (types) {
            var i, type, list,
                element = this._element,
                DOMEvents = this._DOMEvents;

            if (!element) {
                return this;
            }

            list = util.getList(types || DOMEvents);

            for (i = 0; type = list[i]; i++) {
                if (!DOMEvents[type]) continue;

                delete DOMEvents[type];
                util.unbind(element, type, this);
            }

            return this;
        }
    });

    // Model

    var Model = Emitter.extend({
        init: function (props, options) {
            options = options || {};

            this._id = options.id || util.generateId('mid');
            this._props = {};

            props = util.extend(this.getDefaults(), props);
            this.setProperty(props, options);
        },

        getId: function () {
            return this._id;
        },

        clone: function (options) {
            return new this.constructor(this._props, options);
        },

        clear: function (options) {
            return this.setProperty(null, options);
        },

        reset: function (options) {
            return this.setProperty(this.getDefaults(), options);
        },

        isValidPair: function () {
            return true;
        },

        getDefaults: function () {
            return {};
        },

        hasProperty: function (name) {
            return this._props.hasOwnProperty(name);
        },

        getProperty: function (name) {
            var i, chunk = {}, list,
                props = this._props;

            if (arguments.length === 0) {
                return util.clone(props);
            }

            list = util.getList(name);

            switch (list.length) {
                case 0:
                    return;

                case 1:
                    return props[list[0]];

                default:
                    for (i = 0; name = list[i]; i++) {
                        chunk[name] = props[name];
                    }

                    return chunk;
            }
        },

        setProperty: function (name, value, options) {
            var key, props = this._props;

            if (name === null || util.isObject(name)) {
                options = value || {};

                if (!name) {
                    this._props = {};

                    if (!options.silent) {
                        for (key in props) {
                            this
                                .emit('change', key, undefined, options)
                                .emit('change:' + key, undefined, options);
                        }
                    }

                    return this;
                }

                for (key in name) {
                    this.setProperty(key, name[key], options);
                }

                return this;
            }

            options || (options = {});

            if (!this.isValidPair(name, value)) {
                return this.emit('invalid', name, value, options);
            }

            if (util.isNullOrUndefined(value)) {
                if (this.hasProperty(name)) {
                    delete this._props[name];

                    if (!options.silent) {
                        this
                            .emit('change', name, undefined, options)
                            .emit('change:' + name, undefined, options);
                    }
                }

                return this;
            }

            if (!util.isEqual(props[name], value)) {
                this._props[name] = value;

                if (!options.silent) {
                    this
                        .emit('change', name, value, options)
                        .emit('change:' + name, value, options);
                }
            }

            return this;
        }
    });

    return {
        util: util,
        View: View,
        Model: Model,
        Emitter: Emitter
    };
})(window, window.document);
