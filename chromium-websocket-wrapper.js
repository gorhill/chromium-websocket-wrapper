/*******************************************************************************

    Chromium-websocket-wrapper - to reveal WebSocket connection attempts to
    chrome.webRequest API.
    Copyright (C) 2016 The Chromium-websocket-wrapper authors.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/chromium-websocket-wrapper
*/

(function() {
    'use strict';

    var Wrapped = window.WebSocket;
    var toWrapped = new WeakMap();

    var onResponseReceived = function(wrapper, ok) {
        this.onload = this.onerror = null;
        var bag = toWrapped.get(wrapper);
        if ( !ok ) {
            if ( bag.properties.onerror ) {
                bag.properties.onerror(new window.ErrorEvent('error'));
            }
            return;
        }
        var wrapped = null;
        try {
            wrapped = new Wrapped(bag.args.url, bag.args.protocols);
        } catch (ex) {
            console.error(ex.toString());
        }
        if ( wrapped === null ) {
            return;
        }
        for ( var p in bag.properties ) {
            wrapped[p] = bag.properties[p];
        }
        for ( var i = 0, l; i < bag.listeners.length; i++ ) {
            l = bag.listeners[i];
            wrapped.addEventListener(l.ev, l.cb, l.fl);
        }
        toWrapped.set(wrapper, wrapped);
    };

    var noopfn = function() {};

    var fallthruGet = function(wrapper, prop, value) {
        var wrapped = toWrapped.get(wrapper);
        if ( !wrapped ) {
            return value;
        }
        if ( wrapped instanceof Wrapped ) {
            return wrapped[prop];
        }
        return wrapped.properties.hasOwnProperty(prop) ?
            wrapped.properties[prop] :
            value;
    };

    var fallthruSet = function(wrapper, prop, value) {
        if ( value instanceof Function ) {
            value = value.bind(wrapper);
        }
        var wrapped = toWrapped.get(wrapper);
        if ( !wrapped ) {
            return;
        }
        if ( wrapped instanceof Wrapped ) {
            wrapped[prop] = value;
        } else {
            wrapped.properties[prop] = value;
        }
    };

    var WebSocket = function(url, protocols) {
        'native';
        if (
            window.location.protocol === 'https:' &&
            url.lastIndexOf('ws:', 0) === 0
        ) {
            var ws = new Wrapped(url, protocols);
            if ( ws ) {
                ws.close();
            }
        }
        Object.defineProperties(this, {
            'binaryType': {
                get: function() {
                    return fallthruGet(this, 'binaryType', 'blob');
                },
                set: function(value) {
                    fallthruSet(this, 'binaryType', value);
                }
            },
            'bufferedAmount': {
                get: function() {
                    return fallthruGet(this, 'bufferedAmount', 0);
                },
                set: noopfn
            },
            'extensions': {
                get: function() {
                    return fallthruGet(this, 'extensions', '');
                },
                set: noopfn
            },
            'onclose': {
                get: function() {
                    return fallthruGet(this, 'onclose', null);
                },
                set: function(value) {
                    fallthruSet(this, 'onclose', value);
                }
            },
            'onerror': {
                get: function() {
                    return fallthruGet(this, 'onerror', null);
                },
                set: function(value) {
                    fallthruSet(this, 'onerror', value);
                }
            },
            'onmessage': {
                get: function() {
                    return fallthruGet(this, 'onmessage', null);
                },
                set: function(value) {
                    fallthruSet(this, 'onmessage', value);
                }
            },
            'onopen': {
                get: function() {
                    return fallthruGet(this, 'onopen', null);
                },
                set: function(value) {
                    fallthruSet(this, 'onopen', value);
                }
            },
            'protocol': {
                get: function() {
                    return fallthruGet(this, 'protocol', '');
                },
                set: noopfn
            },
            'readyState': {
                get: function() {
                    return fallthruGet(this, 'readyState', 0);
                },
                set: noopfn
            },
            'url': {
                get: function() {
                    return fallthruGet(this, 'url', '');
                },
                set: noopfn
            }
        });

        toWrapped.set(this, {
            args: { url: url, protocols: protocols },
            listeners: [],
            properties: {}
        });

        var img = new Image();
        img.src =
              window.location.origin
            + '?url=' + encodeURIComponent(url)
            + '&ubofix=f41665f3028c7fd10eecf573336216d3';
        img.onload = onResponseReceived.bind(img, this, true);
        img.onerror = onResponseReceived.bind(img, this, false);
    };

    WebSocket.prototype = Object.create(window.EventTarget.prototype, {
        CONNECTING: { value: 0 },
        OPEN: { value: 1 },
        CLOSING: { value: 2 },
        CLOSED: { value: 3 },
        addEventListener: {
            enumerable: true,
            value: function(ev, cb, fl) {
                if ( cb instanceof Function === false ) {
                    return;
                }
                var wrapped = toWrapped.get(this);
                if ( !wrapped ) {
                    return;
                }
                var cbb = cb.bind(this);
                if ( wrapped instanceof Wrapped ) {
                    wrapped.addEventListener(ev, cbb, fl);
                } else {
                    wrapped.listeners.push({ ev: ev, cb: cbb, fl: fl });
                }
            },
            writable: true
        },
        close: {
            enumerable: true,
            value: function(code, reason) {
               'native';
                var wrapped = toWrapped.get(this);
                if ( wrapped instanceof Wrapped ) {
                    wrapped.close(code, reason);
                }
            },
            writable: true
        },
        removeEventListener: {
            enumerable: true,
            value: function(ev, cb, fl) {
            },
            writable: true
        },
        send: {
            enumerable: true,
            value: function(data) {
                'native';
                var wrapped = toWrapped.get(this);
                if ( wrapped instanceof Wrapped ) {
                    wrapped.send(data);
                }
            },
            writable: true
        }
    });

    WebSocket.CONNECTING = 0;
    WebSocket.OPEN = 1;
    WebSocket.CLOSING = 2;
    WebSocket.CLOSED = 3;

    window.WebSocket = WebSocket;

    var me = document.currentScript;
    if ( me && me.parentNode !== null ) {
        me.parentNode.removeChild(me);
    }
})();";
