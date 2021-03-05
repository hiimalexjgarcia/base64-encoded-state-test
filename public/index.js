/* eslint-env browser */

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

const App = (function () {

    const state = new Proxy({
        count: 0,
        points: []
    }, {
        set: function(obj, prop, value) {
            obj[prop] = value;
            history.replaceState(null, null, '#!/' + App.state.getEncoded());
            return true;
        }
    });

    return {
        state: {
            getEncoded: function () {
                return btoa(JSON.stringify(state));
            },
            setEncoded: function (s) {
                const newState = JSON.parse(atob(s));
                state.count = newState.count;
                state.points = newState.points;
            }
        },
        counter: {
            increment: function () {
                return (state.count += 1);
            },
            decrement: function () {
                return (state.count -= 1);
            },
            get: function () {
                return state.count;
            }
        },
    };

})();

    try {
        App.state.setEncoded(location.hash.substring(3));
    } catch (error) {
        history.replaceState(null, null, '#!/' + App.state.getEncoded());
    }

    const counterDisplay = document.getElementById('counterDisplay');
    const counterButtonDecrement = document.getElementById('counterButtonDecrement');
    const counterButtonIncrement = document.getElementById('counterButtonIncrement');

    counterDisplay.innerHTML = App.counter.get();

    counterButtonIncrement.addEventListener('click', function(){
        counterDisplay.innerHTML = App.counter.increment();
    }, false);

    counterButtonDecrement.addEventListener('click', function(){
        counterDisplay.innerHTML = App.counter.decrement();
    }, false);

})();
