/* eslint-env browser */
window.collections = window.collections || {};

window.collections.counter = (function () {
    'use strict';

    var count = 0;

    return {
        get: function () {
            return count;
        },
        increment: function () {
            return (count += 1);
        },
        decrement: function () {
            return (count -= 1);
        }
    };
})();

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
