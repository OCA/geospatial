// Copyright 2020 Tecnativa - Alexandre Díaz
// License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).
odoo.define("website_snippet_product_category.snippet_options", function (require) {
    "use strict";

    const options = require("web_editor.snippets.options");

    options.registry.js_product_category = options.Class.extend({
        /**
         * @override
         */
        cleanForSave: function () {
            this._super.apply(this, arguments);
            this.$target.empty();
        },
    });
});
