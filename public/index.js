/* eslint-env browser */
window.MySite = (function () {

    const state = new Proxy({
        count: 0
    }, {
        set: function(obj, prop, value) {
            obj[prop] = value;
            return true;
        }
    });

    return {
        getStateBase64: function () {
            return btoa(JSON.stringify(state));
        },
        setStateBase64: function (s) {
            const newState = JSON.parse(atob(s));
            state.count = newState.count;
        },
        getCount: function () {
            return state.count;
        },
        incrementCount: function () {
            state.count += 1;
            window.history.replaceState(null, null, '#!/' + MySite.getStateBase64());
            return state.count;
        },
        decrementCount: function () {
            state.count -= 1;
            window.history.replaceState(null, null, '#!/' + MySite.getStateBase64());
            return state.count;
        }
    };
})();

/*
window.collections = window.collections || {};
window.collections.points = (function () {
    'use strict';

    var pointsCollection = [];

    return {
        all: pointsCollection,
        get: function (id) {
            return pointsCollection[id];
        },
        remove: function (id) {
            pointsCollection.splice(id, 1);
        },
        update: function (id, point) {
            pointsCollection[id] = point;
        },
        add: function (point) {
            pointsCollection.push(point);
        }
    };
})();
 */

(function () {
    if (location.hash.match(/^#!\//)) {
        MySite.setStateBase64(location.hash.substring(3));
        document.getElementById('counterDisplay').innerHTML = MySite.getCount();
    }
})();
