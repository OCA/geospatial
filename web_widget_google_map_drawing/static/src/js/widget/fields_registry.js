odoo.define('web_google_maps_drawing.FieldsRegistry', function (require) {
    'use strict';

    var registry = require('web.field_registry');
    var FieldMapDrawingShape = require(
        'widget_google_maps_drawing.FieldMapDrawingShape'
    );

    registry.add('map_drawing_shape', FieldMapDrawingShape);

});
