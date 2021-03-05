/* eslint-env browser */
window.App = (function () {

    const state = new Proxy({
        count: 0
    }, {
        set: function(obj, prop, value) {
            obj[prop] = value;
            return true;
        }
    });

    return {
        getState: function () {
            return btoa(JSON.stringify(state));
        },
        setState: function (s) {
            const newState = JSON.parse(atob(s));
            state.count = newState.count;
        },
        getCount: function () {
            return state.count;
        },
        incrementCount: function () {
            state.count += 1;
            history.replaceState(null, null, '#!/' + App.getState());
            return state.count;
        },
        decrementCount: function () {
            state.count -= 1;
            history.replaceState(null, null, '#!/' + App.getState());
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

    const counterDisplay = document.getElementById('counterDisplay');
    const counterButtonDecrement = document.getElementById('counterButtonDecrement');
    const counterButtonIncrement = document.getElementById('counterButtonIncrement');

    try {
        App.setState(location.hash.substring(3));
    } catch (error) {
        history.replaceState(null, null, '#!/' + App.getState());
    }

    counterDisplay.innerHTML = App.getCount();

    counterButtonIncrement.addEventListener('click', function(){
        counterDisplay.innerHTML = App.incrementCount();
    }, false);

    counterButtonDecrement.addEventListener('click', function(){
        counterDisplay.innerHTML = App.decrementCount();
    }, false);

})();
