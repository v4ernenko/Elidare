/**
* @overview A library for building modular applications in JavaScript.
* @license MIT
* @version 0.6.1
* @author Vadim Chernenko
* @see {@link https://github.com/v4ernenko/Elidare|Elidare source code repository}
*/

var elidare = (function (win, doc, undefined) {
    'use strict';

    var slice = [].slice;

    // Utilities

    var util = {
        trim: function (value) {
            return this.isString(value) ? value.trim() : value;
        },

        bind: function (element, type, listener) {
            element.addEventListener(type, listener, false);
        },

        clone: function (value) {
            if (this.isArray(value)) {
                return value.slice(0);
            }

            if (this.isObject(value)) {
                return this.extend({}, value);
            }

            return value;
        },

        unbind: function (element, type, listener) {
            element.removeEventListener(type, listener, false);
        },

        extend: function (target) {
            var i, n, key, item,
                args = slice.call(arguments, 1);

            n = args.length;
            target = target || {};

            for (i = 0; i < n; i++) {
                item = args[i];

                if (item) for (key in item) {
                    target[key] = item[key];
                }
            }

            return target;
        },

        isEqual: function (valueA, valueB) {
            if (valueA === valueB) {
                return valueA !== 0 || 1 / valueA === 1 / valueB;
            }

            return valueA !== valueA && valueB !== valueB;
        },

        isArray: Array.isArray,

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

        hasClass: function (element, name) {
            return element.classList.contains(name);
        },

        generateId: (function () {
            var index = 0;

            return function (prefix) {
                prefix = prefix || '';

                return prefix + ++index;
            };
        })(),

        toggleClass: function (element, name) {
            return element.classList.toggle(name);
        },

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

        isNullOrUndefined: function (value) {
            return (value === null || value === undefined);
        }
    };

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
            var key, handlers = this._handlers;

            if (util.isObject(type)) {
                for (key in type) {
                    this.on(key, type[key], handler);
                }

                return this;
            }

            if (!type || !util.isFunction(handler)) {
                return this;
            }

            (handlers[type] = handlers[type] || []).push({
                handler: handler,
                context: context
            });

            return this;
        },

        off: function (type, handler, context) {
            var i, key, item,
                handlers = this._handlers[type];

            if (!arguments.length) {
                this._handlers = {};
                return this;
            }

            if (util.isObject(type)) {
                for (key in type) {
                    this.off(key, type[key], handler);
                }

                return this;
            }

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
            var key, that = this, onceHandler;

            if (util.isObject(type)) {
                for (key in type) {
                    this.once(key, type[key], handler);
                }

                return this;
            }

            if (!type || !util.isFunction(handler)) {
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
            var i, key, item,
                args = slice.call(arguments, 1),
                handlers = this._handlers[type],
                allHandlers = this._handlers['*'];

            if (util.isObject(type)) {
                for (key in type) {
                    this.emit(key, type[key]);
                }

                return this;
            }

            if (type !== '*' && handlers) {
                for (i = 0; item = handlers[i]; i++) {
                    item.handler.apply(item.context || this, args);
                }
            }

            if (allHandlers) {
                for (i = 0; item = allHandlers[i]; i++) {
                    item.handler.apply(item.context || this, arguments);
                }
            }

            return this;
        }
    });

    // View

    var View = Emitter.extend({
        init: function (options) {
            options = options || {};

            var element = this._element = options.element || doc.createElement('div');

            this._id = element.id || util.generateId('vid');
            this._DOMEvents = {};
            this._statePrefix = options.statePrefix || 'state-';
            this._contentElement = options.contentElement || element;

            if (options.DOMEvents) {
                this.bindDOMEvents(options.DOMEvents);
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

            return this.emit('destroy');
        },

        hasState: function (name) {
            var element = this._element;

            if (!name || !element) {
                return false;
            }

            return util.hasClass(element, this._statePrefix + name);
        },

        setState: function (name, enable) {
            var key, hasState, element = this._element;

            if (util.isObject(name)) {
                for (key in name) {
                    this.setState(key, name[key]);
                }

                return this;
            }

            if (!name || !element) {
                return this;
            }

            hasState = this.hasState(name);

            enable = arguments.length < 2 ? !hasState : !!enable;

            if (enable === hasState) {
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

        setContent: function (content, asText) {
            var contentElement = this._contentElement;

            if (contentElement) {
                if (asText) {
                    contentElement.innerText = contentElement.textContent = content;
                } else {
                    contentElement.innerHTML = content;
                }

                this.emit('contentChanged', content, asText);
            }

            return this;
        },

        setVisible: function (visible) {
            var args = ['hidden'];

            if (arguments.length) {
                args.push(!visible);
            }

            return this.setState.apply(this, args);
        },

        setEnabled: function (enabled) {
            var args = ['disabled'];

            if (arguments.length) {
                args.push(!enabled);
            }

            return this.setState.apply(this, args);
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
            var key, changed,
                props = this.getProperty();

            if (name === null || util.isObject(name)) {
                options = value || {};

                if (!name) {
                    for (key in props) {
                        this.setProperty(key, null, options);
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
                if (!this.hasProperty(name)) {
                    return this;
                }

                value = void value;

                changed = delete this._props[name];
            } else if (!util.isEqual(props[name], value)) {
                this._props[name] = value;

                changed = true;
            }

            if (changed && !options.silent) {
                this
                    .emit('change', name, value, props[name], options)
                    .emit('change:' + name, value, props[name], options);
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
