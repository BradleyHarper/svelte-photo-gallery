
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var base83 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var digitCharacters = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "#",
        "$",
        "%",
        "*",
        "+",
        ",",
        "-",
        ".",
        ":",
        ";",
        "=",
        "?",
        "@",
        "[",
        "]",
        "^",
        "_",
        "{",
        "|",
        "}",
        "~"
    ];
    exports.decode83 = function (str) {
        var value = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str[i];
            var digit = digitCharacters.indexOf(c);
            value = value * 83 + digit;
        }
        return value;
    };
    exports.encode83 = function (n, length) {
        var result = "";
        for (var i = 1; i <= length; i++) {
            var digit = (Math.floor(n) / Math.pow(83, length - i)) % 83;
            result += digitCharacters[Math.floor(digit)];
        }
        return result;
    };

    });

    var utils = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sRGBToLinear = function (value) {
        var v = value / 255;
        if (v <= 0.04045) {
            return v / 12.92;
        }
        else {
            return Math.pow((v + 0.055) / 1.055, 2.4);
        }
    };
    exports.linearTosRGB = function (value) {
        var v = Math.max(0, Math.min(1, value));
        if (v <= 0.0031308) {
            return Math.round(v * 12.92 * 255 + 0.5);
        }
        else {
            return Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
        }
    };
    exports.sign = function (n) { return (n < 0 ? -1 : 1); };
    exports.signPow = function (val, exp) {
        return exports.sign(val) * Math.pow(Math.abs(val), exp);
    };

    });

    var error = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationError = /** @class */ (function (_super) {
        __extends(ValidationError, _super);
        function ValidationError(message) {
            var _this = _super.call(this, message) || this;
            _this.name = "ValidationError";
            _this.message = message;
            return _this;
        }
        return ValidationError;
    }(Error));
    exports.ValidationError = ValidationError;

    });

    var decode_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });



    /**
     * Returns an error message if invalid or undefined if valid
     * @param blurhash
     */
    var validateBlurhash = function (blurhash) {
        if (!blurhash || blurhash.length < 6) {
            throw new error.ValidationError("The blurhash string must be at least 6 characters");
        }
        var sizeFlag = base83.decode83(blurhash[0]);
        var numY = Math.floor(sizeFlag / 9) + 1;
        var numX = (sizeFlag % 9) + 1;
        if (blurhash.length !== 4 + 2 * numX * numY) {
            throw new error.ValidationError("blurhash length mismatch: length is " + blurhash.length + " but it should be " + (4 + 2 * numX * numY));
        }
    };
    exports.isBlurhashValid = function (blurhash) {
        try {
            validateBlurhash(blurhash);
        }
        catch (error) {
            return { result: false, errorReason: error.message };
        }
        return { result: true };
    };
    var decodeDC = function (value) {
        var intR = value >> 16;
        var intG = (value >> 8) & 255;
        var intB = value & 255;
        return [utils.sRGBToLinear(intR), utils.sRGBToLinear(intG), utils.sRGBToLinear(intB)];
    };
    var decodeAC = function (value, maximumValue) {
        var quantR = Math.floor(value / (19 * 19));
        var quantG = Math.floor(value / 19) % 19;
        var quantB = value % 19;
        var rgb = [
            utils.signPow((quantR - 9) / 9, 2.0) * maximumValue,
            utils.signPow((quantG - 9) / 9, 2.0) * maximumValue,
            utils.signPow((quantB - 9) / 9, 2.0) * maximumValue
        ];
        return rgb;
    };
    var decode = function (blurhash, width, height, punch) {
        validateBlurhash(blurhash);
        punch = punch | 1;
        var sizeFlag = base83.decode83(blurhash[0]);
        var numY = Math.floor(sizeFlag / 9) + 1;
        var numX = (sizeFlag % 9) + 1;
        var quantisedMaximumValue = base83.decode83(blurhash[1]);
        var maximumValue = (quantisedMaximumValue + 1) / 166;
        var colors = new Array(numX * numY);
        for (var i = 0; i < colors.length; i++) {
            if (i === 0) {
                var value = base83.decode83(blurhash.substring(2, 6));
                colors[i] = decodeDC(value);
            }
            else {
                var value = base83.decode83(blurhash.substring(4 + i * 2, 6 + i * 2));
                colors[i] = decodeAC(value, maximumValue * punch);
            }
        }
        var bytesPerRow = width * 4;
        var pixels = new Uint8ClampedArray(bytesPerRow * height);
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var r = 0;
                var g = 0;
                var b = 0;
                for (var j = 0; j < numY; j++) {
                    for (var i = 0; i < numX; i++) {
                        var basis = Math.cos((Math.PI * x * i) / width) *
                            Math.cos((Math.PI * y * j) / height);
                        var color = colors[i + j * numX];
                        r += color[0] * basis;
                        g += color[1] * basis;
                        b += color[2] * basis;
                    }
                }
                var intR = utils.linearTosRGB(r);
                var intG = utils.linearTosRGB(g);
                var intB = utils.linearTosRGB(b);
                pixels[4 * x + 0 + y * bytesPerRow] = intR;
                pixels[4 * x + 1 + y * bytesPerRow] = intG;
                pixels[4 * x + 2 + y * bytesPerRow] = intB;
                pixels[4 * x + 3 + y * bytesPerRow] = 255; // alpha
            }
        }
        return pixels;
    };
    exports.default = decode;

    });

    var encode_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });



    var bytesPerPixel = 4;
    var multiplyBasisFunction = function (pixels, width, height, basisFunction) {
        var r = 0;
        var g = 0;
        var b = 0;
        var bytesPerRow = width * bytesPerPixel;
        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                var basis = basisFunction(x, y);
                r +=
                    basis * utils.sRGBToLinear(pixels[bytesPerPixel * x + 0 + y * bytesPerRow]);
                g +=
                    basis * utils.sRGBToLinear(pixels[bytesPerPixel * x + 1 + y * bytesPerRow]);
                b +=
                    basis * utils.sRGBToLinear(pixels[bytesPerPixel * x + 2 + y * bytesPerRow]);
            }
        }
        var scale = 1 / (width * height);
        return [r * scale, g * scale, b * scale];
    };
    var encodeDC = function (value) {
        var roundedR = utils.linearTosRGB(value[0]);
        var roundedG = utils.linearTosRGB(value[1]);
        var roundedB = utils.linearTosRGB(value[2]);
        return (roundedR << 16) + (roundedG << 8) + roundedB;
    };
    var encodeAC = function (value, maximumValue) {
        var quantR = Math.floor(Math.max(0, Math.min(18, Math.floor(utils.signPow(value[0] / maximumValue, 0.5) * 9 + 9.5))));
        var quantG = Math.floor(Math.max(0, Math.min(18, Math.floor(utils.signPow(value[1] / maximumValue, 0.5) * 9 + 9.5))));
        var quantB = Math.floor(Math.max(0, Math.min(18, Math.floor(utils.signPow(value[2] / maximumValue, 0.5) * 9 + 9.5))));
        return quantR * 19 * 19 + quantG * 19 + quantB;
    };
    var encode = function (pixels, width, height, componentX, componentY) {
        if (componentX < 1 || componentX > 9 || componentY < 1 || componentY > 9) {
            throw new error.ValidationError("BlurHash must have between 1 and 9 components");
        }
        if (width * height * 4 !== pixels.length) {
            throw new error.ValidationError("Width and height must match the pixels array");
        }
        var factors = [];
        var _loop_1 = function (y) {
            var _loop_2 = function (x) {
                var normalisation = x == 0 && y == 0 ? 1 : 2;
                var factor = multiplyBasisFunction(pixels, width, height, function (i, j) {
                    return normalisation *
                        Math.cos((Math.PI * x * i) / width) *
                        Math.cos((Math.PI * y * j) / height);
                });
                factors.push(factor);
            };
            for (var x = 0; x < componentX; x++) {
                _loop_2(x);
            }
        };
        for (var y = 0; y < componentY; y++) {
            _loop_1(y);
        }
        var dc = factors[0];
        var ac = factors.slice(1);
        var hash = "";
        var sizeFlag = componentX - 1 + (componentY - 1) * 9;
        hash += base83.encode83(sizeFlag, 1);
        var maximumValue;
        if (ac.length > 0) {
            var actualMaximumValue = Math.max.apply(Math, ac.map(function (val) { return Math.max.apply(Math, val); }));
            var quantisedMaximumValue = Math.floor(Math.max(0, Math.min(82, Math.floor(actualMaximumValue * 166 - 0.5))));
            maximumValue = (quantisedMaximumValue + 1) / 166;
            hash += base83.encode83(quantisedMaximumValue, 1);
        }
        else {
            maximumValue = 1;
            hash += base83.encode83(0, 1);
        }
        hash += base83.encode83(encodeDC(dc), 4);
        ac.forEach(function (factor) {
            hash += base83.encode83(encodeAC(factor, maximumValue), 2);
        });
        return hash;
    };
    exports.default = encode;

    });

    var dist = createCommonjsModule(function (module, exports) {
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.decode = decode_1.default;
    exports.isBlurhashValid = decode_1.isBlurhashValid;

    exports.encode = encode_1.default;
    __export(error);

    });

    /* node_modules/svelte-waypoint/src/Waypoint.svelte generated by Svelte v3.31.0 */
    const file = "node_modules/svelte-waypoint/src/Waypoint.svelte";

    // (139:2) {#if visible}
    function create_if_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(139:2) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let div_class_value;
    	let waypoint_action;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*visible*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", div_class_value = "wrapper " + /*className*/ ctx[2] + " " + /*c*/ ctx[0] + " svelte-142y8oi");
    			attr_dev(div, "style", /*style*/ ctx[1]);
    			add_location(div, file, 137, 0, 3091);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(waypoint_action = /*waypoint*/ ctx[4].call(null, div));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*visible*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*className, c*/ 5 && div_class_value !== (div_class_value = "wrapper " + /*className*/ ctx[2] + " " + /*c*/ ctx[0] + " svelte-142y8oi")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr_dev(div, "style", /*style*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function throttleFn(fn, time) {
    	let last, deferTimer;

    	return () => {
    		const now = +new Date();

    		if (last && now < last + time) {
    			// hold on to it
    			clearTimeout(deferTimer);

    			deferTimer = setTimeout(
    				function () {
    					last = now;
    					fn();
    				},
    				time
    			);
    		} else {
    			last = now;
    			fn();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Waypoint", slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let { offset = 0 } = $$props;
    	let { throttle = 250 } = $$props;
    	let { c = "" } = $$props;
    	let { style = "" } = $$props;
    	let { once = true } = $$props;
    	let { threshold = 1 } = $$props;
    	let { disabled = false } = $$props;
    	let { class: className = "" } = $$props;
    	let visible = disabled;
    	let wasVisible = false;
    	let intersecting = false;

    	let removeHandlers = () => {
    		
    	};

    	function callEvents(wasVisible, observer, node) {
    		if (visible && !wasVisible) {
    			dispatch("enter");
    			return;
    		}

    		if (wasVisible && !intersecting) {
    			dispatch("leave");
    		}

    		if (once && wasVisible && !intersecting) {
    			removeHandlers();
    		}
    	}

    	function waypoint(node) {
    		if (!window || disabled) return;

    		if (window.IntersectionObserver && window.IntersectionObserverEntry) {
    			const observer = new IntersectionObserver(([{ isIntersecting }]) => {
    					wasVisible = visible;
    					intersecting = isIntersecting;

    					if (wasVisible && once && !isIntersecting) {
    						callEvents(wasVisible);
    						return;
    					}

    					$$invalidate(3, visible = isIntersecting);
    					callEvents(wasVisible);
    				},
    			{ rootMargin: offset + "px", threshold });

    			observer.observe(node);
    			removeHandlers = () => observer.unobserve(node);
    			return removeHandlers;
    		}

    		function checkIsVisible() {
    			// Kudos https://github.com/twobin/react-lazyload/blob/master/src/index.jsx#L93
    			if (!(node.offsetWidth || node.offsetHeight || node.getClientRects().length)) return;

    			let top;
    			let height;

    			try {
    				({ top, height } = node.getBoundingClientRect());
    			} catch(e) {
    				({ top, height } = defaultBoundingClientRect);
    			}

    			const windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;
    			wasVisible = visible;
    			intersecting = top - offset <= windowInnerHeight && top + height + offset >= 0;

    			if (wasVisible && once && !isIntersecting) {
    				callEvents(wasVisible, observer);
    				return;
    			}

    			$$invalidate(3, visible = intersecting);
    			callEvents(wasVisible);
    		}

    		checkIsVisible();
    		const throttled = throttleFn(checkIsVisible, throttle);
    		window.addEventListener("scroll", throttled);
    		window.addEventListener("resize", throttled);

    		removeHandlers = () => {
    			window.removeEventListener("scroll", throttled);
    			window.removeEventListener("resize", throttled);
    		};

    		return removeHandlers;
    	}

    	const writable_props = ["offset", "throttle", "c", "style", "once", "threshold", "disabled", "class"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Waypoint> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("offset" in $$props) $$invalidate(5, offset = $$props.offset);
    		if ("throttle" in $$props) $$invalidate(6, throttle = $$props.throttle);
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("once" in $$props) $$invalidate(7, once = $$props.once);
    		if ("threshold" in $$props) $$invalidate(8, threshold = $$props.threshold);
    		if ("disabled" in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ("class" in $$props) $$invalidate(2, className = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		offset,
    		throttle,
    		c,
    		style,
    		once,
    		threshold,
    		disabled,
    		className,
    		visible,
    		wasVisible,
    		intersecting,
    		removeHandlers,
    		throttleFn,
    		callEvents,
    		waypoint
    	});

    	$$self.$inject_state = $$props => {
    		if ("offset" in $$props) $$invalidate(5, offset = $$props.offset);
    		if ("throttle" in $$props) $$invalidate(6, throttle = $$props.throttle);
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("once" in $$props) $$invalidate(7, once = $$props.once);
    		if ("threshold" in $$props) $$invalidate(8, threshold = $$props.threshold);
    		if ("disabled" in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ("className" in $$props) $$invalidate(2, className = $$props.className);
    		if ("visible" in $$props) $$invalidate(3, visible = $$props.visible);
    		if ("wasVisible" in $$props) wasVisible = $$props.wasVisible;
    		if ("intersecting" in $$props) intersecting = $$props.intersecting;
    		if ("removeHandlers" in $$props) removeHandlers = $$props.removeHandlers;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		c,
    		style,
    		className,
    		visible,
    		waypoint,
    		offset,
    		throttle,
    		once,
    		threshold,
    		disabled,
    		$$scope,
    		slots
    	];
    }

    class Waypoint extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			offset: 5,
    			throttle: 6,
    			c: 0,
    			style: 1,
    			once: 7,
    			threshold: 8,
    			disabled: 9,
    			class: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Waypoint",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get offset() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get throttle() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set throttle(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get c() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get once() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set once(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get threshold() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set threshold(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-image/src/Image.svelte generated by Svelte v3.31.0 */
    const file$1 = "node_modules/svelte-image/src/Image.svelte";

    // (92:6) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_class_value;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", img_class_value = "placeholder " + /*placeholderClass*/ ctx[14] + " svelte-ilz1a1");
    			if (img.src !== (img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			toggle_class(img, "blur", /*blur*/ ctx[8]);
    			add_location(img, file$1, 92, 8, 2107);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*placeholderClass*/ 16384 && img_class_value !== (img_class_value = "placeholder " + /*placeholderClass*/ ctx[14] + " svelte-ilz1a1")) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*src*/ 16 && img.src !== (img_src_value = /*src*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*placeholderClass, blur*/ 16640) {
    				toggle_class(img, "blur", /*blur*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(92:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (90:6) {#if blurhash}
    function create_if_block$1(ctx) {
    	let canvas;
    	let canvas_width_value;
    	let canvas_height_value;
    	let decodeBlurhash_action;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas = element("canvas");
    			attr_dev(canvas, "class", "placeholder svelte-ilz1a1");
    			attr_dev(canvas, "width", canvas_width_value = /*blurhashSize*/ ctx[16].width);
    			attr_dev(canvas, "height", canvas_height_value = /*blurhashSize*/ ctx[16].height);
    			add_location(canvas, file$1, 90, 8, 1979);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(decodeBlurhash_action = /*decodeBlurhash*/ ctx[20].call(null, canvas));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*blurhashSize*/ 65536 && canvas_width_value !== (canvas_width_value = /*blurhashSize*/ ctx[16].width)) {
    				attr_dev(canvas, "width", canvas_width_value);
    			}

    			if (dirty & /*blurhashSize*/ 65536 && canvas_height_value !== (canvas_height_value = /*blurhashSize*/ ctx[16].height)) {
    				attr_dev(canvas, "height", canvas_height_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(90:6) {#if blurhash}",
    		ctx
    	});

    	return block;
    }

    // (79:0) <Waypoint   class="{wrapperClass}"   style="min-height: 100px; width: 100%;"   once   {threshold}   {offset}   disabled="{!lazy}" >
    function create_default_slot(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let picture;
    	let source0;
    	let t2;
    	let source1;
    	let t3;
    	let img;
    	let img_src_value;
    	let img_class_value;
    	let load_action;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*blurhash*/ ctx[15]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			picture = element("picture");
    			source0 = element("source");
    			t2 = space();
    			source1 = element("source");
    			t3 = space();
    			img = element("img");
    			set_style(div0, "width", "100%");
    			set_style(div0, "padding-bottom", /*ratio*/ ctx[7]);
    			add_location(div0, file$1, 88, 6, 1895);
    			attr_dev(source0, "type", "image/webp");
    			attr_dev(source0, "srcset", /*srcsetWebp*/ ctx[6]);
    			attr_dev(source0, "sizes", /*sizes*/ ctx[9]);
    			add_location(source0, file$1, 95, 8, 2213);
    			attr_dev(source1, "srcset", /*srcset*/ ctx[5]);
    			attr_dev(source1, "sizes", /*sizes*/ ctx[9]);
    			add_location(source1, file$1, 96, 8, 2280);
    			if (img.src !== (img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", img_class_value = "main " + /*c*/ ctx[0] + " " + /*className*/ ctx[17] + " svelte-ilz1a1");
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			attr_dev(img, "width", /*width*/ ctx[2]);
    			attr_dev(img, "height", /*height*/ ctx[3]);
    			add_location(img, file$1, 97, 8, 2316);
    			add_location(picture, file$1, 94, 6, 2195);
    			set_style(div1, "position", "relative");
    			set_style(div1, "overflow", "hidden");
    			add_location(div1, file$1, 87, 4, 1837);
    			set_style(div2, "position", "relative");
    			set_style(div2, "width", "100%");
    			attr_dev(div2, "class", "svelte-ilz1a1");
    			toggle_class(div2, "loaded", /*loaded*/ ctx[18]);
    			add_location(div2, file$1, 86, 2, 1773);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			if_block.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, picture);
    			append_dev(picture, source0);
    			append_dev(picture, t2);
    			append_dev(picture, source1);
    			append_dev(picture, t3);
    			append_dev(picture, img);

    			if (!mounted) {
    				dispose = action_destroyer(load_action = /*load*/ ctx[19].call(null, img));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ratio*/ 128) {
    				set_style(div0, "padding-bottom", /*ratio*/ ctx[7]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t1);
    				}
    			}

    			if (dirty & /*srcsetWebp*/ 64) {
    				attr_dev(source0, "srcset", /*srcsetWebp*/ ctx[6]);
    			}

    			if (dirty & /*sizes*/ 512) {
    				attr_dev(source0, "sizes", /*sizes*/ ctx[9]);
    			}

    			if (dirty & /*srcset*/ 32) {
    				attr_dev(source1, "srcset", /*srcset*/ ctx[5]);
    			}

    			if (dirty & /*sizes*/ 512) {
    				attr_dev(source1, "sizes", /*sizes*/ ctx[9]);
    			}

    			if (dirty & /*src*/ 16 && img.src !== (img_src_value = /*src*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*c, className*/ 131073 && img_class_value !== (img_class_value = "main " + /*c*/ ctx[0] + " " + /*className*/ ctx[17] + " svelte-ilz1a1")) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 4) {
    				attr_dev(img, "width", /*width*/ ctx[2]);
    			}

    			if (dirty & /*height*/ 8) {
    				attr_dev(img, "height", /*height*/ ctx[3]);
    			}

    			if (dirty & /*loaded*/ 262144) {
    				toggle_class(div2, "loaded", /*loaded*/ ctx[18]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(79:0) <Waypoint   class=\\\"{wrapperClass}\\\"   style=\\\"min-height: 100px; width: 100%;\\\"   once   {threshold}   {offset}   disabled=\\\"{!lazy}\\\" >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let waypoint;
    	let current;

    	waypoint = new Waypoint({
    			props: {
    				class: /*wrapperClass*/ ctx[13],
    				style: "min-height: 100px; width: 100%;",
    				once: true,
    				threshold: /*threshold*/ ctx[11],
    				offset: /*offset*/ ctx[10],
    				disabled: !/*lazy*/ ctx[12],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(waypoint.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(waypoint, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const waypoint_changes = {};
    			if (dirty & /*wrapperClass*/ 8192) waypoint_changes.class = /*wrapperClass*/ ctx[13];
    			if (dirty & /*threshold*/ 2048) waypoint_changes.threshold = /*threshold*/ ctx[11];
    			if (dirty & /*offset*/ 1024) waypoint_changes.offset = /*offset*/ ctx[10];
    			if (dirty & /*lazy*/ 4096) waypoint_changes.disabled = !/*lazy*/ ctx[12];

    			if (dirty & /*$$scope, loaded, src, c, className, alt, width, height, srcset, sizes, srcsetWebp, blurhashSize, blurhash, placeholderClass, blur, ratio*/ 2606079) {
    				waypoint_changes.$$scope = { dirty, ctx };
    			}

    			waypoint.$set(waypoint_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waypoint.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waypoint.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waypoint, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Image", slots, []);
    	let { c = "" } = $$props; // deprecated
    	let { alt = "" } = $$props;
    	let { width = null } = $$props;
    	let { height = null } = $$props;
    	let { src = "" } = $$props;
    	let { srcset = "" } = $$props;
    	let { srcsetWebp = "" } = $$props;
    	let { ratio = "100%" } = $$props;
    	let { blur = true } = $$props;
    	let { sizes = "(max-width: 1000px) 100vw, 1000px" } = $$props;
    	let { offset = 0 } = $$props;
    	let { threshold = 1 } = $$props;
    	let { lazy = true } = $$props;
    	let { wrapperClass = "" } = $$props;
    	let { placeholderClass = "" } = $$props;
    	let { blurhash = null } = $$props;
    	let { blurhashSize = null } = $$props;
    	let { class: className = "" } = $$props;
    	let loaded = !lazy;

    	function load(img) {
    		img.onload = () => $$invalidate(18, loaded = true);
    	}

    	function decodeBlurhash(canvas) {
    		const pixels = dist.decode(blurhash, blurhashSize.width, blurhashSize.height);
    		const ctx = canvas.getContext("2d");
    		const imageData = ctx.createImageData(blurhashSize.width, blurhashSize.height);
    		imageData.data.set(pixels);
    		ctx.putImageData(imageData, 0, 0);
    	}

    	const writable_props = [
    		"c",
    		"alt",
    		"width",
    		"height",
    		"src",
    		"srcset",
    		"srcsetWebp",
    		"ratio",
    		"blur",
    		"sizes",
    		"offset",
    		"threshold",
    		"lazy",
    		"wrapperClass",
    		"placeholderClass",
    		"blurhash",
    		"blurhashSize",
    		"class"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Image> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("src" in $$props) $$invalidate(4, src = $$props.src);
    		if ("srcset" in $$props) $$invalidate(5, srcset = $$props.srcset);
    		if ("srcsetWebp" in $$props) $$invalidate(6, srcsetWebp = $$props.srcsetWebp);
    		if ("ratio" in $$props) $$invalidate(7, ratio = $$props.ratio);
    		if ("blur" in $$props) $$invalidate(8, blur = $$props.blur);
    		if ("sizes" in $$props) $$invalidate(9, sizes = $$props.sizes);
    		if ("offset" in $$props) $$invalidate(10, offset = $$props.offset);
    		if ("threshold" in $$props) $$invalidate(11, threshold = $$props.threshold);
    		if ("lazy" in $$props) $$invalidate(12, lazy = $$props.lazy);
    		if ("wrapperClass" in $$props) $$invalidate(13, wrapperClass = $$props.wrapperClass);
    		if ("placeholderClass" in $$props) $$invalidate(14, placeholderClass = $$props.placeholderClass);
    		if ("blurhash" in $$props) $$invalidate(15, blurhash = $$props.blurhash);
    		if ("blurhashSize" in $$props) $$invalidate(16, blurhashSize = $$props.blurhashSize);
    		if ("class" in $$props) $$invalidate(17, className = $$props.class);
    	};

    	$$self.$capture_state = () => ({
    		decode: dist.decode,
    		Waypoint,
    		c,
    		alt,
    		width,
    		height,
    		src,
    		srcset,
    		srcsetWebp,
    		ratio,
    		blur,
    		sizes,
    		offset,
    		threshold,
    		lazy,
    		wrapperClass,
    		placeholderClass,
    		blurhash,
    		blurhashSize,
    		className,
    		loaded,
    		load,
    		decodeBlurhash
    	});

    	$$self.$inject_state = $$props => {
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("src" in $$props) $$invalidate(4, src = $$props.src);
    		if ("srcset" in $$props) $$invalidate(5, srcset = $$props.srcset);
    		if ("srcsetWebp" in $$props) $$invalidate(6, srcsetWebp = $$props.srcsetWebp);
    		if ("ratio" in $$props) $$invalidate(7, ratio = $$props.ratio);
    		if ("blur" in $$props) $$invalidate(8, blur = $$props.blur);
    		if ("sizes" in $$props) $$invalidate(9, sizes = $$props.sizes);
    		if ("offset" in $$props) $$invalidate(10, offset = $$props.offset);
    		if ("threshold" in $$props) $$invalidate(11, threshold = $$props.threshold);
    		if ("lazy" in $$props) $$invalidate(12, lazy = $$props.lazy);
    		if ("wrapperClass" in $$props) $$invalidate(13, wrapperClass = $$props.wrapperClass);
    		if ("placeholderClass" in $$props) $$invalidate(14, placeholderClass = $$props.placeholderClass);
    		if ("blurhash" in $$props) $$invalidate(15, blurhash = $$props.blurhash);
    		if ("blurhashSize" in $$props) $$invalidate(16, blurhashSize = $$props.blurhashSize);
    		if ("className" in $$props) $$invalidate(17, className = $$props.className);
    		if ("loaded" in $$props) $$invalidate(18, loaded = $$props.loaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		c,
    		alt,
    		width,
    		height,
    		src,
    		srcset,
    		srcsetWebp,
    		ratio,
    		blur,
    		sizes,
    		offset,
    		threshold,
    		lazy,
    		wrapperClass,
    		placeholderClass,
    		blurhash,
    		blurhashSize,
    		className,
    		loaded,
    		load,
    		decodeBlurhash
    	];
    }

    class Image extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			c: 0,
    			alt: 1,
    			width: 2,
    			height: 3,
    			src: 4,
    			srcset: 5,
    			srcsetWebp: 6,
    			ratio: 7,
    			blur: 8,
    			sizes: 9,
    			offset: 10,
    			threshold: 11,
    			lazy: 12,
    			wrapperClass: 13,
    			placeholderClass: 14,
    			blurhash: 15,
    			blurhashSize: 16,
    			class: 17
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Image",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get c() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get src() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srcset() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srcset(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srcsetWebp() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srcsetWebp(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ratio() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ratio(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blur() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blur(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sizes() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sizes(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offset() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get threshold() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set threshold(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lazy() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lazy(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wrapperClass() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wrapperClass(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholderClass() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholderClass(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blurhash() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blurhash(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blurhashSize() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blurhashSize(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }
    function crossfade(_a) {
        var { fallback } = _a, defaults = __rest(_a, ["fallback"]);
        const to_receive = new Map();
        const to_send = new Map();
        function crossfade(from, node, params) {
            const { delay = 0, duration = d => Math.sqrt(d) * 30, easing = cubicOut } = assign(assign({}, defaults), params);
            const to = node.getBoundingClientRect();
            const dx = from.left - to.left;
            const dy = from.top - to.top;
            const dw = from.width / to.width;
            const dh = from.height / to.height;
            const d = Math.sqrt(dx * dx + dy * dy);
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            const opacity = +style.opacity;
            return {
                delay,
                duration: is_function(duration) ? duration(d) : duration,
                easing,
                css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
            };
        }
        function transition(items, counterparts, intro) {
            return (node, params) => {
                items.set(params.key, {
                    rect: node.getBoundingClientRect()
                });
                return () => {
                    if (counterparts.has(params.key)) {
                        const { rect } = counterparts.get(params.key);
                        counterparts.delete(params.key);
                        return crossfade(rect, node, params);
                    }
                    // if the node is disappearing altogether
                    // (i.e. wasn't claimed by the other list)
                    // then we need to supply an outro
                    items.delete(params.key);
                    return fallback && fallback(node, params, intro);
                };
            };
        }
        return [
            transition(to_send, to_receive, false),
            transition(to_receive, to_send, true)
        ];
    }

    /* src/App.svelte generated by Svelte v3.31.0 */
    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	let div0;
    	let h1;
    	let t1;
    	let div1;
    	let image0;
    	let t2;
    	let image1;
    	let t3;
    	let image2;
    	let t4;
    	let image3;
    	let current;

    	image0 = new Image({
    			props: {
    				src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgxIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTAgMTQxdjE0MGgxODBsNC0yYzMtMiA2LTMgNy0ybDEtMSAzLTEgMTEtNyAxLTEgOS04YTUzNzYgNTM3NiAwIDAwMjQtMjFsNS0zIDUtM2gxbDMtMSAzLTIgMi0xIDctNSA1LTMgNC0zYzMtMSA2LTMgNy01bDQtMyAxLTEgMi00IDUtMTEgNy0xN2M2LTEzIDEyLTIyIDE1LTIybDMtMSAxLTFoMWMyLTIgMi0yIDIgMGwxIDIgMi0yIDItMmgybDItMSAxLTFjLTEtMiA3LTEwIDgtMTBsMy0zIDMtNHYtMWwxLTIgNS03YTEyNjAgMTI2MCAwIDAxOS0xOGwxLTVjMy0zIDYtMTIgNi0xNWwxLTQgMy02IDMtNnYtM2wxLTFoMWMtMS0xIDAtNCAyLThsNC0xMmEyMDcgMjA3IDAgMDExMS0zNHYxbDEtMmMtMS0xIDAtMyAxLTRsMS0zLTE5OS0xSDB2MTQxTTM5MyAxNGMtMSAxLTEgMSAwIDBsMS0yLTEgMiIgZmlsbD0iIzAwMmZhNyIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+",
    				srcset: "g/images/bored-400.png 375w,g/images/bored-800.png 768w,g/images/bored-1200.png 1024w",
    				ratio: "56.25%",
    				srcsetWebp: "g/images/bored-400.webp 375w,g/images/bored-800.webp 768w,g/images/bored-1200.webp 1024w",
    				alt: "wallpaper"
    			},
    			$$inline: true
    		});

    	image1 = new Image({
    			props: {
    				src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgxIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTAgMTQxdjE0MGg1MDFWMEgwdjE0MW0wIDQxIiBmaWxsPSIjMDAyZmE3IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=",
    				srcset: "g/images/wallpaper-2-2560x1440-400.png 375w,g/images/wallpaper-2-2560x1440-800.png 768w,g/images/wallpaper-2-2560x1440-1200.png 1024w",
    				ratio: "56.25%",
    				srcsetWebp: "g/images/wallpaper-2-2560x1440-400.webp 375w,g/images/wallpaper-2-2560x1440-800.webp 768w,g/images/wallpaper-2-2560x1440-1200.webp 1024w",
    				alt: "wallpaper"
    			},
    			$$inline: true
    		});

    	image2 = new Image({
    			props: {
    				src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgxIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQwMyA1YTEzMiAxMzIgMCAwMDEyIDQxbDMgNiAxIDVjMSA0IDUgMTAgNyAxMGE5NiA5NiAwIDAxMjIgMTdsNSA0aDVsMiAyYzEgMSAyIDAgMi00czAtNSAyLTZjMy0zIDgtMSAxNCAzbDUgNCA1IDJhNDExIDQxMSAwIDAwMTEgMTBsMS01MFYwaC05OGwxIDUiIGZpbGw9IiMwMDJmYTciIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==",
    				srcset: "g/images/wallpaper-3-2560x1440-400.png 375w,g/images/wallpaper-3-2560x1440-800.png 768w,g/images/wallpaper-3-2560x1440-1200.png 1024w",
    				ratio: "56.25%",
    				srcsetWebp: "g/images/wallpaper-3-2560x1440-400.webp 375w,g/images/wallpaper-3-2560x1440-800.webp 768w,g/images/wallpaper-3-2560x1440-1200.webp 1024w",
    				alt: "wallpaper"
    			},
    			$$inline: true
    		});

    	image3 = new Image({
    			props: {
    				src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgxIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTAgMTQxdjE0MGg3N2ExMTkwIDExOTAgMCAwMDgzLTNsMS0xIDEtMiAxLTIgMS0xYzIgMSAzLTEgNC0zbDMtMmMxIDAgMiAwIDEtMWwxLTIgMi0ydi0yaDJjMSAxIDEgMSAxLTEtMS0yLTEtMyAxLTIgMiAwIDIgMCAyLTN2LTNjMSAxIDEgMCAyLTFoMWwxLTJjMS0zIDEtMyAyLTJzMiAxIDMtMWMwLTQgMS04IDItN2gyYzAtMyAxLTIgMyAwbDEgMy0xLTNjMC0yIDAtMiAxLTFsMS0xaC0ybC0xLTF2LTFsMS0xIDEtM2MxLTMgMi0zIDQtMyAxIDAgNi01IDgtMTBsMy02YzEgMCAxIDMtMSA1aDFsMS0zIDEtMXYtMWwtMS0yIDEtMmMxIDEgMyAwIDQtMXYtMWwtMiAyYy0yIDItMS0yIDEtNSAzLTQgNC01IDUtNHYtMWwtMS0xdi0xbDMtMnYzbDEtMmMxLTEtMS0zLTItMmwtMS0xaDNsMi0xIDEtMXYtMWwxLTMgMSAxdjFsMS0zdi0xbDEtMyAxLTR2LTNsMiAyIDEgMSAyLTN2LTNjMC0yLTIgMC0yIDJzMCAyLTEgMSAwLTIgMS0zbDEtMyA3LTE3IDQtNCAyLTJoMWwtMSAzYy0yIDAtMiAyLTIgMyAxIDAgMSAxIDAgMGwtMSAxYzAgMSAxIDIgMyAxdi00YzIgMSA0IDAgNS0zIDAtMyAwLTMtMS0ybC0xLTEgMi0xaDJsMS0xIDEtMyAyLTIgMi01YzEgMSAzLTMgMy03di0zYzIgMiA0IDEgNC0xYTUyIDUyIDAgMDEzLTZsMS0yYzAgMiA0LTQgNS01bDEtMSAzLTJjMi0yIDItMiAwLTJsLTEgMmgtM2wxLTIgMi0ydi0ybDEgMWMwIDIgMCAyIDEgMWw0LTFjMSAxIDIgMCAyLTNsMi00IDItM2MwLTMgMy03IDMtN2wxLTNjLTEtMiAwLTMgMS0ydjJjMCAyIDIgMCAyLTIgMC0xIDAtMi0xLTF2LTJsMS0zaDFsMS0xdi0zYzIgMCAxIDMgMCA1cy0yIDMtMSA0IDEgMCAyLTNsMi01IDQtOGMzLTcgNS0xMSA5LTE2bDctNyA3LTkgNS02Yy0yIDAtMiAwLTEtMWwzLTJ2LTFjLTEtMS0yLTItMS0zczAtMi0xLTNsLTItMy0zLTUtNC0zSDB2MTQxbTI5MC01MmwyIDEgMS0xLTEtMi0yIDJtLTUgNmMwIDIgMyAzIDQgMWwxLTEgMS0xYy0yLTItNi0xLTYgMW0yIDB2MWwxLTF2LTFsLTEgMW0tOSA3bC0xIDMgMi0yYzEtNCAxLTQtMS0xbS0yIDZsLTEgMyAyLTIgMi0zLTMgMm0tNiAzbC0xIDMgMi0yIDItMy0zIDJtLTggMTVjLTEgMS0xIDEgMCAwaDN2LTFjLTEtMS0xLTEtMyAxbTcgMGMtMSAxLTEgMSAwIDBsMS0yLTEgMm0tMTMgOHY0aC0ybDEgMSAzLTIgMi0xIDEtMWMwLTItMS0yLTMgMGgtMWMxLTEgMC0yLTEtMW0tMTIgMjFjLTQgOC02IDE0LTQgMTRsMS0xdi0zbDEtMnYtMmgxbDItMWMxLTEgMC0xIDAgMC0yIDAtMiAwLTEtMyAxLTIgMS0yIDItMXMyIDAgMi0xYzAtMiAwLTItMS0xaC0xbDEtMyAxLTMtNCA3bS0xMyAzM3YybDEtMWMxLTIgMC0zLTEtMW0tMTEgMTRsLTIgMyAyLTMgMi0zcy0yIDEtMiAzbS0xMSAxOWMtMiAzLTIgNCAwIDJsMS0zaDFsMS0xYy0xLTItMi0xLTMgMm0tMTcgMjF2MWwxLTMtMSAyIiBmaWxsPSIjMDAyZmE3IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=",
    				srcset: "g/images/wallpaper-4-2560x1440-400.png 375w,g/images/wallpaper-4-2560x1440-800.png 768w,g/images/wallpaper-4-2560x1440-1200.png 1024w",
    				ratio: "56.25%",
    				srcsetWebp: "g/images/wallpaper-4-2560x1440-400.webp 375w,g/images/wallpaper-4-2560x1440-800.webp 768w,g/images/wallpaper-4-2560x1440-1200.webp 1024w",
    				alt: "wallpaper"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Scroll - Click - Save";
    			t1 = space();
    			div1 = element("div");
    			create_component(image0.$$.fragment);
    			t2 = space();
    			create_component(image1.$$.fragment);
    			t3 = space();
    			create_component(image2.$$.fragment);
    			t4 = space();
    			create_component(image3.$$.fragment);
    			add_location(h1, file$2, 40, 4, 809);
    			attr_dev(div0, "class", "title svelte-nyszma");
    			add_location(div0, file$2, 39, 0, 785);
    			attr_dev(div1, "class", "wallpapers svelte-nyszma");
    			add_location(div1, file$2, 43, 0, 848);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(image0, div1, null);
    			append_dev(div1, t2);
    			mount_component(image1, div1, null);
    			append_dev(div1, t3);
    			mount_component(image2, div1, null);
    			append_dev(div1, t4);
    			mount_component(image3, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(image0.$$.fragment, local);
    			transition_in(image1.$$.fragment, local);
    			transition_in(image2.$$.fragment, local);
    			transition_in(image3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(image0.$$.fragment, local);
    			transition_out(image1.$$.fragment, local);
    			transition_out(image2.$$.fragment, local);
    			transition_out(image3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_component(image0);
    			destroy_component(image1);
    			destroy_component(image2);
    			destroy_component(image3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const [send, receive] = crossfade({ duration: 200, fallback: scale });
    	let selected = null;
    	let loading = null;

    	const load = image => {
    		const timeout = setTimeout(() => loading = image, 100);
    		const img = new Image();

    		img.onload = () => {
    			selected = image;
    			clearTimeout(timeout);
    			loading = null;
    		};
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Image,
    		crossfade,
    		scale,
    		send,
    		receive,
    		selected,
    		loading,
    		load
    	});

    	$$self.$inject_state = $$props => {
    		if ("selected" in $$props) selected = $$props.selected;
    		if ("loading" in $$props) loading = $$props.loading;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
