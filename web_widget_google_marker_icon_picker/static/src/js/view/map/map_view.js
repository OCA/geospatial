odoo.define('web_widget_google_marker_icon_picker.MapView', function (require) {
    'use strict';

    var MapView = require('web_view_google_map.MapView');

    MapView.include({
        init: function (viewInfo, params) {
            this._super.apply(this, arguments);
            if (this.arch.attrs.library === 'geometry') {
                this.rendererParams.fieldMarkerColor = this.arch.attrs.color;
            }
        }
    });

});
