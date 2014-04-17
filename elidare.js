/**
* @overview A library for building modular applications in JavaScript.
* @license MIT
* @version 0.3.1
* @author Vadim Chernenko
* @see {@link https://github.com/v4ernenko/Elidare|Elidare source code repository}
*/

var elidare = (function (win, doc, undefined) {
    'use strict';

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
                var i, n = value.length, clone = [];

                for (i = 0; i < n; i++) {
                    clone[i] = this.clone(value[i]);
                }

                return clone;
            }

            if (this.isObject(value)) {
                var prop, clone = {};

                for (prop in value) {
                    clone[prop] = this.clone(value[prop]);
                }

                return clone;
            }

            return value;
        },

        extend: function (target) {
            var prop,
                item,
                args = [].slice.call(arguments, 1);

            for (var i = 0, n = args.length; i < n; i++) {
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
            return {}.toString.call(value) === '[object Array]';
        },

        getList: function (value) {
            var key, list = [];

            if (this.isArray(value)) {
                list = value;
            } else if (this.isObject(value)) {
                for (key in value) {
                    list.push(key);
                }
            } else if (this.isString(value)) {
                list = this.trim(value).split(/\s+/);
            }

            return list;
        },

        hasClass: function (element, name) {
            var value = element.className && this.trim(element.className);

            if (!value) {
                return false;
            }

            value = ' ' + value.replace(/\s+/g, ' ') + ' ';

            return value.indexOf(' ' + name + ' ') >= 0;
        },

        generateId: (function () {
            var index = 0;

            return function (prefix) {
                prefix = prefix || '';

                return prefix + ++index;
            };
        })(),

        toggleClass: function (element, name, force) {
            var i,
                value,
                result,
                method,
                isForce = force !== undefined,
                className,
                classNames;

            if (isForce) {
                force = !!force;
            }

            result = this.hasClass(element, name);

            method = result ?
                force !== true && 'remove'
                :
                force !== false && 'append';

            if (method) {
                value = this.trim(element.className);

                classNames = value ? value.split(/\s+/) : [];

                switch (method) {
                    case 'append':
                        classNames.push(name);

                        break;

                    case 'remove':
                        for (i = 0; className = classNames[i]; i++) {
                            if (className === name) {
                                classNames.splice(i, 1);

                                break;
                            }
                        }

                        break;
                }

                element.className = classNames.join(' ');
            }

            return isForce ? force : !result;
        },

        isString: function (value) {
            return typeof value === 'string';
        },

        isObject: function (value) {
            return value !== null && typeof value === 'object';
        },

        isNumber: function (value) {
            return !win.isNaN(value) && typeof value === 'number';
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
                args = [].slice.call(arguments, 1),
                handlers = this._handlers[type];

            if (!handlers) {
                return this;
            }

            handlers = handlers.slice(0);

            for (i = 0; item = handlers[i]; i++) {
                item.handler.apply(item.context || this, args);
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

            if (!element) {
                return false;
            }

            return util.hasClass(element, this._statePrefix + name);
        },

        setState: function (name, enable) {
            var element = this._element;

            if (!element) {
                return this;
            }

            enable = !!enable;

            if (this.hasState(name) === enable) {
                return this;
            }

            util.toggleClass(element, this._statePrefix + name, enable);

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
            var i,
                type,
                list,
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
            var i,
                type,
                list,
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
            if (arguments.length === 0) {
                return util.clone(this._props);
            }

            return this._props[name];
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
                                .emit('change', key)
                                .emit('change:' + key);
                        }
                    }

                    return this;
                }

                for (key in name) {
                    this.setProperty(key, name[key], options);
                }

                return this;
            }

            if (!this.isValidPair(name, value)) {
                return this.emit('invalid', name, value);
            }

            options || (options = {});

            if (util.isNullOrUndefined(value)) {
                if (this.hasProperty(name)) {
                    delete this._props[name];

                    if (!options.silent) {
                        this
                            .emit('change', name)
                            .emit('change:' + name);
                    }
                }

                return this;
            }

            if (!util.isEqual(props[name], value)) {
                this._props[name] = value;

                if (!options.silent) {
                    this
                        .emit('change', name, value)
                        .emit('change:' + name, value);
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
