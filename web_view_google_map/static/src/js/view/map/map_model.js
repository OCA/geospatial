odoo.define("web_view_google_map.GoogleMapModel", function (require) {
    "use strict";

    const BasicModel = require("web.BasicModel");

    const GoogleMapModel = BasicModel.extend({
        /**
         * @override
         */
        reload: function (id, options) {
            if (options && options.groupBy && !options.groupBy.length) {
                options.groupBy = this.defaultGroupedBy;
            }
            return this._super.apply(this, arguments);
        },
        /**
         * @override
         */
        load: function (params) {
            this.defaultGroupedBy = params.groupBy;
            params.groupedBy =
                params.groupedBy && params.groupedBy.length
                    ? params.groupedBy
                    : this.defaultGroupedBy;
            return this._super(params);
        },
        /**
         * Disable group by
         *
         * @override
         */
        _readGroup: function () {
            return Promise.reject();
        },
    });

    return GoogleMapModel;
});
