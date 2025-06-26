
/*!*************************************************************************
 * Copyright 2021 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it. 
 **************************************************************************/

(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    /**
     * Copyright 2023 Adobe
     * All Rights Reserved.
     *
     * NOTICE: Adobe permits you to use, modify, and distribute this file in
     * accordance with the terms of the Adobe license agreement accompanying
     * it.
     */
    // From https://github.com/josdejong/workerpool/blob/master/src/worker.js#L76-L83
    function serializeError(error) {
        return Object.getOwnPropertyNames(error).reduce(function (product, name) {
            return Object.defineProperty(product, name, {
                value: error[name],
                enumerable: true,
            });
        }, {});
    }

    /**
     * Copyright 2023 Adobe
     * All Rights Reserved.
     *
     * NOTICE: Adobe permits you to use, modify, and distribute this file in
     * accordance with the terms of the Adobe license agreement accompanying
     * it.
     */
    function setupWorker(methods) {
        onmessage = async (e) => {
            const { args, method } = e.data;
            try {
                const res = await methods[method](...args);
                postMessage({
                    type: 'success',
                    data: res,
                });
            }
            catch (error) {
                postMessage({
                    type: 'error',
                    error: serializeError(error),
                });
            }
        };
    }

    let wasm$1;

    const cachedTextDecoder$1 = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

    cachedTextDecoder$1.decode();

    let cachedUint8Memory0 = new Uint8Array();

    function getUint8Memory0() {
        if (cachedUint8Memory0.byteLength === 0) {
            cachedUint8Memory0 = new Uint8Array(wasm$1.memory.buffer);
        }
        return cachedUint8Memory0;
    }

    function getStringFromWasm0$1(ptr, len) {
        return cachedTextDecoder$1.decode(getUint8Memory0().subarray(ptr, ptr + len));
    }

    let WASM_VECTOR_LEN$1 = 0;

    const cachedTextEncoder$1 = new TextEncoder('utf-8');

    const encodeString$1 = (typeof cachedTextEncoder$1.encodeInto === 'function'
        ? function (arg, view) {
        return cachedTextEncoder$1.encodeInto(arg, view);
    }
        : function (arg, view) {
        const buf = cachedTextEncoder$1.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });

    function passStringToWasm0$1(arg, malloc, realloc) {

        if (realloc === undefined) {
            const buf = cachedTextEncoder$1.encode(arg);
            const ptr = malloc(buf.length);
            getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN$1 = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len);

        const mem = getUint8Memory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }

        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3);
            const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
            const ret = encodeString$1(arg, view);

            offset += ret.written;
        }

        WASM_VECTOR_LEN$1 = offset;
        return ptr;
    }

    function isLikeNone$1(x) {
        return x === undefined || x === null;
    }

    let cachedInt32Memory0 = new Int32Array();

    function getInt32Memory0() {
        if (cachedInt32Memory0.byteLength === 0) {
            cachedInt32Memory0 = new Int32Array(wasm$1.memory.buffer);
        }
        return cachedInt32Memory0;
    }

    let cachedFloat64Memory0 = new Float64Array();

    function getFloat64Memory0() {
        if (cachedFloat64Memory0.byteLength === 0) {
            cachedFloat64Memory0 = new Float64Array(wasm$1.memory.buffer);
        }
        return cachedFloat64Memory0;
    }

    function debugString$1(val) {
        // primitive types
        const type = typeof val;
        if (type == 'number' || type == 'boolean' || val == null) {
            return  `${val}`;
        }
        if (type == 'string') {
            return `"${val}"`;
        }
        if (type == 'symbol') {
            const description = val.description;
            if (description == null) {
                return 'Symbol';
            } else {
                return `Symbol(${description})`;
            }
        }
        if (type == 'function') {
            const name = val.name;
            if (typeof name == 'string' && name.length > 0) {
                return `Function(${name})`;
            } else {
                return 'Function';
            }
        }
        // objects
        if (Array.isArray(val)) {
            const length = val.length;
            let debug = '[';
            if (length > 0) {
                debug += debugString$1(val[0]);
            }
            for(let i = 1; i < length; i++) {
                debug += ', ' + debugString$1(val[i]);
            }
            debug += ']';
            return debug;
        }
        // Test for built-in
        const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
        let className;
        if (builtInMatches.length > 1) {
            className = builtInMatches[1];
        } else {
            // Failed to match the standard '[object ClassName]'
            return toString.call(val);
        }
        if (className == 'Object') {
            // we're a user defined class or Object
            // JSON.stringify avoids problems with cycles, and is generally much
            // easier than looping through ownProperties of `val`.
            try {
                return 'Object(' + JSON.stringify(val) + ')';
            } catch (_) {
                return 'Object';
            }
        }
        // errors
        if (val instanceof Error) {
            return `${val.name}: ${val.message}\n${val.stack}`;
        }
        // TODO we could test for more things here, like `Set`s and `Map`s.
        return className;
    }

    function takeFromExternrefTable0(idx) {
        const value = wasm$1.__wbindgen_export_2.get(idx);
        wasm$1.__externref_table_dealloc(idx);
        return value;
    }
    /**
    * @param {any} buf
    * @returns {number}
    */
    function scan_array_buffer(buf) {
        try {
            const retptr = wasm$1.__wbindgen_add_to_stack_pointer(-16);
            wasm$1.scan_array_buffer(retptr, buf);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeFromExternrefTable0(r1);
            }
            return r0 >>> 0;
        } finally {
            wasm$1.__wbindgen_add_to_stack_pointer(16);
        }
    }

    async function load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    if (module.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    function getImports() {
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbg_isArray_27c46c67f498e15d = function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        };
        imports.wbg.__wbg_length_6e3bbe7c8bd4dbd8 = function(arg0) {
            const ret = arg0.length;
            return ret;
        };
        imports.wbg.__wbg_get_57245cc7d7c7619d = function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        };
        imports.wbg.__wbg_isSafeInteger_dfa0593e8d7ac35a = function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        };
        imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
            const ret = getStringFromWasm0$1(arg0, arg1);
            return ret;
        };
        imports.wbg.__wbg_new_abda76e883ba8a5f = function() {
            const ret = new Error();
            return ret;
        };
        imports.wbg.__wbg_stack_658279fe44541cf6 = function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr0 = passStringToWasm0$1(ret, wasm$1.__wbindgen_malloc, wasm$1.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN$1;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        };
        imports.wbg.__wbg_error_f851667af71bcfc6 = function(arg0, arg1) {
            try {
                console.error(getStringFromWasm0$1(arg0, arg1));
            } finally {
                wasm$1.__wbindgen_free(arg0, arg1);
            }
        };
        imports.wbg.__wbg_length_9e1ae1900cb0fbd5 = function(arg0) {
            const ret = arg0.length;
            return ret;
        };
        imports.wbg.__wbindgen_memory = function() {
            const ret = wasm$1.memory;
            return ret;
        };
        imports.wbg.__wbg_buffer_3f3d764d4747d564 = function(arg0) {
            const ret = arg0.buffer;
            return ret;
        };
        imports.wbg.__wbg_new_8c3f0052272a457a = function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        };
        imports.wbg.__wbg_set_83db9690f9353e79 = function(arg0, arg1, arg2) {
            arg0.set(arg1, arg2 >>> 0);
        };
        imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0$1(arg0, arg1));
            return ret;
        };
        imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        };
        imports.wbg.__wbindgen_boolean_get = function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
            return ret;
        };
        imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr0 = isLikeNone$1(ret) ? 0 : passStringToWasm0$1(ret, wasm$1.__wbindgen_malloc, wasm$1.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN$1;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        };
        imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone$1(ret) ? 0 : ret;
            getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone$1(ret);
        };
        imports.wbg.__wbg_instanceof_Uint8Array_971eeda69eb75003 = function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_instanceof_ArrayBuffer_e5e48f4762c5610b = function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
            const ret = debugString$1(arg1);
            const ptr0 = passStringToWasm0$1(ret, wasm$1.__wbindgen_malloc, wasm$1.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN$1;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        };
        imports.wbg.__wbindgen_throw = function(arg0, arg1) {
            throw new Error(getStringFromWasm0$1(arg0, arg1));
        };
        imports.wbg.__wbindgen_init_externref_table = function() {
            const table = wasm$1.__wbindgen_export_2;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        };

        return imports;
    }

    function finalizeInit(instance, module) {
        wasm$1 = instance.exports;
        init.__wbindgen_wasm_module = module;
        cachedFloat64Memory0 = new Float64Array();
        cachedInt32Memory0 = new Int32Array();
        cachedUint8Memory0 = new Uint8Array();

        wasm$1.__wbindgen_start();
        return wasm$1;
    }

    async function init(input) {
        if (typeof input === 'undefined') {
            input = new URL('detector_bg.wasm', (typeof document === 'undefined' && typeof location === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : typeof document === 'undefined' ? location.href : (document.currentScript && document.currentScript.src || new URL('c2pa.worker.js', document.baseURI).href)));
        }
        const imports = getImports();

        if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
            input = fetch(input);
        }

        const { instance, module } = await load(await input, imports);

        return finalizeInit(instance, module);
    }

    let wasm;

    let WASM_VECTOR_LEN = 0;

    let cachedUint8ArrayMemory0 = null;

    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

    const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
        ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
        : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });

    function passStringToWasm0(arg, malloc, realloc) {

        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }

        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = encodeString(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    let cachedDataViewMemory0 = null;

    function getDataViewMemory0() {
        if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
            cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
        }
        return cachedDataViewMemory0;
    }

    const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

    if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); }
    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    function addToExternrefTable0(obj) {
        const idx = wasm.__externref_table_alloc();
        wasm.__wbindgen_export_4.set(idx, obj);
        return idx;
    }

    function handleError(f, args) {
        try {
            return f.apply(this, args);
        } catch (e) {
            const idx = addToExternrefTable0(e);
            wasm.__wbindgen_exn_store(idx);
        }
    }

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(state => {
        wasm.__wbindgen_export_6.get(state.dtor)(state.a, state.b);
    });

    function makeMutClosure(arg0, arg1, dtor, f) {
        const state = { a: arg0, b: arg1, cnt: 1, dtor };
        const real = (...args) => {
            // First up with a closure we increment the internal reference
            // count. This ensures that the Rust closure environment won't
            // be deallocated while we're invoking it.
            state.cnt++;
            const a = state.a;
            state.a = 0;
            try {
                return f(a, state.b, ...args);
            } finally {
                if (--state.cnt === 0) {
                    wasm.__wbindgen_export_6.get(state.dtor)(a, state.b);
                    CLOSURE_DTORS.unregister(state);
                } else {
                    state.a = a;
                }
            }
        };
        real.original = state;
        CLOSURE_DTORS.register(real, state, state);
        return real;
    }

    function debugString(val) {
        // primitive types
        const type = typeof val;
        if (type == 'number' || type == 'boolean' || val == null) {
            return  `${val}`;
        }
        if (type == 'string') {
            return `"${val}"`;
        }
        if (type == 'symbol') {
            const description = val.description;
            if (description == null) {
                return 'Symbol';
            } else {
                return `Symbol(${description})`;
            }
        }
        if (type == 'function') {
            const name = val.name;
            if (typeof name == 'string' && name.length > 0) {
                return `Function(${name})`;
            } else {
                return 'Function';
            }
        }
        // objects
        if (Array.isArray(val)) {
            const length = val.length;
            let debug = '[';
            if (length > 0) {
                debug += debugString(val[0]);
            }
            for(let i = 1; i < length; i++) {
                debug += ', ' + debugString(val[i]);
            }
            debug += ']';
            return debug;
        }
        // Test for built-in
        const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
        let className;
        if (builtInMatches && builtInMatches.length > 1) {
            className = builtInMatches[1];
        } else {
            // Failed to match the standard '[object ClassName]'
            return toString.call(val);
        }
        if (className == 'Object') {
            // we're a user defined class or Object
            // JSON.stringify avoids problems with cycles, and is generally much
            // easier than looping through ownProperties of `val`.
            try {
                return 'Object(' + JSON.stringify(val) + ')';
            } catch (_) {
                return 'Object';
            }
        }
        // errors
        if (val instanceof Error) {
            return `${val.name}: ${val.message}\n${val.stack}`;
        }
        // TODO we could test for more things here, like `Set`s and `Map`s.
        return className;
    }

    /**
     * @param {any} buf
     * @param {string} mime_type
     * @param {string | null} [settings]
     * @returns {Promise<any>}
     */
    function getManifestStoreFromArrayBuffer(buf, mime_type, settings) {
        const ptr0 = passStringToWasm0(mime_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(settings) ? 0 : passStringToWasm0(settings, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.getManifestStoreFromArrayBuffer(buf, ptr0, len0, ptr1, len1);
        return ret;
    }

    /**
     * @param {any} manifest_buffer
     * @param {any} asset_buffer
     * @param {string} mime_type
     * @param {string | null} [settings]
     * @returns {Promise<any>}
     */
    function getManifestStoreFromManifestAndAsset(manifest_buffer, asset_buffer, mime_type, settings) {
        const ptr0 = passStringToWasm0(mime_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(settings) ? 0 : passStringToWasm0(settings, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.getManifestStoreFromManifestAndAsset(manifest_buffer, asset_buffer, ptr0, len0, ptr1, len1);
        return ret;
    }

    function __wbg_adapter_42(arg0, arg1) {
        wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hdf1aa2ae8c2db550(arg0, arg1);
    }

    function __wbg_adapter_45(arg0, arg1, arg2) {
        wasm.closure493_externref_shim(arg0, arg1, arg2);
    }

    function __wbg_adapter_99(arg0, arg1, arg2, arg3) {
        wasm.closure303_externref_shim(arg0, arg1, arg2, arg3);
    }

    const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];

    const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    if (module.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    function __wbg_get_imports() {
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbg_abort_410ec47a64ac6117 = function(arg0, arg1) {
            arg0.abort(arg1);
        };
        imports.wbg.__wbg_abort_775ef1d17fc65868 = function(arg0) {
            arg0.abort();
        };
        imports.wbg.__wbg_append_8c7dd8d641a5f01b = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments) };
        imports.wbg.__wbg_arrayBuffer_d1b44c4390db422f = function() { return handleError(function (arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        }, arguments) };
        imports.wbg.__wbg_buffer_609cc3eee51ed158 = function(arg0) {
            const ret = arg0.buffer;
            return ret;
        };
        imports.wbg.__wbg_call_672a4d21634d4a24 = function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_clearTimeout_86721db0036bea98 = function(arg0) {
            const ret = clearTimeout(arg0);
            return ret;
        };
        imports.wbg.__wbg_debug_e17b51583ca6a632 = function(arg0, arg1, arg2, arg3) {
            console.debug(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_done_769e5ede4b31c67b = function(arg0) {
            const ret = arg0.done;
            return ret;
        };
        imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        };
        imports.wbg.__wbg_error_80de38b3f7cc3c3c = function(arg0, arg1, arg2, arg3) {
            console.error(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_fetch_509096533071c657 = function(arg0, arg1) {
            const ret = arg0.fetch(arg1);
            return ret;
        };
        imports.wbg.__wbg_fetch_d36a73832f0a45e8 = function(arg0) {
            const ret = fetch(arg0);
            return ret;
        };
        imports.wbg.__wbg_from_2a5d3e218e67aa85 = function(arg0) {
            const ret = Array.from(arg0);
            return ret;
        };
        imports.wbg.__wbg_get_67b2ba62fc30de12 = function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_get_b9b93047fe3cf45b = function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        };
        imports.wbg.__wbg_has_a5ea9117f258a0ec = function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(arg0, arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_headers_9cb51cfd2ac780a4 = function(arg0) {
            const ret = arg0.headers;
            return ret;
        };
        imports.wbg.__wbg_info_033d8b8a0838f1d3 = function(arg0, arg1, arg2, arg3) {
            console.info(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_instanceof_ArrayBuffer_e14585432e3737fc = function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_instanceof_Response_f2cc20d9f7dfd644 = function(arg0) {
            let result;
            try {
                result = arg0 instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_isArray_a1eab7e0d067391b = function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        };
        imports.wbg.__wbg_isSafeInteger_343e2beeeece1bb0 = function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        };
        imports.wbg.__wbg_iterator_9a24c88df860dc65 = function() {
            const ret = Symbol.iterator;
            return ret;
        };
        imports.wbg.__wbg_length_a446193dc22c12f8 = function(arg0) {
            const ret = arg0.length;
            return ret;
        };
        imports.wbg.__wbg_length_e2d2a49132c1b256 = function(arg0) {
            const ret = arg0.length;
            return ret;
        };
        imports.wbg.__wbg_log_cad59bb680daec67 = function(arg0, arg1, arg2, arg3) {
            console.log(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_new_018dcc2d6c8c2f6a = function() { return handleError(function () {
            const ret = new Headers();
            return ret;
        }, arguments) };
        imports.wbg.__wbg_new_23a2665fac83c611 = function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wbg_adapter_99(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = state0.b = 0;
            }
        };
        imports.wbg.__wbg_new_405e22f390576ce2 = function() {
            const ret = new Object();
            return ret;
        };
        imports.wbg.__wbg_new_5e0be73521bc8c17 = function() {
            const ret = new Map();
            return ret;
        };
        imports.wbg.__wbg_new_78feb108b6472713 = function() {
            const ret = new Array();
            return ret;
        };
        imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
            const ret = new Error();
            return ret;
        };
        imports.wbg.__wbg_new_a12002a7f91c75be = function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        };
        imports.wbg.__wbg_new_c68d7209be747379 = function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        };
        imports.wbg.__wbg_new_e25e5aab09ff45db = function() { return handleError(function () {
            const ret = new AbortController();
            return ret;
        }, arguments) };
        imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function(arg0, arg1) {
            const ret = new Function(getStringFromWasm0(arg0, arg1));
            return ret;
        };
        imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function(arg0, arg1, arg2) {
            const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        };
        imports.wbg.__wbg_newwithstrandinit_06c535e0a867c635 = function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_next_25feadfc0913fea9 = function(arg0) {
            const ret = arg0.next;
            return ret;
        };
        imports.wbg.__wbg_next_6574e1a8a62d1055 = function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments) };
        imports.wbg.__wbg_now_807e54c39636c349 = function() {
            const ret = Date.now();
            return ret;
        };
        imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function(arg0) {
            queueMicrotask(arg0);
        };
        imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        };
        imports.wbg.__wbg_resolve_4851785c9c5f573d = function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        };
        imports.wbg.__wbg_setTimeout_2e707715f8cc9497 = function(arg0, arg1) {
            const ret = setTimeout(arg0, arg1);
            return ret;
        };
        imports.wbg.__wbg_set_37837023f3d740e8 = function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        };
        imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        };
        imports.wbg.__wbg_set_65595bdd868b3009 = function(arg0, arg1, arg2) {
            arg0.set(arg1, arg2 >>> 0);
        };
        imports.wbg.__wbg_set_8fc6bf8a5b1071d1 = function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        };
        imports.wbg.__wbg_set_bb8cecf6a62b9f46 = function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_setbody_5923b78a95eedf29 = function(arg0, arg1) {
            arg0.body = arg1;
        };
        imports.wbg.__wbg_setcredentials_c3a22f1cd105a2c6 = function(arg0, arg1) {
            arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
        };
        imports.wbg.__wbg_setheaders_834c0bdb6a8949ad = function(arg0, arg1) {
            arg0.headers = arg1;
        };
        imports.wbg.__wbg_setmethod_3c5280fe5d890842 = function(arg0, arg1, arg2) {
            arg0.method = getStringFromWasm0(arg1, arg2);
        };
        imports.wbg.__wbg_setmode_5dc300b865044b65 = function(arg0, arg1) {
            arg0.mode = __wbindgen_enum_RequestMode[arg1];
        };
        imports.wbg.__wbg_setname_6df54b7ebf9404a9 = function(arg0, arg1, arg2) {
            arg0.name = getStringFromWasm0(arg1, arg2);
        };
        imports.wbg.__wbg_setsignal_75b21ef3a81de905 = function(arg0, arg1) {
            arg0.signal = arg1;
        };
        imports.wbg.__wbg_signal_aaf9ad74119f20a4 = function(arg0) {
            const ret = arg0.signal;
            return ret;
        };
        imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        };
        imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        };
        imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        };
        imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        };
        imports.wbg.__wbg_status_f6360336ca686bf0 = function(arg0) {
            const ret = arg0.status;
            return ret;
        };
        imports.wbg.__wbg_stringify_f7ed6987935b4a24 = function() { return handleError(function (arg0) {
            const ret = JSON.stringify(arg0);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_then_44b73946d2fb3e7d = function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        };
        imports.wbg.__wbg_then_48b406749878a531 = function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        };
        imports.wbg.__wbg_url_ae10c34ca209681d = function(arg0, arg1) {
            const ret = arg1.url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbg_value_cd1ffa7b1ab794f1 = function(arg0) {
            const ret = arg0.value;
            return ret;
        };
        imports.wbg.__wbg_warn_aaf1f4664a035bd6 = function(arg0, arg1, arg2, arg3) {
            console.warn(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbindgen_as_number = function(arg0) {
            const ret = +arg0;
            return ret;
        };
        imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        };
        imports.wbg.__wbindgen_boolean_get = function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
            return ret;
        };
        imports.wbg.__wbindgen_cb_drop = function(arg0) {
            const obj = arg0.original;
            if (obj.cnt-- == 1) {
                obj.a = 0;
                return true;
            }
            const ret = false;
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper7439 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 459, __wbg_adapter_42);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper7860 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 459, __wbg_adapter_45);
            return ret;
        };
        imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        };
        imports.wbg.__wbindgen_init_externref_table = function() {
            const table = wasm.__wbindgen_export_4;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        };
        imports.wbg.__wbindgen_is_function = function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        };
        imports.wbg.__wbindgen_is_object = function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        };
        imports.wbg.__wbindgen_is_string = function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        };
        imports.wbg.__wbindgen_is_undefined = function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        };
        imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        };
        imports.wbg.__wbindgen_memory = function() {
            const ret = wasm.memory;
            return ret;
        };
        imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        };
        imports.wbg.__wbindgen_number_new = function(arg0) {
            const ret = arg0;
            return ret;
        };
        imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        };
        imports.wbg.__wbindgen_throw = function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        };

        return imports;
    }

    function __wbg_finalize_init(instance, module) {
        wasm = instance.exports;
        __wbg_init.__wbindgen_wasm_module = module;
        cachedDataViewMemory0 = null;
        cachedUint8ArrayMemory0 = null;


        wasm.__wbindgen_start();
        return wasm;
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (typeof module_or_path !== 'undefined') {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path);
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead');
            }
        }

        if (typeof module_or_path === 'undefined') {
            module_or_path = new URL('toolkit_bg.wasm', (typeof document === 'undefined' && typeof location === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : typeof document === 'undefined' ? location.href : (document.currentScript && document.currentScript.src || new URL('c2pa.worker.js', document.baseURI).href)));
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    /**
     * Copyright 2021 Adobe
     * All Rights Reserved.
     *
     * NOTICE: Adobe permits you to use, modify, and distribute this file in
     * accordance with the terms of the Adobe license agreement accompanying
     * it.
     */
    const worker = {
        async compileWasm(buffer) {
            return WebAssembly.compile(buffer);
        },
        async getReport(wasm, buffer, type, settings) {
            await __wbg_init(wasm);
            return getManifestStoreFromArrayBuffer(buffer, type, settings);
        },
        async getReportFromAssetAndManifestBuffer(wasm, manifestBuffer, asset, settings) {
            await __wbg_init(wasm);
            const assetBuffer = await asset.arrayBuffer();
            return getManifestStoreFromManifestAndAsset(manifestBuffer, assetBuffer, asset.type, settings);
        },
        async scanInput(wasm, buffer) {
            await init(wasm);
            try {
                const offset = await scan_array_buffer(buffer);
                return { found: true, offset };
            }
            catch (err) {
                return { found: false };
            }
        },
    };
    setupWorker(worker);

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYzJwYS53b3JrZXIuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvcG9vbC9lcnJvci50cyIsIi4uLy4uL3NyYy9saWIvcG9vbC93b3JrZXIudHMiLCIuLi8uLi9kZXRlY3Rvci9wa2cvZGV0ZWN0b3IuanMiLCIuLi8uLi90b29sa2l0L3BrZy90b29sa2l0LmpzIiwiLi4vLi4vd29ya2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IDIwMjMgQWRvYmVcbiAqIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTk9USUNFOiBBZG9iZSBwZXJtaXRzIHlvdSB0byB1c2UsIG1vZGlmeSwgYW5kIGRpc3RyaWJ1dGUgdGhpcyBmaWxlIGluXG4gKiBhY2NvcmRhbmNlIHdpdGggdGhlIHRlcm1zIG9mIHRoZSBBZG9iZSBsaWNlbnNlIGFncmVlbWVudCBhY2NvbXBhbnlpbmdcbiAqIGl0LlxuICovXG5cbmludGVyZmFjZSBTZXJpYWxpemVkRXJyb3Ige1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG5cbi8vIEZyb20gaHR0cHM6Ly9naXRodWIuY29tL2pvc2Rlam9uZy93b3JrZXJwb29sL2Jsb2IvbWFzdGVyL3NyYy93b3JrZXIuanMjTDc2LUw4M1xuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUVycm9yKGVycm9yOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogU2VyaWFsaXplZEVycm9yIHtcbiAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGVycm9yKS5yZWR1Y2UoZnVuY3Rpb24gKHByb2R1Y3QsIG5hbWUpIHtcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb2R1Y3QsIG5hbWUsIHtcbiAgICAgIHZhbHVlOiBlcnJvcltuYW1lXSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgfSk7XG4gIH0sIHt9KTtcbn1cblxuLy8gRnJvbSBodHRwczovL2dpdGh1Yi5jb20vam9zZGVqb25nL3dvcmtlcnBvb2wvYmxvYi9tYXN0ZXIvc3JjL1dvcmtlckhhbmRsZXIuanMjTDE3OS1MMTkzXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemVFcnJvcihzZXJpYWxpemVkRXJyb3I6IFNlcmlhbGl6ZWRFcnJvcik6IEVycm9yIHtcbiAgdmFyIHRlbXAgPSBuZXcgRXJyb3IoJycpO1xuICB2YXIgcHJvcHMgPSBPYmplY3Qua2V5cyhzZXJpYWxpemVkRXJyb3IpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdGVtcFtwcm9wc1tpXV0gPSBzZXJpYWxpemVkRXJyb3JbcHJvcHNbaV1dO1xuICB9XG5cbiAgcmV0dXJuIHRlbXA7XG59XG4iLCIvKipcbiAqIENvcHlyaWdodCAyMDIzIEFkb2JlXG4gKiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIE5PVElDRTogQWRvYmUgcGVybWl0cyB5b3UgdG8gdXNlLCBtb2RpZnksIGFuZCBkaXN0cmlidXRlIHRoaXMgZmlsZSBpblxuICogYWNjb3JkYW5jZSB3aXRoIHRoZSB0ZXJtcyBvZiB0aGUgQWRvYmUgbGljZW5zZSBhZ3JlZW1lbnQgYWNjb21wYW55aW5nXG4gKiBpdC5cbiAqL1xuXG5pbXBvcnQgeyBzZXJpYWxpemVFcnJvciB9IGZyb20gJy4vZXJyb3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtlclJlcXVlc3Qge1xuICBtZXRob2Q6IHN0cmluZztcbiAgYXJnczogdW5rbm93bltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtlclJlc3BvbnNlU3VjY2VzcyB7XG4gIHR5cGU6ICdzdWNjZXNzJztcbiAgZGF0YTogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtlclJlc3BvbnNlRXJyb3Ige1xuICB0eXBlOiAnZXJyb3InO1xuICBlcnJvcjogYW55O1xufVxuXG5leHBvcnQgdHlwZSBXb3JrZXJSZXNwb25zZSA9IFdvcmtlclJlc3BvbnNlU3VjY2VzcyB8IFdvcmtlclJlc3BvbnNlRXJyb3I7XG5cbnR5cGUgV29ya2VyTWV0aG9kcyA9IFJlY29yZDxzdHJpbmcsICguLi5hcmdzOiBhbnlbXSkgPT4gYW55PjtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwV29ya2VyKG1ldGhvZHM6IFdvcmtlck1ldGhvZHMpIHtcbiAgb25tZXNzYWdlID0gYXN5bmMgKGU6IE1lc3NhZ2VFdmVudDxXb3JrZXJSZXF1ZXN0PikgPT4ge1xuICAgIGNvbnN0IHsgYXJncywgbWV0aG9kIH0gPSBlLmRhdGE7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IG1ldGhvZHNbbWV0aG9kXSguLi5hcmdzKTtcblxuICAgICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIGRhdGE6IHJlcyxcbiAgICAgIH0gYXMgV29ya2VyUmVzcG9uc2UpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBwb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIGVycm9yOiBzZXJpYWxpemVFcnJvcihlcnJvciBhcyBFcnJvciksXG4gICAgICB9IGFzIFdvcmtlclJlc3BvbnNlKTtcbiAgICB9XG4gIH07XG59XG4iLCJcbmxldCB3YXNtO1xuXG5jb25zdCBjYWNoZWRUZXh0RGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigndXRmLTgnLCB7IGlnbm9yZUJPTTogdHJ1ZSwgZmF0YWw6IHRydWUgfSk7XG5cbmNhY2hlZFRleHREZWNvZGVyLmRlY29kZSgpO1xuXG5sZXQgY2FjaGVkVWludDhNZW1vcnkwID0gbmV3IFVpbnQ4QXJyYXkoKTtcblxuZnVuY3Rpb24gZ2V0VWludDhNZW1vcnkwKCkge1xuICAgIGlmIChjYWNoZWRVaW50OE1lbW9yeTAuYnl0ZUxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjYWNoZWRVaW50OE1lbW9yeTAgPSBuZXcgVWludDhBcnJheSh3YXNtLm1lbW9yeS5idWZmZXIpO1xuICAgIH1cbiAgICByZXR1cm4gY2FjaGVkVWludDhNZW1vcnkwO1xufVxuXG5mdW5jdGlvbiBnZXRTdHJpbmdGcm9tV2FzbTAocHRyLCBsZW4pIHtcbiAgICByZXR1cm4gY2FjaGVkVGV4dERlY29kZXIuZGVjb2RlKGdldFVpbnQ4TWVtb3J5MCgpLnN1YmFycmF5KHB0ciwgcHRyICsgbGVuKSk7XG59XG5cbmxldCBXQVNNX1ZFQ1RPUl9MRU4gPSAwO1xuXG5jb25zdCBjYWNoZWRUZXh0RW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigndXRmLTgnKTtcblxuY29uc3QgZW5jb2RlU3RyaW5nID0gKHR5cGVvZiBjYWNoZWRUZXh0RW5jb2Rlci5lbmNvZGVJbnRvID09PSAnZnVuY3Rpb24nXG4gICAgPyBmdW5jdGlvbiAoYXJnLCB2aWV3KSB7XG4gICAgcmV0dXJuIGNhY2hlZFRleHRFbmNvZGVyLmVuY29kZUludG8oYXJnLCB2aWV3KTtcbn1cbiAgICA6IGZ1bmN0aW9uIChhcmcsIHZpZXcpIHtcbiAgICBjb25zdCBidWYgPSBjYWNoZWRUZXh0RW5jb2Rlci5lbmNvZGUoYXJnKTtcbiAgICB2aWV3LnNldChidWYpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlYWQ6IGFyZy5sZW5ndGgsXG4gICAgICAgIHdyaXR0ZW46IGJ1Zi5sZW5ndGhcbiAgICB9O1xufSk7XG5cbmZ1bmN0aW9uIHBhc3NTdHJpbmdUb1dhc20wKGFyZywgbWFsbG9jLCByZWFsbG9jKSB7XG5cbiAgICBpZiAocmVhbGxvYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IGJ1ZiA9IGNhY2hlZFRleHRFbmNvZGVyLmVuY29kZShhcmcpO1xuICAgICAgICBjb25zdCBwdHIgPSBtYWxsb2MoYnVmLmxlbmd0aCk7XG4gICAgICAgIGdldFVpbnQ4TWVtb3J5MCgpLnN1YmFycmF5KHB0ciwgcHRyICsgYnVmLmxlbmd0aCkuc2V0KGJ1Zik7XG4gICAgICAgIFdBU01fVkVDVE9SX0xFTiA9IGJ1Zi5sZW5ndGg7XG4gICAgICAgIHJldHVybiBwdHI7XG4gICAgfVxuXG4gICAgbGV0IGxlbiA9IGFyZy5sZW5ndGg7XG4gICAgbGV0IHB0ciA9IG1hbGxvYyhsZW4pO1xuXG4gICAgY29uc3QgbWVtID0gZ2V0VWludDhNZW1vcnkwKCk7XG5cbiAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgIGZvciAoOyBvZmZzZXQgPCBsZW47IG9mZnNldCsrKSB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmcuY2hhckNvZGVBdChvZmZzZXQpO1xuICAgICAgICBpZiAoY29kZSA+IDB4N0YpIGJyZWFrO1xuICAgICAgICBtZW1bcHRyICsgb2Zmc2V0XSA9IGNvZGU7XG4gICAgfVxuXG4gICAgaWYgKG9mZnNldCAhPT0gbGVuKSB7XG4gICAgICAgIGlmIChvZmZzZXQgIT09IDApIHtcbiAgICAgICAgICAgIGFyZyA9IGFyZy5zbGljZShvZmZzZXQpO1xuICAgICAgICB9XG4gICAgICAgIHB0ciA9IHJlYWxsb2MocHRyLCBsZW4sIGxlbiA9IG9mZnNldCArIGFyZy5sZW5ndGggKiAzKTtcbiAgICAgICAgY29uc3QgdmlldyA9IGdldFVpbnQ4TWVtb3J5MCgpLnN1YmFycmF5KHB0ciArIG9mZnNldCwgcHRyICsgbGVuKTtcbiAgICAgICAgY29uc3QgcmV0ID0gZW5jb2RlU3RyaW5nKGFyZywgdmlldyk7XG5cbiAgICAgICAgb2Zmc2V0ICs9IHJldC53cml0dGVuO1xuICAgIH1cblxuICAgIFdBU01fVkVDVE9SX0xFTiA9IG9mZnNldDtcbiAgICByZXR1cm4gcHRyO1xufVxuXG5mdW5jdGlvbiBpc0xpa2VOb25lKHgpIHtcbiAgICByZXR1cm4geCA9PT0gdW5kZWZpbmVkIHx8IHggPT09IG51bGw7XG59XG5cbmxldCBjYWNoZWRJbnQzMk1lbW9yeTAgPSBuZXcgSW50MzJBcnJheSgpO1xuXG5mdW5jdGlvbiBnZXRJbnQzMk1lbW9yeTAoKSB7XG4gICAgaWYgKGNhY2hlZEludDMyTWVtb3J5MC5ieXRlTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNhY2hlZEludDMyTWVtb3J5MCA9IG5ldyBJbnQzMkFycmF5KHdhc20ubWVtb3J5LmJ1ZmZlcik7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWRJbnQzMk1lbW9yeTA7XG59XG5cbmxldCBjYWNoZWRGbG9hdDY0TWVtb3J5MCA9IG5ldyBGbG9hdDY0QXJyYXkoKTtcblxuZnVuY3Rpb24gZ2V0RmxvYXQ2NE1lbW9yeTAoKSB7XG4gICAgaWYgKGNhY2hlZEZsb2F0NjRNZW1vcnkwLmJ5dGVMZW5ndGggPT09IDApIHtcbiAgICAgICAgY2FjaGVkRmxvYXQ2NE1lbW9yeTAgPSBuZXcgRmxvYXQ2NEFycmF5KHdhc20ubWVtb3J5LmJ1ZmZlcik7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWRGbG9hdDY0TWVtb3J5MDtcbn1cblxuZnVuY3Rpb24gZGVidWdTdHJpbmcodmFsKSB7XG4gICAgLy8gcHJpbWl0aXZlIHR5cGVzXG4gICAgY29uc3QgdHlwZSA9IHR5cGVvZiB2YWw7XG4gICAgaWYgKHR5cGUgPT0gJ251bWJlcicgfHwgdHlwZSA9PSAnYm9vbGVhbicgfHwgdmFsID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICBgJHt2YWx9YDtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGBcIiR7dmFsfVwiYDtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSB2YWwuZGVzY3JpcHRpb247XG4gICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1N5bWJvbCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYFN5bWJvbCgke2Rlc2NyaXB0aW9ufSlgO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHZhbC5uYW1lO1xuICAgICAgICBpZiAodHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYEZ1bmN0aW9uKCR7bmFtZX0pYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnRnVuY3Rpb24nO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIG9iamVjdHNcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHZhbC5sZW5ndGg7XG4gICAgICAgIGxldCBkZWJ1ZyA9ICdbJztcbiAgICAgICAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGRlYnVnICs9IGRlYnVnU3RyaW5nKHZhbFswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yKGxldCBpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkZWJ1ZyArPSAnLCAnICsgZGVidWdTdHJpbmcodmFsW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1ZyArPSAnXSc7XG4gICAgICAgIHJldHVybiBkZWJ1ZztcbiAgICB9XG4gICAgLy8gVGVzdCBmb3IgYnVpbHQtaW5cbiAgICBjb25zdCBidWlsdEluTWF0Y2hlcyA9IC9cXFtvYmplY3QgKFteXFxdXSspXFxdLy5leGVjKHRvU3RyaW5nLmNhbGwodmFsKSk7XG4gICAgbGV0IGNsYXNzTmFtZTtcbiAgICBpZiAoYnVpbHRJbk1hdGNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBjbGFzc05hbWUgPSBidWlsdEluTWF0Y2hlc1sxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGYWlsZWQgdG8gbWF0Y2ggdGhlIHN0YW5kYXJkICdbb2JqZWN0IENsYXNzTmFtZV0nXG4gICAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCk7XG4gICAgfVxuICAgIGlmIChjbGFzc05hbWUgPT0gJ09iamVjdCcpIHtcbiAgICAgICAgLy8gd2UncmUgYSB1c2VyIGRlZmluZWQgY2xhc3Mgb3IgT2JqZWN0XG4gICAgICAgIC8vIEpTT04uc3RyaW5naWZ5IGF2b2lkcyBwcm9ibGVtcyB3aXRoIGN5Y2xlcywgYW5kIGlzIGdlbmVyYWxseSBtdWNoXG4gICAgICAgIC8vIGVhc2llciB0aGFuIGxvb3BpbmcgdGhyb3VnaCBvd25Qcm9wZXJ0aWVzIG9mIGB2YWxgLlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuICdPYmplY3QoJyArIEpTT04uc3RyaW5naWZ5KHZhbCkgKyAnKSc7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgIHJldHVybiAnT2JqZWN0JztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBlcnJvcnNcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGAke3ZhbC5uYW1lfTogJHt2YWwubWVzc2FnZX1cXG4ke3ZhbC5zdGFja31gO1xuICAgIH1cbiAgICAvLyBUT0RPIHdlIGNvdWxkIHRlc3QgZm9yIG1vcmUgdGhpbmdzIGhlcmUsIGxpa2UgYFNldGBzIGFuZCBgTWFwYHMuXG4gICAgcmV0dXJuIGNsYXNzTmFtZTtcbn1cbi8qKlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluKCkge1xuICAgIHdhc20ubWFpbigpO1xufVxuXG5mdW5jdGlvbiB0YWtlRnJvbUV4dGVybnJlZlRhYmxlMChpZHgpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHdhc20uX193YmluZGdlbl9leHBvcnRfMi5nZXQoaWR4KTtcbiAgICB3YXNtLl9fZXh0ZXJucmVmX3RhYmxlX2RlYWxsb2MoaWR4KTtcbiAgICByZXR1cm4gdmFsdWU7XG59XG4vKipcbiogQHBhcmFtIHthbnl9IGJ1ZlxuKiBAcmV0dXJucyB7bnVtYmVyfVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2FuX2FycmF5X2J1ZmZlcihidWYpIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCByZXRwdHIgPSB3YXNtLl9fd2JpbmRnZW5fYWRkX3RvX3N0YWNrX3BvaW50ZXIoLTE2KTtcbiAgICAgICAgd2FzbS5zY2FuX2FycmF5X2J1ZmZlcihyZXRwdHIsIGJ1Zik7XG4gICAgICAgIHZhciByMCA9IGdldEludDMyTWVtb3J5MCgpW3JldHB0ciAvIDQgKyAwXTtcbiAgICAgICAgdmFyIHIxID0gZ2V0SW50MzJNZW1vcnkwKClbcmV0cHRyIC8gNCArIDFdO1xuICAgICAgICB2YXIgcjIgPSBnZXRJbnQzMk1lbW9yeTAoKVtyZXRwdHIgLyA0ICsgMl07XG4gICAgICAgIGlmIChyMikge1xuICAgICAgICAgICAgdGhyb3cgdGFrZUZyb21FeHRlcm5yZWZUYWJsZTAocjEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByMCA+Pj4gMDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICB3YXNtLl9fd2JpbmRnZW5fYWRkX3RvX3N0YWNrX3BvaW50ZXIoMTYpO1xuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZChtb2R1bGUsIGltcG9ydHMpIHtcbiAgICBpZiAodHlwZW9mIFJlc3BvbnNlID09PSAnZnVuY3Rpb24nICYmIG1vZHVsZSBpbnN0YW5jZW9mIFJlc3BvbnNlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKG1vZHVsZSwgaW1wb3J0cyk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobW9kdWxlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSAhPSAnYXBwbGljYXRpb24vd2FzbScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiYFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nYCBmYWlsZWQgYmVjYXVzZSB5b3VyIHNlcnZlciBkb2VzIG5vdCBzZXJ2ZSB3YXNtIHdpdGggYGFwcGxpY2F0aW9uL3dhc21gIE1JTUUgdHlwZS4gRmFsbGluZyBiYWNrIHRvIGBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZWAgd2hpY2ggaXMgc2xvd2VyLiBPcmlnaW5hbCBlcnJvcjpcXG5cIiwgZSk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgbW9kdWxlLmFycmF5QnVmZmVyKCk7XG4gICAgICAgIHJldHVybiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShieXRlcywgaW1wb3J0cyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKG1vZHVsZSwgaW1wb3J0cyk7XG5cbiAgICAgICAgaWYgKGluc3RhbmNlIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGluc3RhbmNlLCBtb2R1bGUgfTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRJbXBvcnRzKCkge1xuICAgIGNvbnN0IGltcG9ydHMgPSB7fTtcbiAgICBpbXBvcnRzLndiZyA9IHt9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2lzQXJyYXlfMjdjNDZjNjdmNDk4ZTE1ZCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gQXJyYXkuaXNBcnJheShhcmcwKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2xlbmd0aF82ZTNiYmU3YzhiZDRkYmQ4ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2dldF81NzI0NWNjN2Q3Yzc2MTlkID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwW2FyZzEgPj4+IDBdO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfaXNTYWZlSW50ZWdlcl9kZmEwNTkzZThkN2FjMzVhID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBOdW1iZXIuaXNTYWZlSW50ZWdlcihhcmcwKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5fc3RyaW5nX25ldyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbmV3X2FiZGE3NmU4ODNiYThhNWYgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IEVycm9yKCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zdGFja182NTgyNzlmZTQ0NTQxY2Y2ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcxLnN0YWNrO1xuICAgICAgICBjb25zdCBwdHIwID0gcGFzc1N0cmluZ1RvV2FzbTAocmV0LCB3YXNtLl9fd2JpbmRnZW5fbWFsbG9jLCB3YXNtLl9fd2JpbmRnZW5fcmVhbGxvYyk7XG4gICAgICAgIGNvbnN0IGxlbjAgPSBXQVNNX1ZFQ1RPUl9MRU47XG4gICAgICAgIGdldEludDMyTWVtb3J5MCgpW2FyZzAgLyA0ICsgMV0gPSBsZW4wO1xuICAgICAgICBnZXRJbnQzMk1lbW9yeTAoKVthcmcwIC8gNCArIDBdID0gcHRyMDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2Vycm9yX2Y4NTE2NjdhZjcxYmNmYzYgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGdldFN0cmluZ0Zyb21XYXNtMChhcmcwLCBhcmcxKSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB3YXNtLl9fd2JpbmRnZW5fZnJlZShhcmcwLCBhcmcxKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbGVuZ3RoXzllMWFlMTkwMGNiMGZiZDUgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzAubGVuZ3RoO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9tZW1vcnkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gd2FzbS5tZW1vcnk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19idWZmZXJfM2YzZDc2NGQ0NzQ3ZDU2NCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMC5idWZmZXI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19uZXdfOGMzZjAwNTIyNzJhNDU3YSA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IFVpbnQ4QXJyYXkoYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zZXRfODNkYjk2OTBmOTM1M2U3OSA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgYXJnMC5zZXQoYXJnMSwgYXJnMiA+Pj4gMCk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2Vycm9yX25ldyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IEVycm9yKGdldFN0cmluZ0Zyb21XYXNtMChhcmcwLCBhcmcxKSk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2pzdmFsX2xvb3NlX2VxID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwID09IGFyZzE7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2Jvb2xlYW5fZ2V0ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCB2ID0gYXJnMDtcbiAgICAgICAgY29uc3QgcmV0ID0gdHlwZW9mKHYpID09PSAnYm9vbGVhbicgPyAodiA/IDEgOiAwKSA6IDI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX3N0cmluZ19nZXQgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IG9iaiA9IGFyZzE7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZihvYmopID09PSAnc3RyaW5nJyA/IG9iaiA6IHVuZGVmaW5lZDtcbiAgICAgICAgdmFyIHB0cjAgPSBpc0xpa2VOb25lKHJldCkgPyAwIDogcGFzc1N0cmluZ1RvV2FzbTAocmV0LCB3YXNtLl9fd2JpbmRnZW5fbWFsbG9jLCB3YXNtLl9fd2JpbmRnZW5fcmVhbGxvYyk7XG4gICAgICAgIHZhciBsZW4wID0gV0FTTV9WRUNUT1JfTEVOO1xuICAgICAgICBnZXRJbnQzMk1lbW9yeTAoKVthcmcwIC8gNCArIDFdID0gbGVuMDtcbiAgICAgICAgZ2V0SW50MzJNZW1vcnkwKClbYXJnMCAvIDQgKyAwXSA9IHB0cjA7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX251bWJlcl9nZXQgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IG9iaiA9IGFyZzE7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZihvYmopID09PSAnbnVtYmVyJyA/IG9iaiA6IHVuZGVmaW5lZDtcbiAgICAgICAgZ2V0RmxvYXQ2NE1lbW9yeTAoKVthcmcwIC8gOCArIDFdID0gaXNMaWtlTm9uZShyZXQpID8gMCA6IHJldDtcbiAgICAgICAgZ2V0SW50MzJNZW1vcnkwKClbYXJnMCAvIDQgKyAwXSA9ICFpc0xpa2VOb25lKHJldCk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19pbnN0YW5jZW9mX1VpbnQ4QXJyYXlfOTcxZWVkYTY5ZWI3NTAwMyA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGFyZzAgaW5zdGFuY2VvZiBVaW50OEFycmF5O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJldCA9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2luc3RhbmNlb2ZfQXJyYXlCdWZmZXJfZTVlNDhmNDc2MmM1NjEwYiA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGFyZzAgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXQgPSByZXN1bHQ7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2RlYnVnX3N0cmluZyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gZGVidWdTdHJpbmcoYXJnMSk7XG4gICAgICAgIGNvbnN0IHB0cjAgPSBwYXNzU3RyaW5nVG9XYXNtMChyZXQsIHdhc20uX193YmluZGdlbl9tYWxsb2MsIHdhc20uX193YmluZGdlbl9yZWFsbG9jKTtcbiAgICAgICAgY29uc3QgbGVuMCA9IFdBU01fVkVDVE9SX0xFTjtcbiAgICAgICAgZ2V0SW50MzJNZW1vcnkwKClbYXJnMCAvIDQgKyAxXSA9IGxlbjA7XG4gICAgICAgIGdldEludDMyTWVtb3J5MCgpW2FyZzAgLyA0ICsgMF0gPSBwdHIwO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl90aHJvdyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGdldFN0cmluZ0Zyb21XYXNtMChhcmcwLCBhcmcxKSk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2luaXRfZXh0ZXJucmVmX3RhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHRhYmxlID0gd2FzbS5fX3diaW5kZ2VuX2V4cG9ydF8yO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSB0YWJsZS5ncm93KDQpO1xuICAgICAgICB0YWJsZS5zZXQoMCwgdW5kZWZpbmVkKTtcbiAgICAgICAgdGFibGUuc2V0KG9mZnNldCArIDAsIHVuZGVmaW5lZCk7XG4gICAgICAgIHRhYmxlLnNldChvZmZzZXQgKyAxLCBudWxsKTtcbiAgICAgICAgdGFibGUuc2V0KG9mZnNldCArIDIsIHRydWUpO1xuICAgICAgICB0YWJsZS5zZXQob2Zmc2V0ICsgMywgZmFsc2UpO1xuICAgICAgICA7XG4gICAgfTtcblxuICAgIHJldHVybiBpbXBvcnRzO1xufVxuXG5mdW5jdGlvbiBpbml0TWVtb3J5KGltcG9ydHMsIG1heWJlX21lbW9yeSkge1xuXG59XG5cbmZ1bmN0aW9uIGZpbmFsaXplSW5pdChpbnN0YW5jZSwgbW9kdWxlKSB7XG4gICAgd2FzbSA9IGluc3RhbmNlLmV4cG9ydHM7XG4gICAgaW5pdC5fX3diaW5kZ2VuX3dhc21fbW9kdWxlID0gbW9kdWxlO1xuICAgIGNhY2hlZEZsb2F0NjRNZW1vcnkwID0gbmV3IEZsb2F0NjRBcnJheSgpO1xuICAgIGNhY2hlZEludDMyTWVtb3J5MCA9IG5ldyBJbnQzMkFycmF5KCk7XG4gICAgY2FjaGVkVWludDhNZW1vcnkwID0gbmV3IFVpbnQ4QXJyYXkoKTtcblxuICAgIHdhc20uX193YmluZGdlbl9zdGFydCgpO1xuICAgIHJldHVybiB3YXNtO1xufVxuXG5mdW5jdGlvbiBpbml0U3luYyhtb2R1bGUpIHtcbiAgICBjb25zdCBpbXBvcnRzID0gZ2V0SW1wb3J0cygpO1xuXG4gICAgaW5pdE1lbW9yeShpbXBvcnRzKTtcblxuICAgIGlmICghKG1vZHVsZSBpbnN0YW5jZW9mIFdlYkFzc2VtYmx5Lk1vZHVsZSkpIHtcbiAgICAgICAgbW9kdWxlID0gbmV3IFdlYkFzc2VtYmx5Lk1vZHVsZShtb2R1bGUpO1xuICAgIH1cblxuICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IFdlYkFzc2VtYmx5Lkluc3RhbmNlKG1vZHVsZSwgaW1wb3J0cyk7XG5cbiAgICByZXR1cm4gZmluYWxpemVJbml0KGluc3RhbmNlLCBtb2R1bGUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0KGlucHV0KSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaW5wdXQgPSBuZXcgVVJMKCdkZXRlY3Rvcl9iZy53YXNtJywgaW1wb3J0Lm1ldGEudXJsKTtcbiAgICB9XG4gICAgY29uc3QgaW1wb3J0cyA9IGdldEltcG9ydHMoKTtcblxuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnIHx8ICh0eXBlb2YgUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBpbnB1dCBpbnN0YW5jZW9mIFJlcXVlc3QpIHx8ICh0eXBlb2YgVVJMID09PSAnZnVuY3Rpb24nICYmIGlucHV0IGluc3RhbmNlb2YgVVJMKSkge1xuICAgICAgICBpbnB1dCA9IGZldGNoKGlucHV0KTtcbiAgICB9XG5cbiAgICBpbml0TWVtb3J5KGltcG9ydHMpO1xuXG4gICAgY29uc3QgeyBpbnN0YW5jZSwgbW9kdWxlIH0gPSBhd2FpdCBsb2FkKGF3YWl0IGlucHV0LCBpbXBvcnRzKTtcblxuICAgIHJldHVybiBmaW5hbGl6ZUluaXQoaW5zdGFuY2UsIG1vZHVsZSk7XG59XG5cbmV4cG9ydCB7IGluaXRTeW5jIH1cbmV4cG9ydCBkZWZhdWx0IGluaXQ7XG4iLCJsZXQgd2FzbTtcblxubGV0IFdBU01fVkVDVE9SX0xFTiA9IDA7XG5cbmxldCBjYWNoZWRVaW50OEFycmF5TWVtb3J5MCA9IG51bGw7XG5cbmZ1bmN0aW9uIGdldFVpbnQ4QXJyYXlNZW1vcnkwKCkge1xuICAgIGlmIChjYWNoZWRVaW50OEFycmF5TWVtb3J5MCA9PT0gbnVsbCB8fCBjYWNoZWRVaW50OEFycmF5TWVtb3J5MC5ieXRlTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNhY2hlZFVpbnQ4QXJyYXlNZW1vcnkwID0gbmV3IFVpbnQ4QXJyYXkod2FzbS5tZW1vcnkuYnVmZmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlZFVpbnQ4QXJyYXlNZW1vcnkwO1xufVxuXG5jb25zdCBjYWNoZWRUZXh0RW5jb2RlciA9ICh0eXBlb2YgVGV4dEVuY29kZXIgIT09ICd1bmRlZmluZWQnID8gbmV3IFRleHRFbmNvZGVyKCd1dGYtOCcpIDogeyBlbmNvZGU6ICgpID0+IHsgdGhyb3cgRXJyb3IoJ1RleHRFbmNvZGVyIG5vdCBhdmFpbGFibGUnKSB9IH0gKTtcblxuY29uc3QgZW5jb2RlU3RyaW5nID0gKHR5cGVvZiBjYWNoZWRUZXh0RW5jb2Rlci5lbmNvZGVJbnRvID09PSAnZnVuY3Rpb24nXG4gICAgPyBmdW5jdGlvbiAoYXJnLCB2aWV3KSB7XG4gICAgcmV0dXJuIGNhY2hlZFRleHRFbmNvZGVyLmVuY29kZUludG8oYXJnLCB2aWV3KTtcbn1cbiAgICA6IGZ1bmN0aW9uIChhcmcsIHZpZXcpIHtcbiAgICBjb25zdCBidWYgPSBjYWNoZWRUZXh0RW5jb2Rlci5lbmNvZGUoYXJnKTtcbiAgICB2aWV3LnNldChidWYpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlYWQ6IGFyZy5sZW5ndGgsXG4gICAgICAgIHdyaXR0ZW46IGJ1Zi5sZW5ndGhcbiAgICB9O1xufSk7XG5cbmZ1bmN0aW9uIHBhc3NTdHJpbmdUb1dhc20wKGFyZywgbWFsbG9jLCByZWFsbG9jKSB7XG5cbiAgICBpZiAocmVhbGxvYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IGJ1ZiA9IGNhY2hlZFRleHRFbmNvZGVyLmVuY29kZShhcmcpO1xuICAgICAgICBjb25zdCBwdHIgPSBtYWxsb2MoYnVmLmxlbmd0aCwgMSkgPj4+IDA7XG4gICAgICAgIGdldFVpbnQ4QXJyYXlNZW1vcnkwKCkuc3ViYXJyYXkocHRyLCBwdHIgKyBidWYubGVuZ3RoKS5zZXQoYnVmKTtcbiAgICAgICAgV0FTTV9WRUNUT1JfTEVOID0gYnVmLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHB0cjtcbiAgICB9XG5cbiAgICBsZXQgbGVuID0gYXJnLmxlbmd0aDtcbiAgICBsZXQgcHRyID0gbWFsbG9jKGxlbiwgMSkgPj4+IDA7XG5cbiAgICBjb25zdCBtZW0gPSBnZXRVaW50OEFycmF5TWVtb3J5MCgpO1xuXG4gICAgbGV0IG9mZnNldCA9IDA7XG5cbiAgICBmb3IgKDsgb2Zmc2V0IDwgbGVuOyBvZmZzZXQrKykge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJnLmNoYXJDb2RlQXQob2Zmc2V0KTtcbiAgICAgICAgaWYgKGNvZGUgPiAweDdGKSBicmVhaztcbiAgICAgICAgbWVtW3B0ciArIG9mZnNldF0gPSBjb2RlO1xuICAgIH1cblxuICAgIGlmIChvZmZzZXQgIT09IGxlbikge1xuICAgICAgICBpZiAob2Zmc2V0ICE9PSAwKSB7XG4gICAgICAgICAgICBhcmcgPSBhcmcuc2xpY2Uob2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgICBwdHIgPSByZWFsbG9jKHB0ciwgbGVuLCBsZW4gPSBvZmZzZXQgKyBhcmcubGVuZ3RoICogMywgMSkgPj4+IDA7XG4gICAgICAgIGNvbnN0IHZpZXcgPSBnZXRVaW50OEFycmF5TWVtb3J5MCgpLnN1YmFycmF5KHB0ciArIG9mZnNldCwgcHRyICsgbGVuKTtcbiAgICAgICAgY29uc3QgcmV0ID0gZW5jb2RlU3RyaW5nKGFyZywgdmlldyk7XG5cbiAgICAgICAgb2Zmc2V0ICs9IHJldC53cml0dGVuO1xuICAgICAgICBwdHIgPSByZWFsbG9jKHB0ciwgbGVuLCBvZmZzZXQsIDEpID4+PiAwO1xuICAgIH1cblxuICAgIFdBU01fVkVDVE9SX0xFTiA9IG9mZnNldDtcbiAgICByZXR1cm4gcHRyO1xufVxuXG5sZXQgY2FjaGVkRGF0YVZpZXdNZW1vcnkwID0gbnVsbDtcblxuZnVuY3Rpb24gZ2V0RGF0YVZpZXdNZW1vcnkwKCkge1xuICAgIGlmIChjYWNoZWREYXRhVmlld01lbW9yeTAgPT09IG51bGwgfHwgY2FjaGVkRGF0YVZpZXdNZW1vcnkwLmJ1ZmZlci5kZXRhY2hlZCA9PT0gdHJ1ZSB8fCAoY2FjaGVkRGF0YVZpZXdNZW1vcnkwLmJ1ZmZlci5kZXRhY2hlZCA9PT0gdW5kZWZpbmVkICYmIGNhY2hlZERhdGFWaWV3TWVtb3J5MC5idWZmZXIgIT09IHdhc20ubWVtb3J5LmJ1ZmZlcikpIHtcbiAgICAgICAgY2FjaGVkRGF0YVZpZXdNZW1vcnkwID0gbmV3IERhdGFWaWV3KHdhc20ubWVtb3J5LmJ1ZmZlcik7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWREYXRhVmlld01lbW9yeTA7XG59XG5cbmNvbnN0IGNhY2hlZFRleHREZWNvZGVyID0gKHR5cGVvZiBUZXh0RGVjb2RlciAhPT0gJ3VuZGVmaW5lZCcgPyBuZXcgVGV4dERlY29kZXIoJ3V0Zi04JywgeyBpZ25vcmVCT006IHRydWUsIGZhdGFsOiB0cnVlIH0pIDogeyBkZWNvZGU6ICgpID0+IHsgdGhyb3cgRXJyb3IoJ1RleHREZWNvZGVyIG5vdCBhdmFpbGFibGUnKSB9IH0gKTtcblxuaWYgKHR5cGVvZiBUZXh0RGVjb2RlciAhPT0gJ3VuZGVmaW5lZCcpIHsgY2FjaGVkVGV4dERlY29kZXIuZGVjb2RlKCk7IH07XG5cbmZ1bmN0aW9uIGdldFN0cmluZ0Zyb21XYXNtMChwdHIsIGxlbikge1xuICAgIHB0ciA9IHB0ciA+Pj4gMDtcbiAgICByZXR1cm4gY2FjaGVkVGV4dERlY29kZXIuZGVjb2RlKGdldFVpbnQ4QXJyYXlNZW1vcnkwKCkuc3ViYXJyYXkocHRyLCBwdHIgKyBsZW4pKTtcbn1cblxuZnVuY3Rpb24gYWRkVG9FeHRlcm5yZWZUYWJsZTAob2JqKSB7XG4gICAgY29uc3QgaWR4ID0gd2FzbS5fX2V4dGVybnJlZl90YWJsZV9hbGxvYygpO1xuICAgIHdhc20uX193YmluZGdlbl9leHBvcnRfNC5zZXQoaWR4LCBvYmopO1xuICAgIHJldHVybiBpZHg7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUVycm9yKGYsIGFyZ3MpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IGFkZFRvRXh0ZXJucmVmVGFibGUwKGUpO1xuICAgICAgICB3YXNtLl9fd2JpbmRnZW5fZXhuX3N0b3JlKGlkeCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0xpa2VOb25lKHgpIHtcbiAgICByZXR1cm4geCA9PT0gdW5kZWZpbmVkIHx8IHggPT09IG51bGw7XG59XG5cbmNvbnN0IENMT1NVUkVfRFRPUlMgPSAodHlwZW9mIEZpbmFsaXphdGlvblJlZ2lzdHJ5ID09PSAndW5kZWZpbmVkJylcbiAgICA/IHsgcmVnaXN0ZXI6ICgpID0+IHt9LCB1bnJlZ2lzdGVyOiAoKSA9PiB7fSB9XG4gICAgOiBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoc3RhdGUgPT4ge1xuICAgIHdhc20uX193YmluZGdlbl9leHBvcnRfNi5nZXQoc3RhdGUuZHRvcikoc3RhdGUuYSwgc3RhdGUuYilcbn0pO1xuXG5mdW5jdGlvbiBtYWtlTXV0Q2xvc3VyZShhcmcwLCBhcmcxLCBkdG9yLCBmKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB7IGE6IGFyZzAsIGI6IGFyZzEsIGNudDogMSwgZHRvciB9O1xuICAgIGNvbnN0IHJlYWwgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAvLyBGaXJzdCB1cCB3aXRoIGEgY2xvc3VyZSB3ZSBpbmNyZW1lbnQgdGhlIGludGVybmFsIHJlZmVyZW5jZVxuICAgICAgICAvLyBjb3VudC4gVGhpcyBlbnN1cmVzIHRoYXQgdGhlIFJ1c3QgY2xvc3VyZSBlbnZpcm9ubWVudCB3b24ndFxuICAgICAgICAvLyBiZSBkZWFsbG9jYXRlZCB3aGlsZSB3ZSdyZSBpbnZva2luZyBpdC5cbiAgICAgICAgc3RhdGUuY250Kys7XG4gICAgICAgIGNvbnN0IGEgPSBzdGF0ZS5hO1xuICAgICAgICBzdGF0ZS5hID0gMDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBmKGEsIHN0YXRlLmIsIC4uLmFyZ3MpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKC0tc3RhdGUuY250ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgd2FzbS5fX3diaW5kZ2VuX2V4cG9ydF82LmdldChzdGF0ZS5kdG9yKShhLCBzdGF0ZS5iKTtcbiAgICAgICAgICAgICAgICBDTE9TVVJFX0RUT1JTLnVucmVnaXN0ZXIoc3RhdGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hID0gYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgcmVhbC5vcmlnaW5hbCA9IHN0YXRlO1xuICAgIENMT1NVUkVfRFRPUlMucmVnaXN0ZXIocmVhbCwgc3RhdGUsIHN0YXRlKTtcbiAgICByZXR1cm4gcmVhbDtcbn1cblxuZnVuY3Rpb24gZGVidWdTdHJpbmcodmFsKSB7XG4gICAgLy8gcHJpbWl0aXZlIHR5cGVzXG4gICAgY29uc3QgdHlwZSA9IHR5cGVvZiB2YWw7XG4gICAgaWYgKHR5cGUgPT0gJ251bWJlcicgfHwgdHlwZSA9PSAnYm9vbGVhbicgfHwgdmFsID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICBgJHt2YWx9YDtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGBcIiR7dmFsfVwiYDtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSB2YWwuZGVzY3JpcHRpb247XG4gICAgICAgIGlmIChkZXNjcmlwdGlvbiA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1N5bWJvbCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYFN5bWJvbCgke2Rlc2NyaXB0aW9ufSlgO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHZhbC5uYW1lO1xuICAgICAgICBpZiAodHlwZW9mIG5hbWUgPT0gJ3N0cmluZycgJiYgbmFtZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYEZ1bmN0aW9uKCR7bmFtZX0pYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnRnVuY3Rpb24nO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIG9iamVjdHNcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHZhbC5sZW5ndGg7XG4gICAgICAgIGxldCBkZWJ1ZyA9ICdbJztcbiAgICAgICAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGRlYnVnICs9IGRlYnVnU3RyaW5nKHZhbFswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yKGxldCBpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkZWJ1ZyArPSAnLCAnICsgZGVidWdTdHJpbmcodmFsW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1ZyArPSAnXSc7XG4gICAgICAgIHJldHVybiBkZWJ1ZztcbiAgICB9XG4gICAgLy8gVGVzdCBmb3IgYnVpbHQtaW5cbiAgICBjb25zdCBidWlsdEluTWF0Y2hlcyA9IC9cXFtvYmplY3QgKFteXFxdXSspXFxdLy5leGVjKHRvU3RyaW5nLmNhbGwodmFsKSk7XG4gICAgbGV0IGNsYXNzTmFtZTtcbiAgICBpZiAoYnVpbHRJbk1hdGNoZXMgJiYgYnVpbHRJbk1hdGNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBjbGFzc05hbWUgPSBidWlsdEluTWF0Y2hlc1sxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGYWlsZWQgdG8gbWF0Y2ggdGhlIHN0YW5kYXJkICdbb2JqZWN0IENsYXNzTmFtZV0nXG4gICAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCk7XG4gICAgfVxuICAgIGlmIChjbGFzc05hbWUgPT0gJ09iamVjdCcpIHtcbiAgICAgICAgLy8gd2UncmUgYSB1c2VyIGRlZmluZWQgY2xhc3Mgb3IgT2JqZWN0XG4gICAgICAgIC8vIEpTT04uc3RyaW5naWZ5IGF2b2lkcyBwcm9ibGVtcyB3aXRoIGN5Y2xlcywgYW5kIGlzIGdlbmVyYWxseSBtdWNoXG4gICAgICAgIC8vIGVhc2llciB0aGFuIGxvb3BpbmcgdGhyb3VnaCBvd25Qcm9wZXJ0aWVzIG9mIGB2YWxgLlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuICdPYmplY3QoJyArIEpTT04uc3RyaW5naWZ5KHZhbCkgKyAnKSc7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgIHJldHVybiAnT2JqZWN0JztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBlcnJvcnNcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGAke3ZhbC5uYW1lfTogJHt2YWwubWVzc2FnZX1cXG4ke3ZhbC5zdGFja31gO1xuICAgIH1cbiAgICAvLyBUT0RPIHdlIGNvdWxkIHRlc3QgZm9yIG1vcmUgdGhpbmdzIGhlcmUsIGxpa2UgYFNldGBzIGFuZCBgTWFwYHMuXG4gICAgcmV0dXJuIGNsYXNzTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1bigpIHtcbiAgICB3YXNtLnJ1bigpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7YW55fSBidWZcbiAqIEBwYXJhbSB7c3RyaW5nfSBtaW1lX3R5cGVcbiAqIEBwYXJhbSB7c3RyaW5nIHwgbnVsbH0gW3NldHRpbmdzXVxuICogQHJldHVybnMge1Byb21pc2U8YW55Pn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1hbmlmZXN0U3RvcmVGcm9tQXJyYXlCdWZmZXIoYnVmLCBtaW1lX3R5cGUsIHNldHRpbmdzKSB7XG4gICAgY29uc3QgcHRyMCA9IHBhc3NTdHJpbmdUb1dhc20wKG1pbWVfdHlwZSwgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpO1xuICAgIGNvbnN0IGxlbjAgPSBXQVNNX1ZFQ1RPUl9MRU47XG4gICAgdmFyIHB0cjEgPSBpc0xpa2VOb25lKHNldHRpbmdzKSA/IDAgOiBwYXNzU3RyaW5nVG9XYXNtMChzZXR0aW5ncywgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpO1xuICAgIHZhciBsZW4xID0gV0FTTV9WRUNUT1JfTEVOO1xuICAgIGNvbnN0IHJldCA9IHdhc20uZ2V0TWFuaWZlc3RTdG9yZUZyb21BcnJheUJ1ZmZlcihidWYsIHB0cjAsIGxlbjAsIHB0cjEsIGxlbjEpO1xuICAgIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHthbnl9IG1hbmlmZXN0X2J1ZmZlclxuICogQHBhcmFtIHthbnl9IGFzc2V0X2J1ZmZlclxuICogQHBhcmFtIHtzdHJpbmd9IG1pbWVfdHlwZVxuICogQHBhcmFtIHtzdHJpbmcgfCBudWxsfSBbc2V0dGluZ3NdXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxhbnk+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWFuaWZlc3RTdG9yZUZyb21NYW5pZmVzdEFuZEFzc2V0KG1hbmlmZXN0X2J1ZmZlciwgYXNzZXRfYnVmZmVyLCBtaW1lX3R5cGUsIHNldHRpbmdzKSB7XG4gICAgY29uc3QgcHRyMCA9IHBhc3NTdHJpbmdUb1dhc20wKG1pbWVfdHlwZSwgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpO1xuICAgIGNvbnN0IGxlbjAgPSBXQVNNX1ZFQ1RPUl9MRU47XG4gICAgdmFyIHB0cjEgPSBpc0xpa2VOb25lKHNldHRpbmdzKSA/IDAgOiBwYXNzU3RyaW5nVG9XYXNtMChzZXR0aW5ncywgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpO1xuICAgIHZhciBsZW4xID0gV0FTTV9WRUNUT1JfTEVOO1xuICAgIGNvbnN0IHJldCA9IHdhc20uZ2V0TWFuaWZlc3RTdG9yZUZyb21NYW5pZmVzdEFuZEFzc2V0KG1hbmlmZXN0X2J1ZmZlciwgYXNzZXRfYnVmZmVyLCBwdHIwLCBsZW4wLCBwdHIxLCBsZW4xKTtcbiAgICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBfX3diZ19hZGFwdGVyXzQyKGFyZzAsIGFyZzEpIHtcbiAgICB3YXNtLl9keW5fY29yZV9fb3BzX19mdW5jdGlvbl9fRm5NdXRfX19fX091dHB1dF9fX1JfYXNfd2FzbV9iaW5kZ2VuX19jbG9zdXJlX19XYXNtQ2xvc3VyZV9fX2Rlc2NyaWJlX19pbnZva2VfX2hkZjFhYTJhZThjMmRiNTUwKGFyZzAsIGFyZzEpO1xufVxuXG5mdW5jdGlvbiBfX3diZ19hZGFwdGVyXzQ1KGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICB3YXNtLmNsb3N1cmU0OTNfZXh0ZXJucmVmX3NoaW0oYXJnMCwgYXJnMSwgYXJnMik7XG59XG5cbmZ1bmN0aW9uIF9fd2JnX2FkYXB0ZXJfOTkoYXJnMCwgYXJnMSwgYXJnMiwgYXJnMykge1xuICAgIHdhc20uY2xvc3VyZTMwM19leHRlcm5yZWZfc2hpbShhcmcwLCBhcmcxLCBhcmcyLCBhcmczKTtcbn1cblxuY29uc3QgX193YmluZGdlbl9lbnVtX1JlcXVlc3RDcmVkZW50aWFscyA9IFtcIm9taXRcIiwgXCJzYW1lLW9yaWdpblwiLCBcImluY2x1ZGVcIl07XG5cbmNvbnN0IF9fd2JpbmRnZW5fZW51bV9SZXF1ZXN0TW9kZSA9IFtcInNhbWUtb3JpZ2luXCIsIFwibm8tY29yc1wiLCBcImNvcnNcIiwgXCJuYXZpZ2F0ZVwiXTtcblxuYXN5bmMgZnVuY3Rpb24gX193YmdfbG9hZChtb2R1bGUsIGltcG9ydHMpIHtcbiAgICBpZiAodHlwZW9mIFJlc3BvbnNlID09PSAnZnVuY3Rpb24nICYmIG1vZHVsZSBpbnN0YW5jZW9mIFJlc3BvbnNlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKG1vZHVsZSwgaW1wb3J0cyk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobW9kdWxlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSAhPSAnYXBwbGljYXRpb24vd2FzbScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiYFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nYCBmYWlsZWQgYmVjYXVzZSB5b3VyIHNlcnZlciBkb2VzIG5vdCBzZXJ2ZSBXYXNtIHdpdGggYGFwcGxpY2F0aW9uL3dhc21gIE1JTUUgdHlwZS4gRmFsbGluZyBiYWNrIHRvIGBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZWAgd2hpY2ggaXMgc2xvd2VyLiBPcmlnaW5hbCBlcnJvcjpcXG5cIiwgZSk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgbW9kdWxlLmFycmF5QnVmZmVyKCk7XG4gICAgICAgIHJldHVybiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShieXRlcywgaW1wb3J0cyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKG1vZHVsZSwgaW1wb3J0cyk7XG5cbiAgICAgICAgaWYgKGluc3RhbmNlIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGluc3RhbmNlLCBtb2R1bGUgfTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBfX3diZ19nZXRfaW1wb3J0cygpIHtcbiAgICBjb25zdCBpbXBvcnRzID0ge307XG4gICAgaW1wb3J0cy53YmcgPSB7fTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19TdHJpbmdfOGYwZWIzOWE0YTRjMmY2NiA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gU3RyaW5nKGFyZzEpO1xuICAgICAgICBjb25zdCBwdHIxID0gcGFzc1N0cmluZ1RvV2FzbTAocmV0LCB3YXNtLl9fd2JpbmRnZW5fbWFsbG9jLCB3YXNtLl9fd2JpbmRnZW5fcmVhbGxvYyk7XG4gICAgICAgIGNvbnN0IGxlbjEgPSBXQVNNX1ZFQ1RPUl9MRU47XG4gICAgICAgIGdldERhdGFWaWV3TWVtb3J5MCgpLnNldEludDMyKGFyZzAgKyA0ICogMSwgbGVuMSwgdHJ1ZSk7XG4gICAgICAgIGdldERhdGFWaWV3TWVtb3J5MCgpLnNldEludDMyKGFyZzAgKyA0ICogMCwgcHRyMSwgdHJ1ZSk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19hYm9ydF80MTBlYzQ3YTY0YWM2MTE3ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBhcmcwLmFib3J0KGFyZzEpO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfYWJvcnRfNzc1ZWYxZDE3ZmM2NTg2OCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgYXJnMC5hYm9ydCgpO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfYXBwZW5kXzhjN2RkOGQ2NDFhNWYwMWIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGhhbmRsZUVycm9yKGZ1bmN0aW9uIChhcmcwLCBhcmcxLCBhcmcyLCBhcmczLCBhcmc0KSB7XG4gICAgICAgIGFyZzAuYXBwZW5kKGdldFN0cmluZ0Zyb21XYXNtMChhcmcxLCBhcmcyKSwgZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzMsIGFyZzQpKTtcbiAgICB9LCBhcmd1bWVudHMpIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfYXJyYXlCdWZmZXJfZDFiNDRjNDM5MGRiNDIyZiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaGFuZGxlRXJyb3IoZnVuY3Rpb24gKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMC5hcnJheUJ1ZmZlcigpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sIGFyZ3VtZW50cykgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19idWZmZXJfNjA5Y2MzZWVlNTFlZDE1OCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMC5idWZmZXI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19jYWxsXzY3MmE0ZDIxNjM0ZDRhMjQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGhhbmRsZUVycm9yKGZ1bmN0aW9uIChhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzAuY2FsbChhcmcxKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LCBhcmd1bWVudHMpIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfY2FsbF83Y2NjZGQ2OWUwNzkxYWUyID0gZnVuY3Rpb24oKSB7IHJldHVybiBoYW5kbGVFcnJvcihmdW5jdGlvbiAoYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLmNhbGwoYXJnMSwgYXJnMik7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSwgYXJndW1lbnRzKSB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2NsZWFyVGltZW91dF84NjcyMWRiMDAzNmJlYTk4ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBjbGVhclRpbWVvdXQoYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19kZWJ1Z19lMTdiNTE1ODNjYTZhNjMyID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMiwgYXJnMykge1xuICAgICAgICBjb25zb2xlLmRlYnVnKGFyZzAsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfZG9uZV83NjllNWVkZTRiMzFjNjdiID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLmRvbmU7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19lcnJvcl83NTM0YjhlOWEzNmYxYWI0ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBsZXQgZGVmZXJyZWQwXzA7XG4gICAgICAgIGxldCBkZWZlcnJlZDBfMTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRlZmVycmVkMF8wID0gYXJnMDtcbiAgICAgICAgICAgIGRlZmVycmVkMF8xID0gYXJnMTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHdhc20uX193YmluZGdlbl9mcmVlKGRlZmVycmVkMF8wLCBkZWZlcnJlZDBfMSwgMSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2Vycm9yXzgwZGUzOGIzZjdjYzNjM2MgPSBmdW5jdGlvbihhcmcwLCBhcmcxLCBhcmcyLCBhcmczKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYXJnMCwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19mZXRjaF81MDkwOTY1MzMwNzFjNjU3ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLmZldGNoKGFyZzEpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfZmV0Y2hfZDM2YTczODMyZjBhNDVlOCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gZmV0Y2goYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19mcm9tXzJhNWQzZTIxOGU2N2FhODUgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IEFycmF5LmZyb20oYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19nZXRfNjdiMmJhNjJmYzMwZGUxMiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaGFuZGxlRXJyb3IoZnVuY3Rpb24gKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gUmVmbGVjdC5nZXQoYXJnMCwgYXJnMSk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSwgYXJndW1lbnRzKSB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2dldF9iOWI5MzA0N2ZlM2NmNDViID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwW2FyZzEgPj4+IDBdO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfaGFzX2E1ZWE5MTE3ZjI1OGEwZWMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGhhbmRsZUVycm9yKGZ1bmN0aW9uIChhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IFJlZmxlY3QuaGFzKGFyZzAsIGFyZzEpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sIGFyZ3VtZW50cykgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19oZWFkZXJzXzljYjUxY2ZkMmFjNzgwYTQgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzAuaGVhZGVycztcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2luZm9fMDMzZDhiOGEwODM4ZjFkMyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIsIGFyZzMpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKGFyZzAsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfaW5zdGFuY2VvZl9BcnJheUJ1ZmZlcl9lMTQ1ODU0MzJlMzczN2ZjID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gYXJnMCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXQgPSByZXN1bHQ7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19pbnN0YW5jZW9mX1Jlc3BvbnNlX2YyY2MyMGQ5ZjdkZmQ2NDQgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXN1bHQgPSBhcmcwIGluc3RhbmNlb2YgUmVzcG9uc2U7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJldCA9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2luc3RhbmNlb2ZfVWludDhBcnJheV8xNzE1NmJjZjExODA4NmE5ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gYXJnMCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJldCA9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2lzQXJyYXlfYTFlYWI3ZTBkMDY3MzkxYiA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gQXJyYXkuaXNBcnJheShhcmcwKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2lzU2FmZUludGVnZXJfMzQzZTJiZWVlZWNlMWJiMCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gTnVtYmVyLmlzU2FmZUludGVnZXIoYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19pdGVyYXRvcl85YTI0Yzg4ZGY4NjBkYzY1ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IFN5bWJvbC5pdGVyYXRvcjtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2xlbmd0aF9hNDQ2MTkzZGMyMmMxMmY4ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2xlbmd0aF9lMmQyYTQ5MTMyYzFiMjU2ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX2xvZ19jYWQ1OWJiNjgwZGFlYzY3ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMiwgYXJnMykge1xuICAgICAgICBjb25zb2xlLmxvZyhhcmcwLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25ld18wMThkY2MyZDZjOGMyZjZhID0gZnVuY3Rpb24oKSB7IHJldHVybiBoYW5kbGVFcnJvcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IG5ldyBIZWFkZXJzKCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSwgYXJndW1lbnRzKSB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25ld18yM2EyNjY1ZmFjODNjNjExID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFyIHN0YXRlMCA9IHthOiBhcmcwLCBiOiBhcmcxfTtcbiAgICAgICAgICAgIHZhciBjYjAgPSAoYXJnMCwgYXJnMSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSBzdGF0ZTAuYTtcbiAgICAgICAgICAgICAgICBzdGF0ZTAuYSA9IDA7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fd2JnX2FkYXB0ZXJfOTkoYSwgc3RhdGUwLmIsIGFyZzAsIGFyZzEpO1xuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlMC5hID0gYTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gbmV3IFByb21pc2UoY2IwKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBzdGF0ZTAuYSA9IHN0YXRlMC5iID0gMDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbmV3XzQwNWUyMmYzOTA1NzZjZTIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IE9iamVjdCgpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbmV3XzVlMGJlNzM1MjFiYzhjMTcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IE1hcCgpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbmV3Xzc4ZmViMTA4YjY0NzI3MTMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IEFycmF5KCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19uZXdfOGE2ZjIzOGE2ZWNlODZlYSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCByZXQgPSBuZXcgRXJyb3IoKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25ld19hMTIwMDJhN2Y5MWM3NWJlID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBuZXcgVWludDhBcnJheShhcmcwKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25ld19jNjhkNzIwOWJlNzQ3Mzc5ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBuZXcgRXJyb3IoZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25ld19lMjVlNWFhYjA5ZmY0NWRiID0gZnVuY3Rpb24oKSB7IHJldHVybiBoYW5kbGVFcnJvcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LCBhcmd1bWVudHMpIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbmV3bm9hcmdzXzEwNWVkNDcxNDc1YWFmNTAgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IG5ldyBGdW5jdGlvbihnZXRTdHJpbmdGcm9tV2FzbTAoYXJnMCwgYXJnMSkpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfbmV3d2l0aGJ5dGVvZmZzZXRhbmRsZW5ndGhfZDk3ZTYzN2ViZTE0NWE5YSA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IFVpbnQ4QXJyYXkoYXJnMCwgYXJnMSA+Pj4gMCwgYXJnMiA+Pj4gMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19uZXd3aXRoc3RyYW5kaW5pdF8wNmM1MzVlMGE4NjdjNjM1ID0gZnVuY3Rpb24oKSB7IHJldHVybiBoYW5kbGVFcnJvcihmdW5jdGlvbiAoYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBjb25zdCByZXQgPSBuZXcgUmVxdWVzdChnZXRTdHJpbmdGcm9tV2FzbTAoYXJnMCwgYXJnMSksIGFyZzIpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sIGFyZ3VtZW50cykgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19uZXh0XzI1ZmVhZGZjMDkxM2ZlYTkgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzAubmV4dDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25leHRfNjU3NGUxYThhNjJkMTA1NSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaGFuZGxlRXJyb3IoZnVuY3Rpb24gKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMC5uZXh0KCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSwgYXJndW1lbnRzKSB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX25vd184MDdlNTRjMzk2MzZjMzQ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IERhdGUubm93KCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19xdWV1ZU1pY3JvdGFza185N2Q5MmI0ZmNjOGE2MWM1ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBxdWV1ZU1pY3JvdGFzayhhcmcwKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3F1ZXVlTWljcm90YXNrX2QzMjE5ZGVmODI1NTI0ODUgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzAucXVldWVNaWNyb3Rhc2s7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19yZXNvbHZlXzQ4NTE3ODVjOWM1ZjU3M2QgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IFByb21pc2UucmVzb2x2ZShhcmcwKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldFRpbWVvdXRfMmU3MDc3MTVmOGNjOTQ5NyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gc2V0VGltZW91dChhcmcwLCBhcmcxKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldF8zNzgzNzAyM2YzZDc0MGU4ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBhcmcwW2FyZzEgPj4+IDBdID0gYXJnMjtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldF8zZjFkMGI5ODRlZDI3MmVkID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBhcmcwW2FyZzFdID0gYXJnMjtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldF82NTU5NWJkZDg2OGIzMDA5ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBhcmcwLnNldChhcmcxLCBhcmcyID4+PiAwKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldF84ZmM2YmY4YTViMTA3MWQxID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLnNldChhcmcxLCBhcmcyKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldF9iYjhjZWNmNmE2MmI5ZjQ2ID0gZnVuY3Rpb24oKSB7IHJldHVybiBoYW5kbGVFcnJvcihmdW5jdGlvbiAoYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBjb25zdCByZXQgPSBSZWZsZWN0LnNldChhcmcwLCBhcmcxLCBhcmcyKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LCBhcmd1bWVudHMpIH07XG4gICAgaW1wb3J0cy53YmcuX193Ymdfc2V0Ym9keV81OTIzYjc4YTk1ZWVkZjI5ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBhcmcwLmJvZHkgPSBhcmcxO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193Ymdfc2V0Y3JlZGVudGlhbHNfYzNhMjJmMWNkMTA1YTJjNiA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgYXJnMC5jcmVkZW50aWFscyA9IF9fd2JpbmRnZW5fZW51bV9SZXF1ZXN0Q3JlZGVudGlhbHNbYXJnMV07XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zZXRoZWFkZXJzXzgzNGMwYmRiNmE4OTQ5YWQgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGFyZzAuaGVhZGVycyA9IGFyZzE7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zZXRtZXRob2RfM2M1MjgwZmU1ZDg5MDg0MiA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgYXJnMC5tZXRob2QgPSBnZXRTdHJpbmdGcm9tV2FzbTAoYXJnMSwgYXJnMik7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zZXRtb2RlXzVkYzMwMGI4NjUwNDRiNjUgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGFyZzAubW9kZSA9IF9fd2JpbmRnZW5fZW51bV9SZXF1ZXN0TW9kZVthcmcxXTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NldG5hbWVfNmRmNTRiN2ViZjk0MDRhOSA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgYXJnMC5uYW1lID0gZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzEsIGFyZzIpO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193Ymdfc2V0c2lnbmFsXzc1YjIxZWYzYTgxZGU5MDUgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGFyZzAuc2lnbmFsID0gYXJnMTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3NpZ25hbF9hYWY5YWQ3NDExOWYyMGE0ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLnNpZ25hbDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3N0YWNrXzBlZDc1ZDY4NTc1YjBmM2MgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzEuc3RhY2s7XG4gICAgICAgIGNvbnN0IHB0cjEgPSBwYXNzU3RyaW5nVG9XYXNtMChyZXQsIHdhc20uX193YmluZGdlbl9tYWxsb2MsIHdhc20uX193YmluZGdlbl9yZWFsbG9jKTtcbiAgICAgICAgY29uc3QgbGVuMSA9IFdBU01fVkVDVE9SX0xFTjtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAxLCBsZW4xLCB0cnVlKTtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAwLCBwdHIxLCB0cnVlKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3N0YXRpY19hY2Nlc3Nvcl9HTE9CQUxfODhhOTAyZDEzYTU1N2QwNyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCByZXQgPSB0eXBlb2YgZ2xvYmFsID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBnbG9iYWw7XG4gICAgICAgIHJldHVybiBpc0xpa2VOb25lKHJldCkgPyAwIDogYWRkVG9FeHRlcm5yZWZUYWJsZTAocmV0KTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3N0YXRpY19hY2Nlc3Nvcl9HTE9CQUxfVEhJU181NjU3OGJlN2U5ZjgzMmIwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBnbG9iYWxUaGlzO1xuICAgICAgICByZXR1cm4gaXNMaWtlTm9uZShyZXQpID8gMCA6IGFkZFRvRXh0ZXJucmVmVGFibGUwKHJldCk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zdGF0aWNfYWNjZXNzb3JfU0VMRl8zN2M1ZDQxOGU0YmY1ODE5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZiBzZWxmID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBzZWxmO1xuICAgICAgICByZXR1cm4gaXNMaWtlTm9uZShyZXQpID8gMCA6IGFkZFRvRXh0ZXJucmVmVGFibGUwKHJldCk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zdGF0aWNfYWNjZXNzb3JfV0lORE9XXzVkZTM3MDQzYTkxYTljNDAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogd2luZG93O1xuICAgICAgICByZXR1cm4gaXNMaWtlTm9uZShyZXQpID8gMCA6IGFkZFRvRXh0ZXJucmVmVGFibGUwKHJldCk7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zdGF0dXNfZjYzNjAzMzZjYTY4NmJmMCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMC5zdGF0dXM7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ19zdHJpbmdpZnlfZjdlZDY5ODc5MzViNGEyNCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaGFuZGxlRXJyb3IoZnVuY3Rpb24gKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gSlNPTi5zdHJpbmdpZnkoYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSwgYXJndW1lbnRzKSB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3RoZW5fNDRiNzM5NDZkMmZiM2U3ZCA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMC50aGVuKGFyZzEpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmdfdGhlbl80OGI0MDY3NDk4NzhhNTMxID0gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwLnRoZW4oYXJnMSwgYXJnMik7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ191cmxfYWUxMGMzNGNhMjA5NjgxZCA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMS51cmw7XG4gICAgICAgIGNvbnN0IHB0cjEgPSBwYXNzU3RyaW5nVG9XYXNtMChyZXQsIHdhc20uX193YmluZGdlbl9tYWxsb2MsIHdhc20uX193YmluZGdlbl9yZWFsbG9jKTtcbiAgICAgICAgY29uc3QgbGVuMSA9IFdBU01fVkVDVE9SX0xFTjtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAxLCBsZW4xLCB0cnVlKTtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAwLCBwdHIxLCB0cnVlKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JnX3ZhbHVlX2NkMWZmYTdiMWFiNzk0ZjEgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGFyZzAudmFsdWU7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diZ193YXJuX2FhZjFmNDY2NGEwMzViZDYgPSBmdW5jdGlvbihhcmcwLCBhcmcxLCBhcmcyLCBhcmczKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihhcmcwLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5fYXNfbnVtYmVyID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSArYXJnMDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5fYmlnaW50X2Zyb21fdTY0ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBCaWdJbnQuYXNVaW50Tig2NCwgYXJnMCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2Jvb2xlYW5fZ2V0ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCB2ID0gYXJnMDtcbiAgICAgICAgY29uc3QgcmV0ID0gdHlwZW9mKHYpID09PSAnYm9vbGVhbicgPyAodiA/IDEgOiAwKSA6IDI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2NiX2Ryb3AgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IG9iaiA9IGFyZzAub3JpZ2luYWw7XG4gICAgICAgIGlmIChvYmouY250LS0gPT0gMSkge1xuICAgICAgICAgICAgb2JqLmEgPSAwO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmV0ID0gZmFsc2U7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2Nsb3N1cmVfd3JhcHBlcjc0MzkgPSBmdW5jdGlvbihhcmcwLCBhcmcxLCBhcmcyKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IG1ha2VNdXRDbG9zdXJlKGFyZzAsIGFyZzEsIDQ1OSwgX193YmdfYWRhcHRlcl80Mik7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2Nsb3N1cmVfd3JhcHBlcjc4NjAgPSBmdW5jdGlvbihhcmcwLCBhcmcxLCBhcmcyKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IG1ha2VNdXRDbG9zdXJlKGFyZzAsIGFyZzEsIDQ1OSwgX193YmdfYWRhcHRlcl80NSk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2RlYnVnX3N0cmluZyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gZGVidWdTdHJpbmcoYXJnMSk7XG4gICAgICAgIGNvbnN0IHB0cjEgPSBwYXNzU3RyaW5nVG9XYXNtMChyZXQsIHdhc20uX193YmluZGdlbl9tYWxsb2MsIHdhc20uX193YmluZGdlbl9yZWFsbG9jKTtcbiAgICAgICAgY29uc3QgbGVuMSA9IFdBU01fVkVDVE9SX0xFTjtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAxLCBsZW4xLCB0cnVlKTtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAwLCBwdHIxLCB0cnVlKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5fZXJyb3JfbmV3ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCByZXQgPSBuZXcgRXJyb3IoZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5faW5pdF9leHRlcm5yZWZfdGFibGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgdGFibGUgPSB3YXNtLl9fd2JpbmRnZW5fZXhwb3J0XzQ7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHRhYmxlLmdyb3coNCk7XG4gICAgICAgIHRhYmxlLnNldCgwLCB1bmRlZmluZWQpO1xuICAgICAgICB0YWJsZS5zZXQob2Zmc2V0ICsgMCwgdW5kZWZpbmVkKTtcbiAgICAgICAgdGFibGUuc2V0KG9mZnNldCArIDEsIG51bGwpO1xuICAgICAgICB0YWJsZS5zZXQob2Zmc2V0ICsgMiwgdHJ1ZSk7XG4gICAgICAgIHRhYmxlLnNldChvZmZzZXQgKyAzLCBmYWxzZSk7XG4gICAgICAgIDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5faXNfZnVuY3Rpb24gPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZihhcmcwKSA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5faXNfb2JqZWN0ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCB2YWwgPSBhcmcwO1xuICAgICAgICBjb25zdCByZXQgPSB0eXBlb2YodmFsKSA9PT0gJ29iamVjdCcgJiYgdmFsICE9PSBudWxsO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9pc19zdHJpbmcgPSBmdW5jdGlvbihhcmcwKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZihhcmcwKSA9PT0gJ3N0cmluZyc7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX2lzX3VuZGVmaW5lZCA9IGZ1bmN0aW9uKGFyZzApIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMCA9PT0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9qc3ZhbF9sb29zZV9lcSA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYXJnMCA9PSBhcmcxO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9tZW1vcnkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gd2FzbS5tZW1vcnk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX251bWJlcl9nZXQgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7XG4gICAgICAgIGNvbnN0IG9iaiA9IGFyZzE7XG4gICAgICAgIGNvbnN0IHJldCA9IHR5cGVvZihvYmopID09PSAnbnVtYmVyJyA/IG9iaiA6IHVuZGVmaW5lZDtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0RmxvYXQ2NChhcmcwICsgOCAqIDEsIGlzTGlrZU5vbmUocmV0KSA/IDAgOiByZXQsIHRydWUpO1xuICAgICAgICBnZXREYXRhVmlld01lbW9yeTAoKS5zZXRJbnQzMihhcmcwICsgNCAqIDAsICFpc0xpa2VOb25lKHJldCksIHRydWUpO1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9udW1iZXJfbmV3ID0gZnVuY3Rpb24oYXJnMCkge1xuICAgICAgICBjb25zdCByZXQgPSBhcmcwO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9zdHJpbmdfZ2V0ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkge1xuICAgICAgICBjb25zdCBvYmogPSBhcmcxO1xuICAgICAgICBjb25zdCByZXQgPSB0eXBlb2Yob2JqKSA9PT0gJ3N0cmluZycgPyBvYmogOiB1bmRlZmluZWQ7XG4gICAgICAgIHZhciBwdHIxID0gaXNMaWtlTm9uZShyZXQpID8gMCA6IHBhc3NTdHJpbmdUb1dhc20wKHJldCwgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpO1xuICAgICAgICB2YXIgbGVuMSA9IFdBU01fVkVDVE9SX0xFTjtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAxLCBsZW4xLCB0cnVlKTtcbiAgICAgICAgZ2V0RGF0YVZpZXdNZW1vcnkwKCkuc2V0SW50MzIoYXJnMCArIDQgKiAwLCBwdHIxLCB0cnVlKTtcbiAgICB9O1xuICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5fc3RyaW5nX25ldyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgaW1wb3J0cy53YmcuX193YmluZGdlbl90aHJvdyA9IGZ1bmN0aW9uKGFyZzAsIGFyZzEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGdldFN0cmluZ0Zyb21XYXNtMChhcmcwLCBhcmcxKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBpbXBvcnRzO1xufVxuXG5mdW5jdGlvbiBfX3diZ19pbml0X21lbW9yeShpbXBvcnRzLCBtZW1vcnkpIHtcblxufVxuXG5mdW5jdGlvbiBfX3diZ19maW5hbGl6ZV9pbml0KGluc3RhbmNlLCBtb2R1bGUpIHtcbiAgICB3YXNtID0gaW5zdGFuY2UuZXhwb3J0cztcbiAgICBfX3diZ19pbml0Ll9fd2JpbmRnZW5fd2FzbV9tb2R1bGUgPSBtb2R1bGU7XG4gICAgY2FjaGVkRGF0YVZpZXdNZW1vcnkwID0gbnVsbDtcbiAgICBjYWNoZWRVaW50OEFycmF5TWVtb3J5MCA9IG51bGw7XG5cblxuICAgIHdhc20uX193YmluZGdlbl9zdGFydCgpO1xuICAgIHJldHVybiB3YXNtO1xufVxuXG5mdW5jdGlvbiBpbml0U3luYyhtb2R1bGUpIHtcbiAgICBpZiAod2FzbSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gd2FzbTtcblxuXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YobW9kdWxlKSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgICAgICAgICAgKHttb2R1bGV9ID0gbW9kdWxlKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCd1c2luZyBkZXByZWNhdGVkIHBhcmFtZXRlcnMgZm9yIGBpbml0U3luYygpYDsgcGFzcyBhIHNpbmdsZSBvYmplY3QgaW5zdGVhZCcpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRzID0gX193YmdfZ2V0X2ltcG9ydHMoKTtcblxuICAgIF9fd2JnX2luaXRfbWVtb3J5KGltcG9ydHMpO1xuXG4gICAgaWYgKCEobW9kdWxlIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuTW9kdWxlKSkge1xuICAgICAgICBtb2R1bGUgPSBuZXcgV2ViQXNzZW1ibHkuTW9kdWxlKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgV2ViQXNzZW1ibHkuSW5zdGFuY2UobW9kdWxlLCBpbXBvcnRzKTtcblxuICAgIHJldHVybiBfX3diZ19maW5hbGl6ZV9pbml0KGluc3RhbmNlLCBtb2R1bGUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfX3diZ19pbml0KG1vZHVsZV9vcl9wYXRoKSB7XG4gICAgaWYgKHdhc20gIT09IHVuZGVmaW5lZCkgcmV0dXJuIHdhc207XG5cblxuICAgIGlmICh0eXBlb2YgbW9kdWxlX29yX3BhdGggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YobW9kdWxlX29yX3BhdGgpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgICAgICAgICAoe21vZHVsZV9vcl9wYXRofSA9IG1vZHVsZV9vcl9wYXRoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCd1c2luZyBkZXByZWNhdGVkIHBhcmFtZXRlcnMgZm9yIHRoZSBpbml0aWFsaXphdGlvbiBmdW5jdGlvbjsgcGFzcyBhIHNpbmdsZSBvYmplY3QgaW5zdGVhZCcpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZV9vcl9wYXRoID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBtb2R1bGVfb3JfcGF0aCA9IG5ldyBVUkwoJ3Rvb2xraXRfYmcud2FzbScsIGltcG9ydC5tZXRhLnVybCk7XG4gICAgfVxuICAgIGNvbnN0IGltcG9ydHMgPSBfX3diZ19nZXRfaW1wb3J0cygpO1xuXG4gICAgaWYgKHR5cGVvZiBtb2R1bGVfb3JfcGF0aCA9PT0gJ3N0cmluZycgfHwgKHR5cGVvZiBSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG1vZHVsZV9vcl9wYXRoIGluc3RhbmNlb2YgUmVxdWVzdCkgfHwgKHR5cGVvZiBVUkwgPT09ICdmdW5jdGlvbicgJiYgbW9kdWxlX29yX3BhdGggaW5zdGFuY2VvZiBVUkwpKSB7XG4gICAgICAgIG1vZHVsZV9vcl9wYXRoID0gZmV0Y2gobW9kdWxlX29yX3BhdGgpO1xuICAgIH1cblxuICAgIF9fd2JnX2luaXRfbWVtb3J5KGltcG9ydHMpO1xuXG4gICAgY29uc3QgeyBpbnN0YW5jZSwgbW9kdWxlIH0gPSBhd2FpdCBfX3diZ19sb2FkKGF3YWl0IG1vZHVsZV9vcl9wYXRoLCBpbXBvcnRzKTtcblxuICAgIHJldHVybiBfX3diZ19maW5hbGl6ZV9pbml0KGluc3RhbmNlLCBtb2R1bGUpO1xufVxuXG5leHBvcnQgeyBpbml0U3luYyB9O1xuZXhwb3J0IGRlZmF1bHQgX193YmdfaW5pdDtcbiIsIi8qKlxuICogQ29weXJpZ2h0IDIwMjEgQWRvYmVcbiAqIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogTk9USUNFOiBBZG9iZSBwZXJtaXRzIHlvdSB0byB1c2UsIG1vZGlmeSwgYW5kIGRpc3RyaWJ1dGUgdGhpcyBmaWxlIGluXG4gKiBhY2NvcmRhbmNlIHdpdGggdGhlIHRlcm1zIG9mIHRoZSBBZG9iZSBsaWNlbnNlIGFncmVlbWVudCBhY2NvbXBhbnlpbmdcbiAqIGl0LlxuICovXG5cbmltcG9ydCB7IHNldHVwV29ya2VyIH0gZnJvbSAnLi9zcmMvbGliL3Bvb2wvd29ya2VyJztcblxuaW1wb3J0IHtcbiAgZGVmYXVsdCBhcyBpbml0RGV0ZWN0b3IsXG4gIHNjYW5fYXJyYXlfYnVmZmVyLFxufSBmcm9tICdAY29udGVudGF1dGgvZGV0ZWN0b3InO1xuaW1wb3J0IHtcbiAgQXNzZXRSZXBvcnQsXG4gIGdldE1hbmlmZXN0U3RvcmVGcm9tQXJyYXlCdWZmZXIsXG4gIGdldE1hbmlmZXN0U3RvcmVGcm9tTWFuaWZlc3RBbmRBc3NldCxcbiAgZGVmYXVsdCBhcyBpbml0VG9vbGtpdCxcbn0gZnJvbSAnQGNvbnRlbnRhdXRoL3Rvb2xraXQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIElTY2FuUmVzdWx0IHtcbiAgZm91bmQ6IGJvb2xlYW47XG4gIG9mZnNldD86IG51bWJlcjtcbn1cblxuY29uc3Qgd29ya2VyID0ge1xuICBhc3luYyBjb21waWxlV2FzbShidWZmZXI6IEFycmF5QnVmZmVyKTogUHJvbWlzZTxXZWJBc3NlbWJseS5Nb2R1bGU+IHtcbiAgICByZXR1cm4gV2ViQXNzZW1ibHkuY29tcGlsZShidWZmZXIpO1xuICB9LFxuICBhc3luYyBnZXRSZXBvcnQoXG4gICAgd2FzbTogV2ViQXNzZW1ibHkuTW9kdWxlLFxuICAgIGJ1ZmZlcjogQXJyYXlCdWZmZXIsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHNldHRpbmdzPzogc3RyaW5nLFxuICApOiBQcm9taXNlPEFzc2V0UmVwb3J0PiB7XG4gICAgYXdhaXQgaW5pdFRvb2xraXQod2FzbSk7XG4gICAgcmV0dXJuIGdldE1hbmlmZXN0U3RvcmVGcm9tQXJyYXlCdWZmZXIoYnVmZmVyLCB0eXBlLCBzZXR0aW5ncyk7XG4gIH0sXG4gIGFzeW5jIGdldFJlcG9ydEZyb21Bc3NldEFuZE1hbmlmZXN0QnVmZmVyKFxuICAgIHdhc206IFdlYkFzc2VtYmx5Lk1vZHVsZSxcbiAgICBtYW5pZmVzdEJ1ZmZlcjogQXJyYXlCdWZmZXIsXG4gICAgYXNzZXQ6IEJsb2IsXG4gICAgc2V0dGluZ3M/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8QXNzZXRSZXBvcnQ+IHtcbiAgICBhd2FpdCBpbml0VG9vbGtpdCh3YXNtKTtcbiAgICBjb25zdCBhc3NldEJ1ZmZlciA9IGF3YWl0IGFzc2V0LmFycmF5QnVmZmVyKCk7XG4gICAgcmV0dXJuIGdldE1hbmlmZXN0U3RvcmVGcm9tTWFuaWZlc3RBbmRBc3NldChcbiAgICAgIG1hbmlmZXN0QnVmZmVyLFxuICAgICAgYXNzZXRCdWZmZXIsXG4gICAgICBhc3NldC50eXBlLFxuICAgICAgc2V0dGluZ3MsXG4gICAgKTtcbiAgfSxcbiAgYXN5bmMgc2NhbklucHV0KFxuICAgIHdhc206IFdlYkFzc2VtYmx5Lk1vZHVsZSxcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyLFxuICApOiBQcm9taXNlPElTY2FuUmVzdWx0PiB7XG4gICAgYXdhaXQgaW5pdERldGVjdG9yKHdhc20pO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBvZmZzZXQgPSBhd2FpdCBzY2FuX2FycmF5X2J1ZmZlcihidWZmZXIpO1xuICAgICAgcmV0dXJuIHsgZm91bmQ6IHRydWUsIG9mZnNldCB9O1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcmV0dXJuIHsgZm91bmQ6IGZhbHNlIH07XG4gICAgfVxuICB9LFxufTtcblxuZXhwb3J0IHR5cGUgV29ya2VyID0gdHlwZW9mIHdvcmtlcjtcblxuc2V0dXBXb3JrZXIod29ya2VyKTtcbiJdLCJuYW1lcyI6WyJ3YXNtIiwiY2FjaGVkVGV4dERlY29kZXIiLCJnZXRTdHJpbmdGcm9tV2FzbTAiLCJXQVNNX1ZFQ1RPUl9MRU4iLCJjYWNoZWRUZXh0RW5jb2RlciIsImVuY29kZVN0cmluZyIsInBhc3NTdHJpbmdUb1dhc20wIiwiaXNMaWtlTm9uZSIsImRlYnVnU3RyaW5nIiwiaW5pdFRvb2xraXQiLCJpbml0RGV0ZWN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7O0lBT0c7SUFNSDtJQUNNLFNBQVUsY0FBYyxDQUFDLEtBQTBCLEVBQUE7SUFDdkQsSUFBQSxPQUFPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxPQUFPLEVBQUUsSUFBSSxFQUFBO0lBQ3JFLFFBQUEsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUU7SUFDMUMsWUFBQSxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNsQixZQUFBLFVBQVUsRUFBRSxJQUFJO0lBQ2pCLFNBQUEsQ0FBQyxDQUFDO1NBQ0osRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNUOztJQ3JCQTs7Ozs7OztJQU9HO0lBdUJHLFNBQVUsV0FBVyxDQUFDLE9BQXNCLEVBQUE7SUFDaEQsSUFBQSxTQUFTLEdBQUcsT0FBTyxDQUE4QixLQUFJO1lBQ25ELE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNoQyxJQUFJO2dCQUNGLE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFFM0MsWUFBQSxXQUFXLENBQUM7SUFDVixnQkFBQSxJQUFJLEVBQUUsU0FBUztJQUNmLGdCQUFBLElBQUksRUFBRSxHQUFHO0lBQ1EsYUFBQSxDQUFDLENBQUM7SUFDdEIsU0FBQTtJQUFDLFFBQUEsT0FBTyxLQUFjLEVBQUU7SUFDdkIsWUFBQSxXQUFXLENBQUM7SUFDVixnQkFBQSxJQUFJLEVBQUUsT0FBTztJQUNiLGdCQUFBLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBYyxDQUFDO0lBQ3BCLGFBQUEsQ0FBQyxDQUFDO0lBQ3RCLFNBQUE7SUFDSCxLQUFDLENBQUM7SUFDSjs7SUM5Q0EsSUFBSUEsTUFBSSxDQUFDO0FBQ1Q7SUFDQSxNQUFNQyxtQkFBaUIsR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGO0FBQ0FBLHVCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzNCO0lBQ0EsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzFDO0lBQ0EsU0FBUyxlQUFlLEdBQUc7SUFDM0IsSUFBSSxJQUFJLGtCQUFrQixDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUU7SUFDN0MsUUFBUSxrQkFBa0IsR0FBRyxJQUFJLFVBQVUsQ0FBQ0QsTUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoRSxLQUFLO0lBQ0wsSUFBSSxPQUFPLGtCQUFrQixDQUFDO0lBQzlCLENBQUM7QUFDRDtJQUNBLFNBQVNFLG9CQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUU7SUFDdEMsSUFBSSxPQUFPRCxtQkFBaUIsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoRixDQUFDO0FBQ0Q7SUFDQSxJQUFJRSxpQkFBZSxHQUFHLENBQUMsQ0FBQztBQUN4QjtJQUNBLE1BQU1DLG1CQUFpQixHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25EO0lBQ0EsTUFBTUMsY0FBWSxJQUFJLE9BQU9ELG1CQUFpQixDQUFDLFVBQVUsS0FBSyxVQUFVO0lBQ3hFLE1BQU0sVUFBVSxHQUFHLEVBQUUsSUFBSSxFQUFFO0lBQzNCLElBQUksT0FBT0EsbUJBQWlCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsTUFBTSxVQUFVLEdBQUcsRUFBRSxJQUFJLEVBQUU7SUFDM0IsSUFBSSxNQUFNLEdBQUcsR0FBR0EsbUJBQWlCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQixJQUFJLE9BQU87SUFDWCxRQUFRLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTTtJQUN4QixRQUFRLE9BQU8sRUFBRSxHQUFHLENBQUMsTUFBTTtJQUMzQixLQUFLLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNIO0lBQ0EsU0FBU0UsbUJBQWlCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDakQ7SUFDQSxJQUFJLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTtJQUMvQixRQUFRLE1BQU0sR0FBRyxHQUFHRixtQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEQsUUFBUSxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLFFBQVEsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuRSxRQUFRRCxpQkFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDckMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLO0FBQ0w7SUFDQSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDekIsSUFBSSxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDMUI7SUFDQSxJQUFJLE1BQU0sR0FBRyxHQUFHLGVBQWUsRUFBRSxDQUFDO0FBQ2xDO0lBQ0EsSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDbkI7SUFDQSxJQUFJLE9BQU8sTUFBTSxHQUFHLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUNuQyxRQUFRLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUMsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLEVBQUUsTUFBTTtJQUMvQixRQUFRLEdBQUcsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2pDLEtBQUs7QUFDTDtJQUNBLElBQUksSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO0lBQ3hCLFFBQVEsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFO0lBQzFCLFlBQVksR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEMsU0FBUztJQUNULFFBQVEsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMvRCxRQUFRLE1BQU0sSUFBSSxHQUFHLGVBQWUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN6RSxRQUFRLE1BQU0sR0FBRyxHQUFHRSxjQUFZLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzVDO0lBQ0EsUUFBUSxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQztJQUM5QixLQUFLO0FBQ0w7SUFDQSxJQUFJRixpQkFBZSxHQUFHLE1BQU0sQ0FBQztJQUM3QixJQUFJLE9BQU8sR0FBRyxDQUFDO0lBQ2YsQ0FBQztBQUNEO0lBQ0EsU0FBU0ksWUFBVSxDQUFDLENBQUMsRUFBRTtJQUN2QixJQUFJLE9BQU8sQ0FBQyxLQUFLLFNBQVMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDO0lBQ3pDLENBQUM7QUFDRDtJQUNBLElBQUksa0JBQWtCLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUMxQztJQUNBLFNBQVMsZUFBZSxHQUFHO0lBQzNCLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxVQUFVLEtBQUssQ0FBQyxFQUFFO0lBQzdDLFFBQVEsa0JBQWtCLEdBQUcsSUFBSSxVQUFVLENBQUNQLE1BQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEUsS0FBSztJQUNMLElBQUksT0FBTyxrQkFBa0IsQ0FBQztJQUM5QixDQUFDO0FBQ0Q7SUFDQSxJQUFJLG9CQUFvQixHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7QUFDOUM7SUFDQSxTQUFTLGlCQUFpQixHQUFHO0lBQzdCLElBQUksSUFBSSxvQkFBb0IsQ0FBQyxVQUFVLEtBQUssQ0FBQyxFQUFFO0lBQy9DLFFBQVEsb0JBQW9CLEdBQUcsSUFBSSxZQUFZLENBQUNBLE1BQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEUsS0FBSztJQUNMLElBQUksT0FBTyxvQkFBb0IsQ0FBQztJQUNoQyxDQUFDO0FBQ0Q7SUFDQSxTQUFTUSxhQUFXLENBQUMsR0FBRyxFQUFFO0lBQzFCO0lBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxPQUFPLEdBQUcsQ0FBQztJQUM1QixJQUFJLElBQUksSUFBSSxJQUFJLFFBQVEsSUFBSSxJQUFJLElBQUksU0FBUyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7SUFDOUQsUUFBUSxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLEtBQUs7SUFDTCxJQUFJLElBQUksSUFBSSxJQUFJLFFBQVEsRUFBRTtJQUMxQixRQUFRLE9BQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLEtBQUs7SUFDTCxJQUFJLElBQUksSUFBSSxJQUFJLFFBQVEsRUFBRTtJQUMxQixRQUFRLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUM7SUFDNUMsUUFBUSxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7SUFDakMsWUFBWSxPQUFPLFFBQVEsQ0FBQztJQUM1QixTQUFTLE1BQU07SUFDZixZQUFZLE9BQU8sQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVDLFNBQVM7SUFDVCxLQUFLO0lBQ0wsSUFBSSxJQUFJLElBQUksSUFBSSxVQUFVLEVBQUU7SUFDNUIsUUFBUSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO0lBQzlCLFFBQVEsSUFBSSxPQUFPLElBQUksSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7SUFDeEQsWUFBWSxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxTQUFTLE1BQU07SUFDZixZQUFZLE9BQU8sVUFBVSxDQUFDO0lBQzlCLFNBQVM7SUFDVCxLQUFLO0lBQ0w7SUFDQSxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUM1QixRQUFRLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDbEMsUUFBUSxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUM7SUFDeEIsUUFBUSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUU7SUFDeEIsWUFBWSxLQUFLLElBQUlBLGFBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6QyxTQUFTO0lBQ1QsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ3hDLFlBQVksS0FBSyxJQUFJLElBQUksR0FBR0EsYUFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFNBQVM7SUFDVCxRQUFRLEtBQUssSUFBSSxHQUFHLENBQUM7SUFDckIsUUFBUSxPQUFPLEtBQUssQ0FBQztJQUNyQixLQUFLO0lBQ0w7SUFDQSxJQUFJLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUUsSUFBSSxJQUFJLFNBQVMsQ0FBQztJQUNsQixJQUFJLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7SUFDbkMsUUFBUSxTQUFTLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLEtBQUssTUFBTTtJQUNYO0lBQ0EsUUFBUSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsS0FBSztJQUNMLElBQUksSUFBSSxTQUFTLElBQUksUUFBUSxFQUFFO0lBQy9CO0lBQ0E7SUFDQTtJQUNBLFFBQVEsSUFBSTtJQUNaLFlBQVksT0FBTyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDekQsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0lBQ3BCLFlBQVksT0FBTyxRQUFRLENBQUM7SUFDNUIsU0FBUztJQUNULEtBQUs7SUFDTDtJQUNBLElBQUksSUFBSSxHQUFHLFlBQVksS0FBSyxFQUFFO0lBQzlCLFFBQVEsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDM0QsS0FBSztJQUNMO0lBQ0EsSUFBSSxPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0FBTUQ7SUFDQSxTQUFTLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtJQUN0QyxJQUFJLE1BQU0sS0FBSyxHQUFHUixNQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BELElBQUlBLE1BQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxJQUFJLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFDRDtJQUNBO0lBQ0E7SUFDQTtJQUNPLFNBQVMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO0lBQ3ZDLElBQUksSUFBSTtJQUNSLFFBQVEsTUFBTSxNQUFNLEdBQUdBLE1BQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLFFBQVFBLE1BQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDNUMsUUFBUSxJQUFJLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25ELFFBQVEsSUFBSSxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNuRCxRQUFRLElBQUksRUFBRSxHQUFHLGVBQWUsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbkQsUUFBUSxJQUFJLEVBQUUsRUFBRTtJQUNoQixZQUFZLE1BQU0sdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUMsU0FBUztJQUNULFFBQVEsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLEtBQUssU0FBUztJQUNkLFFBQVFBLE1BQUksQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqRCxLQUFLO0lBQ0wsQ0FBQztBQUNEO0lBQ0EsZUFBZSxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRTtJQUNyQyxJQUFJLElBQUksT0FBTyxRQUFRLEtBQUssVUFBVSxJQUFJLE1BQU0sWUFBWSxRQUFRLEVBQUU7SUFDdEUsUUFBUSxJQUFJLE9BQU8sV0FBVyxDQUFDLG9CQUFvQixLQUFLLFVBQVUsRUFBRTtJQUNwRSxZQUFZLElBQUk7SUFDaEIsZ0JBQWdCLE9BQU8sTUFBTSxXQUFXLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQy9FO0lBQ0EsYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFO0lBQ3hCLGdCQUFnQixJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLGtCQUFrQixFQUFFO0lBQzlFLG9CQUFvQixPQUFPLENBQUMsSUFBSSxDQUFDLG1NQUFtTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pPO0lBQ0EsaUJBQWlCLE1BQU07SUFDdkIsb0JBQW9CLE1BQU0sQ0FBQyxDQUFDO0lBQzVCLGlCQUFpQjtJQUNqQixhQUFhO0lBQ2IsU0FBUztBQUNUO0lBQ0EsUUFBUSxNQUFNLEtBQUssR0FBRyxNQUFNLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNqRCxRQUFRLE9BQU8sTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3RDtJQUNBLEtBQUssTUFBTTtJQUNYLFFBQVEsTUFBTSxRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN4RTtJQUNBLFFBQVEsSUFBSSxRQUFRLFlBQVksV0FBVyxDQUFDLFFBQVEsRUFBRTtJQUN0RCxZQUFZLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7QUFDeEM7SUFDQSxTQUFTLE1BQU07SUFDZixZQUFZLE9BQU8sUUFBUSxDQUFDO0lBQzVCLFNBQVM7SUFDVCxLQUFLO0lBQ0wsQ0FBQztBQUNEO0lBQ0EsU0FBUyxVQUFVLEdBQUc7SUFDdEIsSUFBSSxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDdkIsSUFBSSxPQUFPLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNyQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDaEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQy9ELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNoQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDbEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3RFLFFBQVEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDN0QsUUFBUSxNQUFNLEdBQUcsR0FBR0Usb0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFdBQVc7SUFDeEQsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ2hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNwRSxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDL0IsUUFBUSxNQUFNLElBQUksR0FBR0ksbUJBQWlCLENBQUMsR0FBRyxFQUFFTixNQUFJLENBQUMsaUJBQWlCLEVBQUVBLE1BQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzdGLFFBQVEsTUFBTSxJQUFJLEdBQUdHLGlCQUFlLENBQUM7SUFDckMsUUFBUSxlQUFlLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUMvQyxRQUFRLGVBQWUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9DLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDcEUsUUFBUSxJQUFJO0lBQ1osWUFBWSxPQUFPLENBQUMsS0FBSyxDQUFDRCxvQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxTQUFTLFNBQVM7SUFDbEIsWUFBWUYsTUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsU0FBUztJQUNULEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUMvRCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDaEMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsV0FBVztJQUMvQyxRQUFRLE1BQU0sR0FBRyxHQUFHQSxNQUFJLENBQUMsTUFBTSxDQUFDO0lBQ2hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQy9ELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNoQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUM1RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDeEUsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbkMsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUM1RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDRSxvQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDakUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDO0lBQ2pDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3hELFFBQVEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlELFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUM3RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQztJQUN6QixRQUFRLE1BQU0sR0FBRyxHQUFHLE9BQU8sR0FBRyxDQUFDLEtBQUssUUFBUSxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUM7SUFDL0QsUUFBUSxJQUFJLElBQUksR0FBR0ssWUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBR0QsbUJBQWlCLENBQUMsR0FBRyxFQUFFTixNQUFJLENBQUMsaUJBQWlCLEVBQUVBLE1BQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2pILFFBQVEsSUFBSSxJQUFJLEdBQUdHLGlCQUFlLENBQUM7SUFDbkMsUUFBUSxlQUFlLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUMvQyxRQUFRLGVBQWUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9DLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDN0QsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDekIsUUFBUSxNQUFNLEdBQUcsR0FBRyxPQUFPLEdBQUcsQ0FBQyxLQUFLLFFBQVEsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0lBQy9ELFFBQVEsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHSSxZQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUN0RSxRQUFRLGVBQWUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQ0EsWUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNELEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsR0FBRyxTQUFTLElBQUksRUFBRTtJQUM5RSxRQUFRLElBQUksTUFBTSxDQUFDO0lBQ25CLFFBQVEsSUFBSTtJQUNaLFlBQVksTUFBTSxHQUFHLElBQUksWUFBWSxVQUFVLENBQUM7SUFDaEQsU0FBUyxDQUFDLE1BQU07SUFDaEIsWUFBWSxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQzNCLFNBQVM7SUFDVCxRQUFRLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUMzQixRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsR0FBRyxTQUFTLElBQUksRUFBRTtJQUMvRSxRQUFRLElBQUksTUFBTSxDQUFDO0lBQ25CLFFBQVEsSUFBSTtJQUNaLFlBQVksTUFBTSxHQUFHLElBQUksWUFBWSxXQUFXLENBQUM7SUFDakQsU0FBUyxDQUFDLE1BQU07SUFDaEIsWUFBWSxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQzNCLFNBQVM7SUFDVCxRQUFRLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUMzQixRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDL0QsUUFBUSxNQUFNLEdBQUcsR0FBR0MsYUFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLFFBQVEsTUFBTSxJQUFJLEdBQUdGLG1CQUFpQixDQUFDLEdBQUcsRUFBRU4sTUFBSSxDQUFDLGlCQUFpQixFQUFFQSxNQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3RixRQUFRLE1BQU0sSUFBSSxHQUFHRyxpQkFBZSxDQUFDO0lBQ3JDLFFBQVEsZUFBZSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDL0MsUUFBUSxlQUFlLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUMvQyxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hELFFBQVEsTUFBTSxJQUFJLEtBQUssQ0FBQ0Qsb0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixHQUFHLFdBQVc7SUFDN0QsUUFBUSxNQUFNLEtBQUssR0FBR0YsTUFBSSxDQUFDLG1CQUFtQixDQUFDO0lBQy9DLFFBQVEsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyQyxRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2hDLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3pDLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BDLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BDLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRXJDLEtBQUssQ0FBQztBQUNOO0lBQ0EsSUFBSSxPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0FBS0Q7SUFDQSxTQUFTLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFO0lBQ3hDLElBQUlBLE1BQUksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQzVCLElBQUksSUFBSSxDQUFDLHNCQUFzQixHQUFHLE1BQU0sQ0FBQztJQUN6QyxJQUFJLG9CQUFvQixHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7SUFDOUMsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0lBQzFDLElBQUksa0JBQWtCLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUMxQztJQUNBLElBQUlBLE1BQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzVCLElBQUksT0FBT0EsTUFBSSxDQUFDO0lBQ2hCLENBQUM7QUFlRDtJQUNBLGVBQWUsSUFBSSxDQUFDLEtBQUssRUFBRTtJQUMzQixJQUFJLElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFO0lBQ3RDLFFBQVEsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLGtCQUFrQixFQUFFLDhSQUFlLENBQUMsQ0FBQztJQUM3RCxLQUFLO0lBQ0wsSUFBSSxNQUFNLE9BQU8sR0FBRyxVQUFVLEVBQUUsQ0FBQztBQUNqQztJQUNBLElBQUksSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEtBQUssT0FBTyxPQUFPLEtBQUssVUFBVSxJQUFJLEtBQUssWUFBWSxPQUFPLENBQUMsS0FBSyxPQUFPLEdBQUcsS0FBSyxVQUFVLElBQUksS0FBSyxZQUFZLEdBQUcsQ0FBQyxFQUFFO0lBQ3pKLFFBQVEsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixLQUFLO0FBR0w7SUFDQSxJQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDbEU7SUFDQSxJQUFJLE9BQU8sWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxQzs7SUM5WUEsSUFBSSxJQUFJLENBQUM7QUFDVDtJQUNBLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztBQUN4QjtJQUNBLElBQUksdUJBQXVCLEdBQUcsSUFBSSxDQUFDO0FBQ25DO0lBQ0EsU0FBUyxvQkFBb0IsR0FBRztJQUNoQyxJQUFJLElBQUksdUJBQXVCLEtBQUssSUFBSSxJQUFJLHVCQUF1QixDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUU7SUFDdEYsUUFBUSx1QkFBdUIsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JFLEtBQUs7SUFDTCxJQUFJLE9BQU8sdUJBQXVCLENBQUM7SUFDbkMsQ0FBQztBQUNEO0lBQ0EsTUFBTSxpQkFBaUIsSUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sS0FBSyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDNUo7SUFDQSxNQUFNLFlBQVksSUFBSSxPQUFPLGlCQUFpQixDQUFDLFVBQVUsS0FBSyxVQUFVO0lBQ3hFLE1BQU0sVUFBVSxHQUFHLEVBQUUsSUFBSSxFQUFFO0lBQzNCLElBQUksT0FBTyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxNQUFNLFVBQVUsR0FBRyxFQUFFLElBQUksRUFBRTtJQUMzQixJQUFJLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxPQUFPO0lBQ1gsUUFBUSxJQUFJLEVBQUUsR0FBRyxDQUFDLE1BQU07SUFDeEIsUUFBUSxPQUFPLEVBQUUsR0FBRyxDQUFDLE1BQU07SUFDM0IsS0FBSyxDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDSDtJQUNBLFNBQVMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDakQ7SUFDQSxJQUFJLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTtJQUMvQixRQUFRLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsRCxRQUFRLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxRQUFRLG9CQUFvQixFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4RSxRQUFRLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3JDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSztBQUNMO0lBQ0EsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3pCLElBQUksSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkM7SUFDQSxJQUFJLE1BQU0sR0FBRyxHQUFHLG9CQUFvQixFQUFFLENBQUM7QUFDdkM7SUFDQSxJQUFJLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztBQUNuQjtJQUNBLElBQUksT0FBTyxNQUFNLEdBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO0lBQ25DLFFBQVEsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QyxRQUFRLElBQUksSUFBSSxHQUFHLElBQUksRUFBRSxNQUFNO0lBQy9CLFFBQVEsR0FBRyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDakMsS0FBSztBQUNMO0lBQ0EsSUFBSSxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUU7SUFDeEIsUUFBUSxJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7SUFDMUIsWUFBWSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxTQUFTO0lBQ1QsUUFBUSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEUsUUFBUSxNQUFNLElBQUksR0FBRyxvQkFBb0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUM5RSxRQUFRLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDNUM7SUFDQSxRQUFRLE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQzlCLFFBQVEsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakQsS0FBSztBQUNMO0lBQ0EsSUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFDO0lBQzdCLElBQUksT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0FBQ0Q7SUFDQSxJQUFJLHFCQUFxQixHQUFHLElBQUksQ0FBQztBQUNqQztJQUNBLFNBQVMsa0JBQWtCLEdBQUc7SUFDOUIsSUFBSSxJQUFJLHFCQUFxQixLQUFLLElBQUksSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtJQUMxTSxRQUFRLHFCQUFxQixHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakUsS0FBSztJQUNMLElBQUksT0FBTyxxQkFBcUIsQ0FBQztJQUNqQyxDQUFDO0FBQ0Q7SUFDQSxNQUFNLGlCQUFpQixJQUFJLE9BQU8sV0FBVyxLQUFLLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO0FBQzlMO0lBQ0EsSUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUNyRTtJQUNBLFNBQVMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUN0QyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQ3BCLElBQUksT0FBTyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7QUFDRDtJQUNBLFNBQVMsb0JBQW9CLENBQUMsR0FBRyxFQUFFO0lBQ25DLElBQUksTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDL0MsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzQyxJQUFJLE9BQU8sR0FBRyxDQUFDO0lBQ2YsQ0FBQztBQUNEO0lBQ0EsU0FBUyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRTtJQUM5QixJQUFJLElBQUk7SUFDUixRQUFRLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0lBQ2hCLFFBQVEsTUFBTSxHQUFHLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsUUFBUSxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkMsS0FBSztJQUNMLENBQUM7QUFDRDtJQUNBLFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtJQUN2QixJQUFJLE9BQU8sQ0FBQyxLQUFLLFNBQVMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDO0lBQ3pDLENBQUM7QUFDRDtJQUNBLE1BQU0sYUFBYSxHQUFHLENBQUMsT0FBTyxvQkFBb0IsS0FBSyxXQUFXO0lBQ2xFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxFQUFFO0lBQ2xELE1BQU0sSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLElBQUk7SUFDeEMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7QUFDSDtJQUNBLFNBQVMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRTtJQUM3QyxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDckQsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxLQUFLO0lBQzlCO0lBQ0E7SUFDQTtJQUNBLFFBQVEsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3BCLFFBQVEsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxQixRQUFRLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSTtJQUNaLFlBQVksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMxQyxTQUFTLFNBQVM7SUFDbEIsWUFBWSxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUU7SUFDbkMsZ0JBQWdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckUsZ0JBQWdCLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEQsYUFBYSxNQUFNO0lBQ25CLGdCQUFnQixLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixhQUFhO0lBQ2IsU0FBUztJQUNULEtBQUssQ0FBQztJQUNOLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDMUIsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0MsSUFBSSxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0FBQ0Q7SUFDQSxTQUFTLFdBQVcsQ0FBQyxHQUFHLEVBQUU7SUFDMUI7SUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLE9BQU8sR0FBRyxDQUFDO0lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksUUFBUSxJQUFJLElBQUksSUFBSSxTQUFTLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtJQUM5RCxRQUFRLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDekIsS0FBSztJQUNMLElBQUksSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO0lBQzFCLFFBQVEsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUIsS0FBSztJQUNMLElBQUksSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO0lBQzFCLFFBQVEsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQztJQUM1QyxRQUFRLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtJQUNqQyxZQUFZLE9BQU8sUUFBUSxDQUFDO0lBQzVCLFNBQVMsTUFBTTtJQUNmLFlBQVksT0FBTyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsU0FBUztJQUNULEtBQUs7SUFDTCxJQUFJLElBQUksSUFBSSxJQUFJLFVBQVUsRUFBRTtJQUM1QixRQUFRLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDOUIsUUFBUSxJQUFJLE9BQU8sSUFBSSxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtJQUN4RCxZQUFZLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLFNBQVMsTUFBTTtJQUNmLFlBQVksT0FBTyxVQUFVLENBQUM7SUFDOUIsU0FBUztJQUNULEtBQUs7SUFDTDtJQUNBLElBQUksSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQzVCLFFBQVEsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUNsQyxRQUFRLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUN4QixRQUFRLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRTtJQUN4QixZQUFZLEtBQUssSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsU0FBUztJQUNULFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUN4QyxZQUFZLEtBQUssSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFNBQVM7SUFDVCxRQUFRLEtBQUssSUFBSSxHQUFHLENBQUM7SUFDckIsUUFBUSxPQUFPLEtBQUssQ0FBQztJQUNyQixLQUFLO0lBQ0w7SUFDQSxJQUFJLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUUsSUFBSSxJQUFJLFNBQVMsQ0FBQztJQUNsQixJQUFJLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0lBQ3JELFFBQVEsU0FBUyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QyxLQUFLLE1BQU07SUFDWDtJQUNBLFFBQVEsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLEtBQUs7SUFDTCxJQUFJLElBQUksU0FBUyxJQUFJLFFBQVEsRUFBRTtJQUMvQjtJQUNBO0lBQ0E7SUFDQSxRQUFRLElBQUk7SUFDWixZQUFZLE9BQU8sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3pELFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUNwQixZQUFZLE9BQU8sUUFBUSxDQUFDO0lBQzVCLFNBQVM7SUFDVCxLQUFLO0lBQ0w7SUFDQSxJQUFJLElBQUksR0FBRyxZQUFZLEtBQUssRUFBRTtJQUM5QixRQUFRLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNELEtBQUs7SUFDTDtJQUNBLElBQUksT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztBQUtEO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ08sU0FBUywrQkFBK0IsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRTtJQUMxRSxJQUFJLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0YsSUFBSSxNQUFNLElBQUksR0FBRyxlQUFlLENBQUM7SUFDakMsSUFBSSxJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDdkgsSUFBSSxJQUFJLElBQUksR0FBRyxlQUFlLENBQUM7SUFDL0IsSUFBSSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xGLElBQUksT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0FBQ0Q7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNPLFNBQVMsb0NBQW9DLENBQUMsZUFBZSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFO0lBQ3pHLElBQUksTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMvRixJQUFJLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUNqQyxJQUFJLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUN2SCxJQUFJLElBQUksSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUMvQixJQUFJLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxlQUFlLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pILElBQUksT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0FBQ0Q7SUFDQSxTQUFTLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDdEMsSUFBSSxJQUFJLENBQUMsMEhBQTBILENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hKLENBQUM7QUFDRDtJQUNBLFNBQVMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDNUMsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyRCxDQUFDO0FBQ0Q7SUFDQSxTQUFTLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNsRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzRCxDQUFDO0FBQ0Q7SUFDQSxNQUFNLGtDQUFrQyxHQUFHLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM5RTtJQUNBLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNuRjtJQUNBLGVBQWUsVUFBVSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUU7SUFDM0MsSUFBSSxJQUFJLE9BQU8sUUFBUSxLQUFLLFVBQVUsSUFBSSxNQUFNLFlBQVksUUFBUSxFQUFFO0lBQ3RFLFFBQVEsSUFBSSxPQUFPLFdBQVcsQ0FBQyxvQkFBb0IsS0FBSyxVQUFVLEVBQUU7SUFDcEUsWUFBWSxJQUFJO0lBQ2hCLGdCQUFnQixPQUFPLE1BQU0sV0FBVyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMvRTtJQUNBLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUN4QixnQkFBZ0IsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxrQkFBa0IsRUFBRTtJQUM5RSxvQkFBb0IsT0FBTyxDQUFDLElBQUksQ0FBQyxtTUFBbU0sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN6TztJQUNBLGlCQUFpQixNQUFNO0lBQ3ZCLG9CQUFvQixNQUFNLENBQUMsQ0FBQztJQUM1QixpQkFBaUI7SUFDakIsYUFBYTtJQUNiLFNBQVM7QUFDVDtJQUNBLFFBQVEsTUFBTSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDakQsUUFBUSxPQUFPLE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0Q7SUFDQSxLQUFLLE1BQU07SUFDWCxRQUFRLE1BQU0sUUFBUSxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDeEU7SUFDQSxRQUFRLElBQUksUUFBUSxZQUFZLFdBQVcsQ0FBQyxRQUFRLEVBQUU7SUFDdEQsWUFBWSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDO0FBQ3hDO0lBQ0EsU0FBUyxNQUFNO0lBQ2YsWUFBWSxPQUFPLFFBQVEsQ0FBQztJQUM1QixTQUFTO0lBQ1QsS0FBSztJQUNMLENBQUM7QUFDRDtJQUNBLFNBQVMsaUJBQWlCLEdBQUc7SUFDN0IsSUFBSSxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDdkIsSUFBSSxPQUFPLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNyQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3JFLFFBQVEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLFFBQVEsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3RixRQUFRLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUNyQyxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3BFLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDOUQsUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLFdBQVcsRUFBRSxPQUFPLFdBQVcsQ0FBQyxVQUFVLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDeEgsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEdBQUcsV0FBVyxFQUFFLE9BQU8sV0FBVyxDQUFDLFVBQVUsSUFBSSxFQUFFO0lBQ3JHLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3ZDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7SUFDcEIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQy9ELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNoQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsR0FBRyxXQUFXLEVBQUUsT0FBTyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3BHLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO0lBQ3BCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsR0FBRyxXQUFXLEVBQUUsT0FBTyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUMxRyxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7SUFDcEIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3JFLFFBQVEsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ2hGLFFBQVEsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5QyxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDN0QsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQzlCLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNwRSxRQUFRLElBQUksV0FBVyxDQUFDO0lBQ3hCLFFBQVEsSUFBSSxXQUFXLENBQUM7SUFDeEIsUUFBUSxJQUFJO0lBQ1osWUFBWSxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQy9CLFlBQVksV0FBVyxHQUFHLElBQUksQ0FBQztJQUMvQixZQUFZLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUQsU0FBUyxTQUFTO0lBQ2xCLFlBQVksSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlELFNBQVM7SUFDVCxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDaEYsUUFBUSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlDLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDcEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQzlELFFBQVEsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQzdELFFBQVEsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxXQUFXLEVBQUUsT0FBTyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ25HLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ2xFLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNyQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxXQUFXLEVBQUUsT0FBTyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ25HLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDaEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ2pDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQy9FLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QyxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDL0UsUUFBUSxJQUFJLE1BQU0sQ0FBQztJQUNuQixRQUFRLElBQUk7SUFDWixZQUFZLE1BQU0sR0FBRyxJQUFJLFlBQVksV0FBVyxDQUFDO0lBQ2pELFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUNwQixZQUFZLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDM0IsU0FBUztJQUNULFFBQVEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDO0lBQzNCLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUEwQyxHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQzVFLFFBQVEsSUFBSSxNQUFNLENBQUM7SUFDbkIsUUFBUSxJQUFJO0lBQ1osWUFBWSxNQUFNLEdBQUcsSUFBSSxZQUFZLFFBQVEsQ0FBQztJQUM5QyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUU7SUFDcEIsWUFBWSxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQzNCLFNBQVM7SUFDVCxRQUFRLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUMzQixRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsR0FBRyxTQUFTLElBQUksRUFBRTtJQUM5RSxRQUFRLElBQUksTUFBTSxDQUFDO0lBQ25CLFFBQVEsSUFBSTtJQUNaLFlBQVksTUFBTSxHQUFHLElBQUksWUFBWSxVQUFVLENBQUM7SUFDaEQsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0lBQ3BCLFlBQVksTUFBTSxHQUFHLEtBQUssQ0FBQztJQUMzQixTQUFTO0lBQ1QsUUFBUSxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFDM0IsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDaEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3RFLFFBQVEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsR0FBRyxXQUFXO0lBQzdELFFBQVEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUNwQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUMvRCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDaEMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDL0QsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ2hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzlFLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsV0FBVyxFQUFFLE9BQU8sV0FBVyxDQUFDLFlBQVk7SUFDekYsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ2xDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7SUFDcEIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNsRSxRQUFRLElBQUk7SUFDWixZQUFZLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsWUFBWSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUs7SUFDdEMsZ0JBQWdCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbkMsZ0JBQWdCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzdCLGdCQUFnQixJQUFJO0lBQ3BCLG9CQUFvQixPQUFPLGdCQUFnQixDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyRSxpQkFBaUIsU0FBUztJQUMxQixvQkFBb0IsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakMsaUJBQWlCO0lBQ2pCLGFBQWEsQ0FBQztJQUNkLFlBQVksTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsWUFBWSxPQUFPLEdBQUcsQ0FBQztJQUN2QixTQUFTLFNBQVM7SUFDbEIsWUFBWSxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLFNBQVM7SUFDVCxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsV0FBVztJQUN4RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7SUFDakMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsV0FBVztJQUN4RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7SUFDOUIsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsV0FBVztJQUN4RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7SUFDaEMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsV0FBVztJQUN4RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7SUFDaEMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDNUQsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDbEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxXQUFXLEVBQUUsT0FBTyxXQUFXLENBQUMsWUFBWTtJQUN6RixRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hFLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakUsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsaURBQWlELEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUMvRixRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNqRSxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsR0FBRyxXQUFXLEVBQUUsT0FBTyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN2SCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0RSxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO0lBQ3BCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUM3RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDOUIsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEdBQUcsV0FBVyxFQUFFLE9BQU8sV0FBVyxDQUFDLFVBQVUsSUFBSSxFQUFFO0lBQzlGLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2hDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7SUFDcEIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFdBQVc7SUFDeEQsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDL0IsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDdkUsUUFBUSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3ZFLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUN4QyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUNoRSxRQUFRLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3pFLFFBQVEsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hFLFFBQVEsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDaEMsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDeEUsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzFCLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hFLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ25DLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hFLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsV0FBVyxFQUFFLE9BQU8sV0FBVyxDQUFDLFVBQVUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDekcsUUFBUSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEQsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3RFLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDekIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUM3RSxRQUFRLElBQUksQ0FBQyxXQUFXLEdBQUcsa0NBQWtDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEUsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN6RSxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQzVCLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzlFLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckQsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN0RSxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEQsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDNUUsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRCxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hFLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDM0IsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQy9ELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNoQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDcEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQy9CLFFBQVEsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3RixRQUFRLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUNyQyxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLEdBQUcsV0FBVztJQUMzRSxRQUFRLE1BQU0sR0FBRyxHQUFHLE9BQU8sTUFBTSxLQUFLLFdBQVcsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDO0lBQ2xFLFFBQVEsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9ELEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxrREFBa0QsR0FBRyxXQUFXO0lBQ2hGLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxVQUFVLEtBQUssV0FBVyxHQUFHLElBQUksR0FBRyxVQUFVLENBQUM7SUFDMUUsUUFBUSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0QsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxHQUFHLFdBQVc7SUFDekUsUUFBUSxNQUFNLEdBQUcsR0FBRyxPQUFPLElBQUksS0FBSyxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztJQUM5RCxRQUFRLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvRCxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLEdBQUcsV0FBVztJQUMzRSxRQUFRLE1BQU0sR0FBRyxHQUFHLE9BQU8sTUFBTSxLQUFLLFdBQVcsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDO0lBQ2xFLFFBQVEsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9ELEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUMvRCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDaEMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEdBQUcsV0FBVyxFQUFFLE9BQU8sV0FBVyxDQUFDLFVBQVUsSUFBSSxFQUFFO0lBQ25HLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO0lBQ3BCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDbkUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDekUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDbEUsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQzdCLFFBQVEsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3RixRQUFRLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUNyQyxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDOUQsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQy9CLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQy9FLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QyxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDdEQsUUFBUSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztJQUMxQixRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUM1RCxRQUFRLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3hELFFBQVEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlELFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQ3BELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUNsQyxRQUFRLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRTtJQUM1QixZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLFlBQVksT0FBTyxJQUFJLENBQUM7SUFDeEIsU0FBUztJQUNULFFBQVEsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDO0lBQzFCLFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDNUUsUUFBUSxNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUN0RSxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzVFLFFBQVEsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDdEUsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQy9ELFFBQVEsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLFFBQVEsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3RixRQUFRLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUNyQyxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzVELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUQsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLEdBQUcsV0FBVztJQUM3RCxRQUFRLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUMvQyxRQUFRLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNoQyxRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN6QyxRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNwQyxRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNwQyxRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVyQyxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDeEQsUUFBUSxNQUFNLEdBQUcsR0FBRyxPQUFPLElBQUksQ0FBQyxLQUFLLFVBQVUsQ0FBQztJQUNoRCxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLElBQUksRUFBRTtJQUN0RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQztJQUN6QixRQUFRLE1BQU0sR0FBRyxHQUFHLE9BQU8sR0FBRyxDQUFDLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUM7SUFDN0QsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDdEQsUUFBUSxNQUFNLEdBQUcsR0FBRyxPQUFPLElBQUksQ0FBQyxLQUFLLFFBQVEsQ0FBQztJQUM5QyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLElBQUksRUFBRTtJQUN6RCxRQUFRLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxTQUFTLENBQUM7SUFDdkMsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ2pFLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQztJQUNqQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxXQUFXO0lBQy9DLFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNoQyxRQUFRLE9BQU8sR0FBRyxDQUFDO0lBQ25CLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDN0QsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDekIsUUFBUSxNQUFNLEdBQUcsR0FBRyxPQUFPLEdBQUcsQ0FBQyxLQUFLLFFBQVEsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0lBQy9ELFFBQVEsa0JBQWtCLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkYsUUFBUSxrQkFBa0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RSxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDdkQsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDekIsUUFBUSxPQUFPLEdBQUcsQ0FBQztJQUNuQixLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzdELFFBQVEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLFFBQVEsTUFBTSxHQUFHLEdBQUcsT0FBTyxHQUFHLENBQUMsS0FBSyxRQUFRLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQztJQUMvRCxRQUFRLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNqSCxRQUFRLElBQUksSUFBSSxHQUFHLGVBQWUsQ0FBQztJQUNuQyxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxRQUFRLGtCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUM7SUFDTixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEdBQUcsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzdELFFBQVEsTUFBTSxHQUFHLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELFFBQVEsT0FBTyxHQUFHLENBQUM7SUFDbkIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN4RCxRQUFRLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsS0FBSyxDQUFDO0FBQ047SUFDQSxJQUFJLE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7QUFLRDtJQUNBLFNBQVMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRTtJQUMvQyxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQzVCLElBQUksVUFBVSxDQUFDLHNCQUFzQixHQUFHLE1BQU0sQ0FBQztJQUMvQyxJQUFJLHFCQUFxQixHQUFHLElBQUksQ0FBQztJQUNqQyxJQUFJLHVCQUF1QixHQUFHLElBQUksQ0FBQztBQUNuQztBQUNBO0lBQ0EsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUM1QixJQUFJLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7QUEwQkQ7SUFDQSxlQUFlLFVBQVUsQ0FBQyxjQUFjLEVBQUU7SUFDMUMsSUFBSSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsT0FBTyxJQUFJLENBQUM7QUFDeEM7QUFDQTtJQUNBLElBQUksSUFBSSxPQUFPLGNBQWMsS0FBSyxXQUFXLEVBQUU7SUFDL0MsUUFBUSxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRTtJQUN4RSxZQUFZLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxjQUFjLEVBQUM7SUFDL0MsU0FBUyxNQUFNO0lBQ2YsWUFBWSxPQUFPLENBQUMsSUFBSSxDQUFDLDJGQUEyRixFQUFDO0lBQ3JILFNBQVM7SUFDVCxLQUFLO0FBQ0w7SUFDQSxJQUFJLElBQUksT0FBTyxjQUFjLEtBQUssV0FBVyxFQUFFO0lBQy9DLFFBQVEsY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLGlCQUFpQixFQUFFLDhSQUFlLENBQUMsQ0FBQztJQUNyRSxLQUFLO0lBQ0wsSUFBSSxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsRUFBRSxDQUFDO0FBQ3hDO0lBQ0EsSUFBSSxJQUFJLE9BQU8sY0FBYyxLQUFLLFFBQVEsS0FBSyxPQUFPLE9BQU8sS0FBSyxVQUFVLElBQUksY0FBYyxZQUFZLE9BQU8sQ0FBQyxLQUFLLE9BQU8sR0FBRyxLQUFLLFVBQVUsSUFBSSxjQUFjLFlBQVksR0FBRyxDQUFDLEVBQUU7SUFDcEwsUUFBUSxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQy9DLEtBQUs7QUFHTDtJQUNBLElBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxNQUFNLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNqRjtJQUNBLElBQUksT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDakQ7O0lDN3dCQTs7Ozs7OztJQU9HO0lBb0JILE1BQU0sTUFBTSxHQUFHO1FBQ2IsTUFBTSxXQUFXLENBQUMsTUFBbUIsRUFBQTtJQUNuQyxRQUFBLE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNwQztRQUNELE1BQU0sU0FBUyxDQUNiLElBQXdCLEVBQ3hCLE1BQW1CLEVBQ25CLElBQVksRUFDWixRQUFpQixFQUFBO0lBRWpCLFFBQUEsTUFBTVMsVUFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sK0JBQStCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNoRTtRQUNELE1BQU0sbUNBQW1DLENBQ3ZDLElBQXdCLEVBQ3hCLGNBQTJCLEVBQzNCLEtBQVcsRUFDWCxRQUFpQixFQUFBO0lBRWpCLFFBQUEsTUFBTUEsVUFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hCLFFBQUEsTUFBTSxXQUFXLEdBQUcsTUFBTSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDOUMsUUFBQSxPQUFPLG9DQUFvQyxDQUN6QyxjQUFjLEVBQ2QsV0FBVyxFQUNYLEtBQUssQ0FBQyxJQUFJLEVBQ1YsUUFBUSxDQUNULENBQUM7U0FDSDtJQUNELElBQUEsTUFBTSxTQUFTLENBQ2IsSUFBd0IsRUFDeEIsTUFBbUIsRUFBQTtJQUVuQixRQUFBLE1BQU1DLElBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJO0lBQ0YsWUFBQSxNQUFNLE1BQU0sR0FBRyxNQUFNLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLFlBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDaEMsU0FBQTtJQUFDLFFBQUEsT0FBTyxHQUFHLEVBQUU7SUFDWixZQUFBLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDekIsU0FBQTtTQUNGO0tBQ0YsQ0FBQztJQUlGLFdBQVcsQ0FBQyxNQUFNLENBQUM7Ozs7OzsifQ==
