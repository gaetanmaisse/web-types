import Vue from 'vue'
import pkg from "$$PACKAGE$$";

Vue.options.components = {};
Vue.options.filters = {};
Vue.options.directives = {};

global.window = {
    navigator: {
        userAgent: "fake"
    },
    addEventListener() {
    },
    removeEventListener() {
    }
};

window.Vue = Vue;
global.Vue = Vue;

if (Object.getOwnPropertyNames(Vue.options.components).length === 0) {
    Vue.use(pkg);
}

const typesMapping = {
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Function: "(...args: any[]) => any",
    Array: "any[]",
    Object: "any"
};

let result = {};
for (let type of ['components', 'directives', 'filters']) {
    let obj = Vue.options[type];
    result[type] = {};
    while (obj) {
        for (let key of Object.getOwnPropertyNames(obj)) {
            result[type][key] = copyOptions(obj[key]);
        }
        obj = Object.getPrototypeOf(obj);
    }
}

console.log(JSON.stringify(result, null, 2));

function copyOptions(obj, visited) {
    if ((visited || (visited = new Set())).has(obj)) return;
    visited.add(obj);
    try {
        if (obj === undefined || obj === null) {
            return undefined;
        }
        if (Array.isArray(obj)) {
            let result = [];
            for (let i in obj) {
                // noinspection JSUnfilteredForInLoop
                result[i] = copyOptions(obj[i])
            }
            return result;
        }
        if (typeof obj === "function") {
            if (obj.options) {
                return copyOptionsInner(obj.options, visited);
            }
        } else if (typeof obj === "object") {
            return copyOptionsInner(obj, visited);
        }
        return obj;
    } finally {
        visited.delete(obj)
    }
}

function copyOptionsInner(options) {
    let result = {};
    result["props"] = copyProps(options["props"]);
    result["name"] = options["name"];
    for (let key of Object.getOwnPropertyNames(options)) {
        if (key.startsWith("___$args")) {
            result[key] = copyArgs(options[key], true);
        }
    }
    for (let key of Object.getOwnPropertyNames(options)) {
        if (key.startsWith("___$id")) {
            result[key] = options[key];
        }
    }
    return result;
}

function copyArgs(args, firstCall) {
    if (args === null || args === undefined) {
        return;
    }
    if (firstCall) {
        let result = [];
        for (let i = 0; i < args.length; i++) {
            result.push(copyArgs(args[i]));
        }
        while (result.length > 0 && result[result.length - 1] == null) {
            result.pop();
        }
        return result;
    }
    if (Array.isArray(args)) {
        let result = [];
        for (let arg of args) {
            result.push(copyArgs(arg));
        }
        return result;
    } else if (typeof args === "string" || typeof args === "number") {
        return args;
    }
    return null;
}

function copyProps(obj) {
    if (!obj) {
        return;
    }
    let result = {};
    for (let name of Object.getOwnPropertyNames(obj)) {
        let prop = obj[name];
        let data = {};
        if (typeof prop === "object" || typeof prop === "function") {
            for (let key of Object.getOwnPropertyNames(prop)) {
                let value = prop[key];
                if (key === "default") {
                    if (typeof value === "function") {
                        try {
                            value = value();
                        } catch (e) {
                            value = undefined;
                        }
                    }
                    if (value === null || value === undefined) {
                        value = undefined;
                    } else {
                        value = JSON.stringify(value);
                    }
                }
                data[key] = convertValue(value)
            }
        } else {
            data["type"] = convertValue(prop);
        }
        result[name] = data;
    }
    return result;
}

function convertValue(value) {
    if (Array.isArray(value)) {
        let result = [];
        for (let i in value) {
            // noinspection JSUnfilteredForInLoop
            result[i] = convertValue(value[i])
        }
        return result;
    }
    if (typeof value === "function") {
        for (let type of [String, Number, Boolean, Function, Array, Object]) {
            if (value === type) {
                return typesMapping[type.name];
            }
        }
    }
    return value;
}
