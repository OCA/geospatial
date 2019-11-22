odoo.define('web_widget_google_marker_icon_picker.MapRenderer', function (require) {
    'use strict';

    var MapRenderer = require('web_view_google_map.MapRenderer');

    MapRenderer.include({
        _initLibraryProperties: function (params) {
            this._super.apply(this, arguments);
            if (this.mapLibrary === 'geometry') {
                this.iconUrl = '/web_widget_google_marker_icon_picker/static/src/img/markers/';
            }
        },
    });
});
