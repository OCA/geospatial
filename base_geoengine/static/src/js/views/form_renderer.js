/* eslint-disable no-unused-vars */
odoo.define("base_geoengine.form_renderer", function (require) {
    "use strict";

    var FormRenderer = require("web.FormRenderer");

    FormRenderer.include({
        // _updateView refreshes the view after a pager action.
        // Add the TabListener to geo_type widget so that _renderMap is called
        // when clicking on the new tab
        _updateView: function ($newContent) {
            this._super.apply(this, arguments);
            _.each(this.allFieldWidgets[this.state.id], function (widget) {
                if (widget.field.geo_type) {
                    widget._addTabListener();
                }
            });
        },
    });
});
