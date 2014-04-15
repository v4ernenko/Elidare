# Elidare

A library for building modular applications in JavaScript.

##Overview

Elidare provides base classes for developing JavaScript applications:

- __View__
- __Model__
- __Emitter__

####View([params])

This class is designed for manipulating DOM elements.

All params are optional. Supported params:

- `element` DOM element (default: `DIV`).
- `DOMEvents` Whitespace-separated string, array or object of event types that are attached to the element (default: `[]`).
- `statePrefix` Prefix for element class names which is related to the element states (default: `state-`).
- `contentElement` Content wrapper (default: `element`).

Supported methods:

- `getId()` Gets the unique identifier for the instance of this view.
- `destroy()` Removes the view's element from the DOM.
- `hasState(name)` Returns `true` if the view is in the specified state, `false` otherwise.
- `setState(name, enable)` Sets or clears the given state on the view.
- `isVisible()` Returns `true` if the view has a `hidden` state, `false` otherwise.
- `isEnabled()` Returns `true` if the view has a `disabled` state, `false` otherwise.
- `getElement()` Gets the view's element.
- `setContent(content [, escapeHTML])` Sets the view's content. If `contentElement` is defined, content is rendered into it.
- `setVisible(visible)` Sets or clears the `hidden` state on the view.
- `setEnabled(enabled)` Sets or clears the `disabled` state on the view.
- `handleEvent(DOMEvent)` Handles DOM events.

View inherits from Emitter, so all emitter methods apply.

Example:

```css
.my-state-hidden {
    display: none;
}
```

```js
var myDiv = document.getElementById('myDiv'),
    myView = new elidare.View({
        element: myDiv,
        DOMEvents: 'click',
        statePrefix: 'my-state-'
    });

myView.on('click', function (event) {
    alert('I am clicked!');

    this.setState('hidden', true); // or this.setVisible(false);
});

myView.on('stateChanged:hidden', function (isHidden) {
    if (isHidden) {
        alert('I am hidden!');
    }
});
```

####Model([props] [, options])

This class is designed for organizing logical data structures.

Supported methods:

- `getId()` Gets the unique identifier for the instance of this model.
- `clone()` Creates a new model with identical properties to this one.
- `reset([options])` Resets all properties on the model.
- `isValidPair(key, value)` Checks the given pair before insert or update. Override it with your own validation logic.
- `getDefaults()` Returns default properties. Override this function when using default properties.
- `hasProperty(name)` Returns `true` if the model has given property.
- `getProperty([name])` Returns the value of a property or all properties if `name` is not passed.
- `setProperty(name [, value] [, options])` Sets or removes properties. To delete a property set the `value` to `null` or `undefined`.

Model inherits from Emitter, so all emitter methods apply.

Supported options:

- `silent` Silently set properties on the model.

Example:

```js
var myModel = new elidare.Model({
    name: 'Vadim',
    online: true
});

myModel.on('change:online', function (value) {
    var name = this.getProperty('name'),
        status = value ? 'online' : 'offline';

    alert(name + ' is ' + status + '!');
});

myModel.setProperty('online', false);
```

####Emitter()

This class is designed for working with events.

Supported methods:

- `on(type, handler [, context])` Adds a `handler`.
- `off([type] [, handler] [, context])` Removes the given `handler` from the specified event `type` or all registered handlers.
- `once(type, handler [, context])` Adds an event `handler` that will be invoked a single time then automatically removed.
- `emit(type [, arg1] [, argN])` Emits event with the given args.

Example:

```js
var myEmitter = new elidare.Emitter();

myEmitter.on('myEvent', function (phrase) {
    alert(phrase);
});

myEmitter.emit('myEvent', 'Hello, world!');
```

##Inheritance

Each class has a static `extend` method and allows you to define your own classes. When a new instance is created, its `init` method is invoked automatically.

```js
var FocusableView = elidare.View.extend({
    init: function () {
        alert('New focusable view is created!');
    },

    blur: function () {
        this.getElement().blur();
    },

    focus: function () {
        var element = this.getElement();

        window.setTimeout(function () {
            element.focus();
        }, 0);
    }
});
```

## License

MIT
